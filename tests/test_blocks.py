import copy
import re
import pytest
from pydantic import ValidationError
from autovideo import render
from autovideo.blocks import GSAP_URL, SCHEMAS, render_block
from autovideo.project import Project

EXEMPLOS = {
    "chat": {"grupo": "Família", "mensagens": [{"autor": "Ana", "texto": "Viram isso?"}, {"autor": "Rui", "texto": "Vi!"}]},
    "alerta": {"titulo": "Tempestade", "orgao": "Defesa Civil", "texto": "Procure abrigo.", "hora": "14:02"},
    "bateria": {"nivel": 7, "modo_aviao": True, "hora": "03:12"},
    "bloqueio": {"hora": "21:45", "data": "terça, 21 de outubro"},
    "notificacao": {"app": "Mensagens", "titulo": "Mãe", "texto": "Onde você está?", "hora": "agora"},
}


EVIL = '<script>x</script>"'


def _casos():
    for kind, data in EXEMPLOS.items():
        for k, v in data.items():
            if isinstance(v, str):
                yield kind, k, None
        if kind == "chat":
            yield kind, "mensagens", "autor"
            yield kind, "mensagens", "texto"


@pytest.mark.parametrize("kind,campo,sub", list(_casos()))
def test_escapes_text(kind, campo, sub):
    data = copy.deepcopy(EXEMPLOS[kind])
    if sub:
        data[campo][0][sub] = EVIL
    else:
        data[campo] = EVIL
    out = render_block(kind, data, 3, "t")
    assert "<script>x" not in out and "&lt;script&gt;x" in out and "&quot;" in out
    assert out.count("<script>") == 1  # só o do timeline


def test_rejects_bad_args():
    ok = EXEMPLOS["bloqueio"]
    for args in (("nada", ok, 3, "t"), ("bloqueio", ok, 0, "t"), ("bloqueio", ok, 3, 'a"b'), ("bloqueio", ok, 3, "")):
        with pytest.raises(ValueError):
            render_block(*args)


def test_every_kind_renders():
    assert set(EXEMPLOS) == set(SCHEMAS)
    for kind, data in EXEMPLOS.items():
        assert 'data-composition-id="t"' in render_block(kind, data, 3, "t")


def test_rejects_bad_data():
    with pytest.raises(ValidationError):
        render_block("bateria", {"nivel": 150, "modo_aviao": False, "hora": "1:00"}, 3, "t")


def test_blocks_pass_hyperframes_check(slow, tmp_path):
    p = Project(tmp_path)
    render.init_composition(p, "9:16")
    hosts = []
    for i, (kind, data) in enumerate(EXEMPLOS.items()):
        (p.comp / "compositions" / f"{kind}.html").write_text(render_block(kind, data, 3, kind), encoding="utf-8")
        hosts.append(f'<div id="{kind}" data-composition-id="{kind}" data-composition-src="compositions/{kind}.html" '
                     f'data-start="{i * 3}" data-duration="3" data-track-index="1" data-width="1080" data-height="1920"></div>')
    idx = p.comp / "index.html"
    s = idx.read_text(encoding="utf-8")
    # insere os hosts antes do </div> que fecha o root (o último antes do <script>)
    cut = s.rindex("</div>", 0, s.index("<script", s.index("data-composition-id")))
    s = s[:cut] + "\n".join(hosts) + "\n" + s[cut:]
    s = re.sub(r'<h1 id="title".*?</h1>', "", s)  # título do exemplo "blank" ficaria atrás dos blocos
    if GSAP_URL not in s:
        s = s.replace("<head>", f'<head><script src="{GSAP_URL}"></script>', 1)
    idx.write_text(s, encoding="utf-8")
    assert render.check(p.comp, "9:16") == []
