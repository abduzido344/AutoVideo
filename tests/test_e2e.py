import json
import os
import time
from datetime import datetime
from pathlib import Path
import pytest
from autovideo import config, data, doctor, fila, media, personagem
from autovideo.jobs import JobStore


def test_e2e_one_episode(slow, tmp_path, monkeypatch):
    """Um episódio de verdade (custa dinheiro): só roda com AV_SLOW=1, chaves reais e login do Claude."""
    keys = {k: config.get_key(k) for k in ("ELEVENLABS_API_KEY", "OPENROUTER_API_KEY")}  # antes de trocar o HOME
    if not all(keys.values()):
        pytest.skip("faltam ELEVENLABS_API_KEY e/ou OPENROUTER_API_KEY")
    if not os.environ.get("AV_E2E_VOICE"):
        pytest.skip("defina AV_E2E_VOICE (voz_id do ElevenLabs)")
    try:
        doctor.claude_auth()
    except Exception as e:  # noqa: BLE001
        pytest.skip(f"Claude sem autenticação: {e}")
    for k, v in keys.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setenv("AUTOVIDEO_HOME", str(tmp_path / "home"))

    p = data.create_perfil("Benji E2E")
    p.estilo, p.voz_id, p.ativo = "benji", os.environ["AV_E2E_VOICE"], True
    p.agenda.episodios_por_serie = 1
    data.save_perfil(p)
    d = data.perfis_dir() / p.slug / "personagens" / "ze"
    d.mkdir(parents=True)
    (d / "ficha.md").write_text("Zé, 60 anos, bigode grosso, camisa xadrez, olhar desconfiado.", encoding="utf-8")
    personagem.gerar_folha(p.slug, "ze")
    personagem.aprovar_folha(p.slug, "ze")

    store = JobStore(tmp_path / "jobs.db")
    monkeypatch.setattr(fila, "_cooldown", {})
    jid = fila.tick(store, datetime.now(), force=p.slug)
    assert jid
    assert fila.run_next(store, time.time())
    job = store.get(jid)
    assert job["status"] == "awaiting_approval", job.get("error")

    ep = Path(job["project_dir"])
    info = media.probe(ep / "out" / "final.mp4")
    assert (info["width"], info["height"]) == (1080, 1920) and round(info["fps"]) == 30
    roles = {}
    for ln in (ep / "decisions.log").read_text(encoding="utf-8").splitlines():
        e = json.loads(ln)
        if "role" in e and "model" in e:
            roles[e["role"]] = e["model"]
    assert {"roteirista", "diretor_arte", "revisor"} <= roles.keys()
