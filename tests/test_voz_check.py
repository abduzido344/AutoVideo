from autovideo import voz_check as vc


def test_normalizar():
    assert vc.normalizar("Às nove!") == ["as", "nove"]


def test_semelhanca_identica_e_diferente():
    assert vc.semelhanca("Às nove horas, a luz cai.", "as nove horas a luz cai") == 1.0
    assert vc.semelhanca("Às nove horas, a luz cai.", "nove agá catorze") < vc.LIMITE


def test_short_narration_skipped():
    assert not vc.precisa_checar("Corre!") and not vc.precisa_checar("Não, não.")
    assert vc.precisa_checar("A luz cai.")


def test_digits_match_spelled_numbers():
    assert vc.semelhanca("Às três e quarenta e sete, a luz cai.", "as 3:47 a luz cai") >= vc.LIMITE
    assert vc.semelhanca("Às três e quarenta e sete", "3h47") >= vc.LIMITE
    assert vc.semelhanca("São catorze mortos", "são 14 mortos") >= vc.LIMITE
    assert vc.semelhanca("São quatorze mortos", "são 14 mortos") >= vc.LIMITE
    assert vc.semelhanca("Foram trinta e oito por cento", "foram 38%") >= vc.LIMITE
    assert vc.extenso(100) == "cem" and vc.extenso(117) == "cento e dezessete" and vc.extenso(2025) == "dois mil e vinte e cinco"


def test_wrong_number_still_below_limite():
    assert vc.semelhanca("nove e catorze", "nove agá catorze") < vc.LIMITE
