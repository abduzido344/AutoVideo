from autovideo import edicao

BASE = """<html><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="6">
<img id="img-s01" class="clip cena" src="assets/a.png" alt="" data-start="0" data-duration="2" data-track-index="0" />
<div id="screen-s02" data-composition-id="screen-s02" data-composition-src="compositions/screen-s02.html" data-start="2" data-duration="4" data-track-index="0"></div>
<audio id="voz-s01" src="assets/v.mp3" data-start="0" data-duration="2" data-volume="1" data-track-index="2"></audio>
<audio id="sfx-s01" src="assets/s.mp3" data-start="0" data-duration="2" data-track-index="3"></audio>
<audio id="ambiente" src="assets/amb.mp3" data-start="0" data-duration="6" data-track-index="4"></audio>
</div></body></html>"""


def par(tmp_path, editada):
    for n, h in (("b", BASE), ("c", editada)):
        (tmp_path / n).mkdir()
        (tmp_path / n / "index.html").write_text(h, encoding="utf-8")
    return tmp_path / "b", tmp_path / "c"


def test_untouched_passes(tmp_path):
    assert edicao.invariantes(*par(tmp_path, BASE)) == []


def test_changed_voice_start_fails(tmp_path):
    erros = edicao.invariantes(*par(tmp_path, BASE.replace('id="voz-s01" src="assets/v.mp3" data-start="0"', 'id="voz-s01" src="assets/v.mp3" data-start="0.5"')))
    assert len(erros) == 1 and "voz-s01" in erros[0]


def test_wrapper_moving_timing_fails(tmp_path):
    # o editor embrulha a imagem e leva o tempo para o wrapper
    h = BASE.replace('<img id="img-s01" class="clip cena" src="assets/a.png" alt="" data-start="0" data-duration="2" data-track-index="0" />',
                     '<div class="clip" data-start="1" data-duration="2"><img id="img-s01" class="cena" src="assets/a.png" alt="" /></div>')
    erros = edicao.invariantes(*par(tmp_path, h))
    assert any("img-s01" in e for e in erros)


def test_root_duration_change_fails(tmp_path):
    erros = edicao.invariantes(*par(tmp_path, BASE.replace('data-duration="6">', 'data-duration="7">', 1)))
    assert any("duração total" in e for e in erros)


def test_removed_audio_fails(tmp_path):
    h = BASE.replace('<audio id="sfx-s01" src="assets/s.mp3" data-start="0" data-duration="2" data-track-index="3"></audio>', "")
    erros = edicao.invariantes(*par(tmp_path, h))
    assert any("sfx-s01" in e for e in erros) and any("assets/s.mp3" in e for e in erros)


def test_added_transition_and_media_passes(tmp_path):
    h = BASE.replace("</div></body>", '<div class="clip" data-composition-src="compositions/whip-pan.html" data-start="1.8" data-duration="0.4" data-track-index="5"></div>'
                     '<img id="extra" src="assets/b.png" alt="" /></div></body>')
    assert edicao.invariantes(*par(tmp_path, h)) == []


def test_caption_added_without_legenda_fails(tmp_path):
    h = BASE.replace("</div></body>", '<div class="clip" data-composition-src="compositions/captions.html" data-start="0" data-duration="6"></div></div></body>')
    erros = edicao.invariantes(*par(tmp_path, h))
    assert len(erros) == 1 and "legenda" in erros[0]


def test_restaurar_base_replaces_partial_edit(tmp_path):
    (tmp_path / "composition.base").mkdir()
    (tmp_path / "composition.base" / "index.html").write_text("base")
    (tmp_path / "composition").mkdir()
    (tmp_path / "composition" / "index.html").write_text("editada")
    (tmp_path / "composition" / "novo.html").write_text("x")
    edicao.restaurar_base(tmp_path)
    assert (tmp_path / "composition" / "index.html").read_text() == "base"
    assert not (tmp_path / "composition" / "novo.html").exists()
