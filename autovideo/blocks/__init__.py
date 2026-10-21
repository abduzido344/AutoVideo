"""Blocos de tela de celular: sub-composições HyperFrames 1080×1920 geradas por templating."""
import html
from pathlib import Path
from string import Template
from pydantic import BaseModel, Field

GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"
_DIR = Path(__file__).parent


class Msg(BaseModel):
    autor: str
    texto: str


class Chat(BaseModel):
    grupo: str
    mensagens: list[Msg] = Field(min_length=1, max_length=8)


class Alerta(BaseModel):
    titulo: str
    orgao: str
    texto: str
    hora: str


class Bateria(BaseModel):
    nivel: int = Field(ge=0, le=100)
    modo_aviao: bool
    hora: str


class Bloqueio(BaseModel):
    hora: str
    data: str


class Notificacao(BaseModel):
    app: str
    titulo: str
    texto: str
    hora: str


SCHEMAS: dict[str, type[BaseModel]] = {"chat": Chat, "alerta": Alerta, "bateria": Bateria,
                                       "bloqueio": Bloqueio, "notificacao": Notificacao}

# Não adaptei blocos do catálogo (notification-cascade, message-thread-reveal): trazem tema, dados e
# timing próprios de anúncio; estes cinco são telas simples guiadas por dados.
_SHELL = Template("""<template>
<style>
#root { position: absolute; inset: 0; background: #0b0b10; overflow: hidden; font-family: sans-serif; color: #fff; display: flex; align-items: center; justify-content: center; }
.phone { position: relative; width: 860px; height: 1740px; border-radius: 110px; background: #16161d; border: 14px solid #2a2a35; overflow: hidden; }
.screen { position: absolute; inset: 0; background: linear-gradient(180deg, #1c2340, #0e1224); display: flex; flex-direction: column; align-items: center; }
.screen.light { background: #f2f2f7; color: #111; }
.col { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; padding: 0 50px; }
.big { font-size: 190px; font-weight: 700; line-height: 1; margin-top: 260px; }
.sub { font-size: 46px; margin-top: 20px; opacity: .8; }
.name { font-size: 54px; font-weight: 700; padding: 90px 50px 40px; align-self: flex-start; }
.msg { background: #2b2f45; border-radius: 40px; padding: 28px 36px; margin-bottom: 28px; font-size: 44px; line-height: 1.25; align-self: flex-start; max-width: 620px; }
.msg b { display: block; font-size: 34px; color: #ff80ab; margin-bottom: 8px; }
.card { background: #fff; color: #111; border-radius: 44px; padding: 44px; margin-top: 60px; }
.card.red { background: #d62828; color: #fff; }
.card h2 { margin: 0 0 18px; font-size: 56px; }
.card p { margin: 0; font-size: 44px; line-height: 1.3; }
.card small { display: block; margin-top: 24px; font-size: 34px; opacity: .8; }
.bat { margin-top: 70px; width: 420px; height: 190px; border: 12px solid #fff; border-radius: 40px; position: relative; }
.bat i { position: absolute; left: 10px; top: 10px; bottom: 10px; border-radius: 22px; }
</style>
<div id="root" data-composition-id="$id" data-width="1080" data-height="1920">
<div class="phone" id="$id-phone"><div class="screen $theme">
$body
</div></div>
</div>
<script src="$gsap"></script>
<script>
const tl = gsap.timeline({ paused: true });
tl.fromTo("#$id-phone", { scale: 1 }, { scale: 1.06, duration: $dur, ease: "none" }, 0);
$js
window.__timelines["$id"] = tl;
</script>
</template>
""")


def _e(v) -> str:
    return html.escape(str(v), quote=True)


def _fields(kind: str, d: BaseModel) -> dict:
    if kind == "chat":
        msgs = "".join(f'<div class="msg"><b>{_e(m.autor)}</b>{_e(m.texto)}</div>' for m in d.mensagens)
        return {"grupo": _e(d.grupo), "msgs": msgs}
    if kind == "bateria":
        return {"nivel": d.nivel, "hora": _e(d.hora),
                "aviao": "Modo avião ativado" if d.modo_aviao else "Rede conectada",
                "cor": "#ff3b30" if d.nivel <= 20 else "#34c759"}
    return {k: _e(v) for k, v in d.model_dump().items()}


def render_block(kind: str, data: dict, dur: float, comp_id: str) -> str:
    d = SCHEMAS[kind].model_validate(data)
    body, js = (_DIR / f"{kind}.html").read_text(encoding="utf-8").split("<!--JS-->")
    f = {"id": _e(comp_id), "dur": dur, **_fields(kind, d)}
    return _SHELL.substitute(id=f["id"], dur=dur, gsap=GSAP, theme="light" if kind == "notificacao" else "",
                             body=Template(body).substitute(f), js=Template(js).substitute(f))
