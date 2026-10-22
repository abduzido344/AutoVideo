"""Checagem da voz: o áudio gerado é transcrito de volta e comparado com a narração."""
import difflib
import re
import unicodedata

LIMITE = 0.85
MIN_PALAVRAS = 3  # narração curta demais: o ASR erra por si só, não vale checar


_U = ("zero um dois tres quatro cinco seis sete oito nove dez onze doze treze catorze quinze dezesseis dezessete "
      "dezoito dezenove").split()
_D = "_ _ vinte trinta quarenta cinquenta sessenta setenta oitenta noventa".split()
_C = "_ cento duzentos trezentos quatrocentos quinhentos seiscentos setecentos oitocentos novecentos".split()


def extenso(n: int) -> str:
    """Número por extenso em pt-BR, sem acento. ponytail: só 0-9999, sem ordinais nem decimais."""
    if n < 20:
        return _U[n]
    if n < 100:
        return _D[n // 10] + (f" e {_U[n % 10]}" if n % 10 else "")
    if n < 1000:
        return "cem" if n == 100 else _C[n // 100] + (f" e {extenso(n % 100)}" if n % 100 else "")
    mil = "mil" if n < 2000 else f"{extenso(n // 1000)} mil"
    return mil + (f" e {extenso(n % 1000)}" if n % 1000 else "")


def _numeros(t: str) -> str:
    """O ASR devolve dígitos ("3:47", "38%", "14"); a narração é por extenso. Põe os dois lados na mesma forma."""
    t = re.sub(r"\b(\d{1,2})\s*[:h]\s*(\d{2})\b", lambda m: f" {extenso(int(m[1]))} e {extenso(int(m[2]))} "
               if int(m[2]) else f" {extenso(int(m[1]))} ", t)
    t = re.sub(r"\b(\d{1,4})\s*%", lambda m: f" {extenso(int(m[1]))} por cento ", t)
    return re.sub(r"\b(\d{1,4})h?\b", lambda m: f" {extenso(int(m[1]))} ", t)


def normalizar(t: str) -> list[str]:
    sem_acento = "".join(c for c in unicodedata.normalize("NFKD", t.lower()) if not unicodedata.combining(c))
    return re.findall(r"\w+", _numeros(sem_acento).replace("quatorze", "catorze"))


def semelhanca(esperado: str, ouvido: str) -> float:
    return difflib.SequenceMatcher(None, normalizar(esperado), normalizar(ouvido)).ratio()


def precisa_checar(narracao: str) -> bool:
    return len(normalizar(narracao)) >= MIN_PALAVRAS
