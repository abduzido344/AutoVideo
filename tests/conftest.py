import os
import shutil
import subprocess
import pytest

needs_ffmpeg = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg ausente")


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


@pytest.fixture(scope="session")
def media_dir(tmp_path_factory):
    d = tmp_path_factory.mktemp("Meus Vídeos ç")  # Review Focus 3: espaço + acento
    # 6 s: tom 0–2 s, silêncio 2–4 s, tom 4–6 s; rotação 90° via display matrix
    ff("-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=24",
       "-f", "lavfi", "-i", "aevalsrc='if(lt(mod(t,4),2),0.3*sin(440*2*PI*t),0)':s=48000",
       "-t", "6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(d / "talk.mp4"))
    # ffmpeg 7: -display_rotation é opção de entrada (antes de -i)
    ff("-display_rotation", "90", "-i", str(d / "talk.mp4"), "-c", "copy", str(d / "rotated.mp4"))
    return d


@pytest.fixture
def slow():
    if not os.environ.get("AV_SLOW"):
        pytest.skip("defina AV_SLOW=1 para testes com rede/modelos")


@pytest.fixture(scope="session")
def dynamic_dir(tmp_path_factory):
    """20 s de ruído rosa com degrau de 20 dB (3 s alto / 7 s baixo) + vídeo."""
    d = tmp_path_factory.mktemp("Dinâmico ç")
    ff("-f", "lavfi", "-i", "testsrc2=size=320x180:rate=30",
       "-f", "lavfi", "-i", "anoisesrc=color=pink:amplitude=0.2:sample_rate=44100:duration=20",
       "-af", "volume='if(lt(mod(t,10),3),1,0.1)':eval=frame", "-t", "20",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(d / "dyn.mp4"))
    return d
