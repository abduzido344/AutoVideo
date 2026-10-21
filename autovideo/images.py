import base64
import hashlib
import json
import mimetypes
import time
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


def _write(raw: bytes, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    part = out.with_name(out.name + ".part")
    part.write_bytes(raw)
    part.replace(out)


def generate(prompt: str, refs: list[Path], out: Path, aspect: str = "9:16",
             client: httpx.Client | None = None) -> dict:
    provider = config.setting("image_provider")
    if provider not in ("openrouter", "higgsfield"):
        raise ImageError(f"provedor {provider} desconhecido")
    own = client is None
    c = client or httpx.Client(timeout=180)
    try:
        return (_openrouter if provider == "openrouter" else _higgsfield)(prompt, refs, out, aspect, c)
    finally:
        if own:
            c.close()


HF_API = "https://api.higgsfield.ai"
HF_FIM = {"completed", "failed", "nsfw", "canceled"}
HF_TIMEOUT_S = 600
_sleep = time.sleep  # os testes trocam por um no-op


def _hf_check(r: httpx.Response) -> dict:
    if r.status_code == 403:
        raise ImageError("sem créditos na Higgsfield: adicione créditos em console.higgsfield.ai")
    if r.status_code == 401:
        raise ImageError("chave da Higgsfield inválida: use o formato KEY_ID:KEY_SECRET do console.higgsfield.ai")
    if not r.is_success:
        raise ImageError(f"Higgsfield {r.status_code}: {r.text[:300]}")
    try:
        return r.json()
    except ValueError as e:
        raise ImageError(f"resposta inesperada da Higgsfield: {r.text[:300]}") from e


def _higgsfield(prompt: str, refs: list[Path], out: Path, aspect: str, c: httpx.Client) -> dict:
    key = config.get_key("HIGGSFIELD_API_KEY")
    if not key:
        raise MissingKey("falta HIGGSFIELD_API_KEY (defina a variável ou salve em Configurações)")
    if ":" not in key:
        raise ImageError("a chave da Higgsfield vai no formato KEY_ID:KEY_SECRET")
    auth = {"Authorization": f"Key {key}"}
    model = config.setting("higgsfield_model")
    urls = []
    for ref in refs:  # a API só aceita URL pública: sobe as folhas no storage da Higgsfield
        mime = mimetypes.guess_type(ref.name)[0] or "image/png"
        up = _hf_check(c.post(f"{HF_API}/files/generate-upload-url", json={"content_type": mime}, headers=auth))
        # sem as credenciais aqui: a URL assinada é de outro host
        put = c.put(up["upload_url"], content=ref.read_bytes(), headers=up.get("upload_headers") or {"Content-Type": mime})
        if not put.is_success:
            raise ImageError(f"falha ao subir a referência {ref.name}: {put.status_code}")
        urls.append(up["public_url"])
    body = {"prompt": prompt, "aspect_ratio": aspect, **({"image_urls": urls} if urls else {})}
    # mesma chave em nova tentativa = sem cobrança dobrada
    idem = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
    req = _hf_check(c.post(f"{HF_API}/{model}", json=body, headers={**auth, "Idempotency-Key": idem}))
    st, delay, waited = req, 2.0, 0.0
    while st.get("status") not in HF_FIM:
        if waited > HF_TIMEOUT_S:
            raise ImageError(f"a Higgsfield não terminou em {HF_TIMEOUT_S} s (pedido {req.get('request_id')})")
        _sleep(delay)
        waited, delay = waited + delay, min(delay * 1.5, 10.0)
        r = c.get(req["status_url"], headers=auth)
        if r.status_code >= 500:
            continue
        st = _hf_check(r)
    if st["status"] != "completed":
        motivo = "conteúdo bloqueado (nsfw)" if st["status"] == "nsfw" else st.get("error") or st["status"]
        raise ImageError(f"a Higgsfield não gerou a imagem: {motivo}")
    try:
        url = st["images"][0]["url"]
    except (KeyError, IndexError, TypeError) as e:
        raise ImageError(f"a resposta da Higgsfield não trouxe imagem: {str(st)[:300]}") from e
    if not url.startswith("https://"):
        raise ImageError(f"URL de imagem inesperada: {url[:100]}")
    img = c.get(url)
    if not img.is_success:
        raise ImageError(f"falha ao baixar a imagem da Higgsfield: {img.status_code}")
    _write(img.content, out)
    return {"provider": "higgsfield", "model": model, "cost_usd": None}


def _openrouter(prompt: str, refs: list[Path], out: Path, aspect: str, c: httpx.Client) -> dict:
    key = config.get_key("OPENROUTER_API_KEY")
    if not key:
        raise MissingKey("falta OPENROUTER_API_KEY (defina a variável ou salve em Configurações)")
    model = config.setting("image_model")
    body = {"model": model, "modalities": ["image", "text"], "image_config": {"aspect_ratio": aspect},
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": prompt},
                *({"type": "image_url", "image_url": {"url": _data_uri(r)}} for r in refs)]}]}
    r = c.post(URL, json=body, headers={"Authorization": f"Bearer {key}"})
    # modelos só de imagem (Seedream, Flux, Recraft...) recusam ["image", "text"] com 404, sem cobrar
    if r.status_code == 404 and "output modalities" in r.text.lower():
        r = c.post(URL, json={**body, "modalities": ["image"]}, headers={"Authorization": f"Bearer {key}"})
    if r.status_code == 402:
        raise ImageError("sem saldo no OpenRouter: adicione créditos (mínimo US$ 1) em openrouter.ai/settings/credits")
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
        url = imgs[0]["image_url"]["url"]
        if not url.startswith("data:"):
            raise ValueError(url)
        raw = base64.b64decode(url.split(",", 1)[1], validate=True)
    except (KeyError, IndexError, TypeError, ValueError) as e:
        raise ImageError(f"imagem fora do formato data URI: {r.text[:300]}") from e
    _write(raw, out)
    return {"provider": "openrouter", "model": model, "cost_usd": (data.get("usage") if isinstance(data.get("usage"), dict) else {}).get("cost")}
