import json
from pathlib import Path
import httpx
from autovideo import config
from autovideo.hf import run

BASE = "https://api.elevenlabs.io/v1"


class MissingKey(RuntimeError):
    pass


def _post(path: str, body: dict, out: Path, client: httpx.Client | None) -> None:
    key = config.get_key("ELEVENLABS_API_KEY")
    if not key:
        raise MissingKey("falta ELEVENLABS_API_KEY (defina a variável ou salve em Configurações)")
    r = (client or httpx.Client(timeout=120)).post(BASE + path, json=body, headers={"xi-api-key": key})
    if not r.is_success:
        raise RuntimeError(f"ElevenLabs {r.status_code}: {r.text[:300]}")
    out.parent.mkdir(parents=True, exist_ok=True)
    part = out.with_name(out.name + ".part")
    part.write_bytes(r.content)
    part.replace(out)


def tts(text: str, voice_id: str, out: Path, previous_text: str = "", next_text: str = "",
        client: httpx.Client | None = None) -> float:
    _post(f"/text-to-speech/{voice_id}?output_format=mp3_44100_128",
          {"text": text, "model_id": "eleven_multilingual_v2",
           "previous_text": previous_text, "next_text": next_text}, out, client)
    # media.probe exige trilha de vídeo; mp3 não tem, então lê só a duração do container
    o = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", str(out)]).stdout
    return float(json.loads(o)["format"]["duration"])


def sfx(prompt: str, seconds: float, out: Path, client: httpx.Client | None = None) -> None:
    _post("/sound-generation", {"text": prompt, "duration_seconds": min(max(seconds, 0.5), 22)}, out, client)
