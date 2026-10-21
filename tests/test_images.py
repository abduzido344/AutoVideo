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


def hf_env(monkeypatch):
    config.save({"image_provider": "higgsfield"})
    monkeypatch.setenv("HIGGSFIELD_API_KEY", "id:segredo")
    monkeypatch.setattr(images, "_sleep", lambda s: None)


def test_higgsfield_uploads_refs_submits_polls_and_downloads(monkeypatch, tmp_path):
    hf_env(monkeypatch)
    ref = tmp_path / "folha.png"
    ref.write_bytes(PNG)
    seen = []

    def h(req):
        seen.append((req.method, str(req.url), req.headers.get("authorization"), req.content))
        u = str(req.url)
        if u.endswith("/files/generate-upload-url"):
            return httpx.Response(200, json={"upload_url": "https://store.test/put", "public_url": "https://cdn.test/folha.png",
                                             "upload_headers": {"Content-Type": "image/png"}})
        if u == "https://store.test/put":
            return httpx.Response(200)
        if u.endswith("/xai/grok-imagine-image-2.0"):
            return httpx.Response(200, json={"status": "queued", "request_id": "r1", "status_url": "https://api.higgsfield.ai/requests/r1/status"})
        if u.endswith("/requests/r1/status"):
            polls = sum(1 for s in seen if s[1].endswith("/status"))
            if polls == 1:
                return httpx.Response(200, json={"status": "in_progress", "request_id": "r1"})
            return httpx.Response(200, json={"status": "completed", "request_id": "r1", "images": [{"url": "https://cdn.test/out.png"}]})
        if u == "https://cdn.test/out.png":
            return httpx.Response(200, content=PNG)
        raise AssertionError(u)

    out = tmp_path / "o.png"
    r = images.generate("gato", [ref], out, client=client(h))
    assert out.read_bytes() == PNG and r == {"provider": "higgsfield", "model": "xai/grok-imagine-image-2.0", "cost_usd": None}
    sub = next(s for s in seen if s[1].endswith("grok-imagine-image-2.0"))
    assert sub[2] == "Key id:segredo"
    assert json.loads(sub[3]) == {"prompt": "gato", "aspect_ratio": "9:16", "image_urls": ["https://cdn.test/folha.png"]}
    assert next(s for s in seen if s[1] == "https://store.test/put")[2] is None   # credencial não vai para o storage
    assert sum(1 for s in seen if s[1].endswith("/status")) == 2


@pytest.mark.parametrize("status,match", [("nsfw", "nsfw"), ("failed", "Generation failed")])
def test_higgsfield_terminal_failure(monkeypatch, tmp_path, status, match):
    hf_env(monkeypatch)

    def h(req):
        if str(req.url).endswith("/status"):
            return httpx.Response(200, json={"status": status, "request_id": "r1", "error": "Generation failed"})
        return httpx.Response(200, json={"status": "queued", "request_id": "r1", "status_url": "https://api.higgsfield.ai/requests/r1/status"})

    with pytest.raises(images.ImageError, match=match):
        images.generate("gato", [], tmp_path / "o.png", client=client(h))
    assert not (tmp_path / "o.png").exists()


@pytest.mark.parametrize("code,match", [(403, "sem créditos"), (401, "KEY_ID:KEY_SECRET")])
def test_higgsfield_submit_errors(monkeypatch, tmp_path, code, match):
    hf_env(monkeypatch)
    with pytest.raises(images.ImageError, match=match):
        images.generate("gato", [], tmp_path / "o.png", client=client(lambda q: httpx.Response(code, json={"detail": "x"})))


def test_higgsfield_key_format(monkeypatch, tmp_path):
    hf_env(monkeypatch)
    monkeypatch.setenv("HIGGSFIELD_API_KEY", "so-um-pedaco")
    with pytest.raises(images.ImageError, match="KEY_ID:KEY_SECRET"):
        images.generate("gato", [], tmp_path / "o.png", client=client(lambda q: httpx.Response(500)))


def openai_env(monkeypatch):
    config.save({"image_provider": "openai"})
    monkeypatch.setenv("OPENAI_API_KEY", "sk-oa")


def oa_reply():
    return httpx.Response(200, json={"data": [{"b64_json": base64.b64encode(PNG).decode()}]})


def test_openai_without_refs_uses_generations_with_9x16_size(monkeypatch, tmp_path):
    openai_env(monkeypatch)
    seen = {}

    def h(req):
        seen["url"], seen["auth"], seen["body"] = str(req.url), req.headers["authorization"], json.loads(req.content)
        return oa_reply()

    r = images.generate("gato", [], tmp_path / "o.png", client=client(h))
    assert seen["url"] == "https://api.openai.com/v1/images/generations" and seen["auth"] == "Bearer sk-oa"
    assert seen["body"] == {"model": "gpt-image-2", "prompt": "gato", "size": "1152x2048"}
    assert (tmp_path / "o.png").read_bytes() == PNG and r == {"provider": "openai", "model": "gpt-image-2", "cost_usd": None}


def test_openai_refs_go_to_edits_as_multipart(monkeypatch, tmp_path):
    openai_env(monkeypatch)
    refs = []
    for n in "ab":
        (tmp_path / f"{n}.png").write_bytes(PNG)
        refs.append(tmp_path / f"{n}.png")
    seen = {}

    def h(req):
        seen["url"], seen["body"] = str(req.url), req.read()
        return oa_reply()

    images.generate("gato", refs, tmp_path / "o.png", aspect="16:9", client=client(h))
    assert seen["url"] == "https://api.openai.com/v1/images/edits"
    assert seen["body"].count(b'name="image[]"') == 2 and b"2048x1152" in seen["body"] and b"gpt-image-2" in seen["body"]


@pytest.mark.parametrize("status,code,match", [(429, "insufficient_quota", "sem saldo na OpenAI"),
                                               (400, "moderation_blocked", "moderação"),
                                               (401, "invalid_api_key", "inválida")])
def test_openai_errors(monkeypatch, tmp_path, status, code, match):
    openai_env(monkeypatch)
    resp = lambda q: httpx.Response(status, json={"error": {"code": code, "message": "x"}})
    with pytest.raises(images.ImageError, match=match):
        images.generate("gato", [], tmp_path / "o.png", client=client(resp))


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
