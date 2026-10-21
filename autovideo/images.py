import base64
import mimetypes
from pathlib import Path
import httpx
from autovideo import config
from autovideo.eleven import MissingKey

URL = "https://openrouter.ai/api/v1/chat/completions"


class ImageError(RuntimeError):
    pass


def _data_uri(p: Path) -> str:
    mime = mimetypes.guess_type(p.name)[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(p.read_bytes()).decode()}"


def generate(prompt: str, refs: list[Path], out: Path, aspect: str = "9:16",
             client: httpx.Client | None = None) -> dict:
    provider = config.setting("image_provider")
    if provider != "openrouter":
        raise ImageError(f"provedor {provider} ainda não implementado")
    key = config.get_key("OPENROUTER_API_KEY")
    if not key:
        raise MissingKey("falta OPENROUTER_API_KEY (defina a variável ou salve em Configurações)")
    model = config.setting("image_model")
    body = {"model": model, "modalities": ["image", "text"], "image_config": {"aspect_ratio": aspect},
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt},
                *({"type": "image_url", "image_url": {"url": _data_uri(r)}} for r in refs)]}]}
    own = client is None
    c = client or httpx.Client(timeout=180)
    try:
        r = c.post(URL, json=body, headers={"Authorization": f"Bearer {key}"})
    finally:
        if own:
            c.close()
    if not r.is_success:
        raise ImageError(f"OpenRouter {r.status_code}: {r.text[:300]}")
    try:
        data = r.json()
        msg = data["choices"][0]["message"]
        imgs = msg.get("images") or []
    except (ValueError, KeyError, IndexError, TypeError, AttributeError) as e:
        raise ImageError(f"resposta inesperada do OpenRouter: {r.text[:300]}") from e
    if not imgs:
        raise ImageError(f"a resposta não trouxe imagem: {str(msg.get('content'))[:300]}")
    try:
        raw = base64.b64decode(imgs[0]["image_url"]["url"].split(",", 1)[1], validate=True)
    except (KeyError, IndexError, TypeError, ValueError) as e:
        raise ImageError(f"imagem fora do formato data URI: {r.text[:300]}") from e
    out.parent.mkdir(parents=True, exist_ok=True)
    part = out.with_name(out.name + ".part")
    part.write_bytes(raw)
    part.replace(out)
    return {"provider": "openrouter", "model": model, "cost_usd": (data.get("usage") or {}).get("cost")}
