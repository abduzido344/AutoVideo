from autovideo import voz_check as vc


def test_normalizar():
    assert vc.normalizar("Às nove!") == ["as", "nove"]


def test_semelhanca_identica_e_diferente():
    assert vc.semelhanca("Às nove horas, a luz cai.", "as nove horas a luz cai") == 1.0
    assert vc.semelhanca("Às nove horas, a luz cai.", "nove agá catorze") < vc.LIMITE


def test_short_narration_skipped():
    assert not vc.precisa_checar("Corre!") and not vc.precisa_checar("Não, não.")
    assert vc.precisa_checar("A luz cai.")
