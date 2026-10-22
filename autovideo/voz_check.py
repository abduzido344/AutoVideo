"""Checagem da voz: o áudio gerado é transcrito de volta e comparado com a narração."""
import difflib
import re
import unicodedata

LIMITE = 0.85
MIN_PALAVRAS = 3  # narração curta demais: o ASR erra por si só, não vale checar


def normalizar(t: str) -> list[str]:
    sem_acento = "".join(c for c in unicodedata.normalize("NFKD", t.lower()) if not unicodedata.combining(c))
    return re.findall(r"\w+", sem_acento)


def semelhanca(esperado: str, ouvido: str) -> float:
    return difflib.SequenceMatcher(None, normalizar(esperado), normalizar(ouvido)).ratio()


def precisa_checar(narracao: str) -> bool:
    return len(normalizar(narracao)) >= MIN_PALAVRAS
