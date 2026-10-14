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
    ff("-f", "lavfi", "-i", "testsrc2=size=640x360:rate=30", "-f", "lavfi", "-i", "color=c=red:size=640x360:rate=30",
       "-filter_complex", "[0:v]trim=0:2[a];[1:v]trim=0:2,setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[v]",
       "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(d / "scenes.mp4"))
    return d


@pytest.fixture
def slow():
    if not os.environ.get("AV_SLOW"):
        pytest.skip("defina AV_SLOW=1 para testes com rede/modelos")
