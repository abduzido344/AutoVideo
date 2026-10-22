"""Skills do editor baixadas da tag fixada do HyperFrames (não do `skills update`, que compara com o HEAD
e apaga skills que só existem na tag)."""
import os
import shutil
from pathlib import Path
import httpx
from autovideo import hf
from autovideo.project import home

EDITOR_SKILLS = ("hyperframes", "hyperframes-core", "hyperframes-animation", "hyperframes-keyframes",
                 "hyperframes-registry", "hyperframes-audio", "hyperframes-creative", "hyperframes-cli")
REPO = "heygen-com/hyperframes"


def skills_dir(version: str = hf.HF_VERSION) -> Path:
    return home() / "skills" / version


def missing(names) -> list[str]:
    return [n for n in names if not (skills_dir() / n / "SKILL.md").is_file()]


def sync(names=EDITOR_SKILLS, client: httpx.Client | None = None) -> Path:
    """Baixa as skills `names` da tag para skills_dir(). Tudo-ou-nada: a pasta anterior só sai no fim."""
    dest = skills_dir()
    tmp = dest.with_name(hf.HF_VERSION + ".tmp")
    own = client is None
    c = client or httpx.Client(timeout=60, follow_redirects=True)
    shutil.rmtree(tmp, ignore_errors=True)
    try:
        tag = f"v{hf.HF_VERSION}"
        r = c.get(f"https://api.github.com/repos/{REPO}/git/trees/{tag}?recursive=1")
        r.raise_for_status()
        if r.json().get("truncated"):  # a API corta árvores grandes em silêncio: faltariam arquivos
            raise hf.ToolError(f"árvore da tag {tag} truncada pela API do GitHub")
        prefixes = tuple(f"skills/{n}/" for n in names)
        for e in r.json()["tree"]:
            if e["type"] != "blob" or not e["path"].startswith(prefixes):
                continue
            f = c.get(f"https://raw.githubusercontent.com/{REPO}/{tag}/{e['path']}")
            f.raise_for_status()
            target = tmp / e["path"].removeprefix("skills/")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(f.content)
        if gone := [n for n in names if not (tmp / n / "SKILL.md").is_file()]:
            raise hf.ToolError(f"skills ausentes na tag {tag}: {', '.join(gone)}")
        shutil.rmtree(dest, ignore_errors=True)
        os.replace(tmp, dest)
    except (httpx.HTTPError, KeyError, ValueError, OSError) as e:
        raise hf.ToolError(f"falha ao baixar as skills da tag v{hf.HF_VERSION}: {e}") from e
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        if own:
            c.close()
    return dest
