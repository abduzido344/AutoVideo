import base64
import json
import httpx
import pytest
from autovideo import config, eleven, images

PNG = b"\x89PNG\r\n\x1a\nfake"


@pytest.fixture(autouse=True)
def env(monkeypatch, tmp_path):
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "home"))
    monkeypatch.setenv("OPENROUTER_API_KEY", "k")


def client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def reply(images_=True, cost=0.04):
    msg = {"content": "sem imagem"}
    if images_:
        msg["images"] = [{"image_url": {"url": "data:image/png;base64," + base64.b64encode(PNG).decode()}}]
    return httpx.Response(200, json={"choices": [{"message": msg}], "usage": {"cost": cost}})


def test_sends_refs_as_data_uri(tmp_path):
    refs = []
    for n in "ab":
        p = tmp_path / f"{n}.png"
        p.write_bytes(PNG)
        refs.append(p)
    seen = {}

    def h(req):
        seen["body"], seen["auth"] = json.loads(req.content), req.headers["authorization"]
        return reply()

    images.generate("gato", refs, tmp_path / "o.png", client=client(h))
    content = seen["body"]["messages"][0]["content"]
    assert len(content) == 3 and seen["auth"] == "Bearer k"
    assert all(c["image_url"]["url"].startswith("data:image/png;base64,") for c in content[1:])
    assert seen["body"]["image_config"] == {"aspect_ratio": "9:16"}


def test_writes_png_and_cost(tmp_path):
    out = tmp_path / "o.png"
    r = images.generate("gato", [], out, client=client(lambda q: reply(cost=0.04)))
    assert out.read_bytes() == PNG and not out.with_name("o.png.part").exists()
    assert r == {"provider": "openrouter", "model": "google/gemini-2.5-flash-image", "cost_usd": 0.04}


def test_image_only_model_retries_with_image_modality(tmp_path):
    sent = []

    def h(req):
        sent.append(json.loads(req.content)["modalities"])
        if sent[-1] == ["image", "text"]:
            return httpx.Response(404, json={"error": {"message": "No endpoints found that support the requested output modalities: image, text"}})
        return reply()

    images.generate("gato", [], tmp_path / "o.png", client=client(h))
    assert sent == [["image", "text"], ["image"]] and (tmp_path / "o.png").read_bytes() == PNG


def test_no_credits_message(tmp_path):
    with pytest.raises(images.ImageError, match="sem saldo no OpenRouter"):
        images.generate("gato", [], tmp_path / "o.png", client=client(lambda q: httpx.Response(402, json={})))


def test_no_image_in_response(tmp_path):
    with pytest.raises(images.ImageError, match="sem imagem"):
        images.generate("gato", [], tmp_path / "o.png", client=client(lambda q: reply(images_=False)))


def test_higgsfield_not_implemented(tmp_path):
    config.save({"image_provider": "higgsfield"})
    with pytest.raises(images.ImageError, match="higgsfield"):
        images.generate("gato", [], tmp_path / "o.png")


def test_missing_key(monkeypatch, tmp_path):
    monkeypatch.delenv("OPENROUTER_API_KEY")
    with pytest.raises(eleven.MissingKey, match="OPENROUTER_API_KEY"):
        images.generate("gato", [], tmp_path / "o.png")


def test_200_without_choices(tmp_path):
    with pytest.raises(images.ImageError, match="rate limited"):
        images.generate("g", [], tmp_path / "o.png",
                        client=client(lambda q: httpx.Response(200, json={"error": "rate limited"})))


def test_https_url_rejected(tmp_path):
    bad = httpx.Response(200, json={"choices": [{"message": {"images": [{"image_url": {"url": "https://x/y.png"}}]}}]})
    with pytest.raises(images.ImageError, match="data URI"):
        images.generate("g", [], tmp_path / "o.png", client=client(lambda q: bad))
    assert not (tmp_path / "o.png").exists()


def test_non_data_url_with_comma_rejected(tmp_path):
    bad = httpx.Response(200, json={"choices": [{"message": {"images": [{"image_url": {"url": "https://cdn/x.png,QUJD"}}]}}]})
    with pytest.raises(images.ImageError, match="data URI"):
        images.generate("g", [], tmp_path / "o.png", client=client(lambda q: bad))
    assert not (tmp_path / "o.png").exists()
