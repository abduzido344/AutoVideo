import logging
from pathlib import Path
from urllib.parse import urlsplit
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from autovideo import doctor

DIST = Path(__file__).resolve().parent.parent / "web" / "dist"
LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"]
log = logging.getLogger("autovideo.server")


_doctor_ok: dict | None = None


def _doctor() -> dict:
    # só o sucesso fica em cache (chama npx/claude, leva segundos); uma falha é rechecada na próxima carga do
    # painel, para "Falta: claude auth" sumir depois do `claude login` sem reiniciar o serve
    global _doctor_ok
    if _doctor_ok:
        return _doctor_ok
    checks = [{"name": n, "ok": ok, "detail": d} for n, ok, d in doctor.run_checks()]
    res = {"ok": all(c["ok"] for c in checks), "checks": checks}
    if res["ok"]:
        _doctor_ok = res
    return res


def create_app() -> FastAPI:
    app = FastAPI(title="AutoVideo")
    # ferramenta local: bloqueia DNS rebinding (Host) e POST cross-site vindo de outras páginas (Origin)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=LOCAL_HOSTS)

    @app.middleware("http")
    async def same_origin(request: Request, call_next):
        origin = request.headers.get("origin")
        if request.method not in ("GET", "HEAD", "OPTIONS") and origin \
                and urlsplit(origin).netloc != request.headers.get("host"):
            return JSONResponse({"detail": "origem não permitida"}, status_code=403)
        return await call_next(request)

    @app.get("/api/doctor")
    def doctor_status():
        return _doctor()

    @app.get("/api/auth")
    def auth():
        # checagem rápida só da conta (o /api/doctor roda tudo); a janela "Conectar o Claude" consulta em loop
        try:
            return {"ok": True, "detail": doctor.claude_auth()}
        except Exception as e:  # noqa: BLE001 — sem claude no PATH também é "não conectado"
            return {"ok": False, "detail": str(e).splitlines()[0] if str(e) else type(e).__name__}

    @app.post("/api/auth/login")
    def auth_login():
        # só abre o terminal com `claude auth login`: o login é do Claude Code, o AutoVideo não implementa login
        try:
            doctor.open_login_terminal()
        except (OSError, doctor.hf.ToolError) as e:
            raise HTTPException(501, str(e)) from e
        return {"ok": True}

    if DIST.exists():
        app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
    return app
