from pathlib import Path
import re
import textwrap

p = Path(__file__).resolve().parent
texto = (p.parent / 'narracao.txt').read_text(encoding='utf-8-sig')
texto = re.sub(r'\[[^\]]*\]\s*|</?\w+>', '', texto)
texto = '\n\n'.join(' '.join(x.split()) for x in texto.split('\n\n') if x.strip())
(p / 'legenda-pt-BR-sem-tempos.txt').write_text(texto + '\n', encoding='utf-8')

def segundos(t):
    h, m, s, ms = map(int, re.split('[:,]', t))
    return h * 3600 + m * 60 + s + ms / 1000

originais = []
for bloco in re.split(r'\n\s*\n', (p / 'legendas.srt').read_text(encoding='utf-8-sig').strip()):
    linhas = bloco.splitlines()
    a, b = linhas[1].split(' --> ')
    originais.append([a, b, ' '.join(linhas[2:])])

grupos = []
for a, b, txt in originais:
    if grupos:
        anterior = grupos[-1]
        combinado = anterior[2] + ' ' + txt
        if (not re.search(r'[.!?:]$', anterior[2])
                and segundos(a) - segundos(anterior[1]) <= .35
                and segundos(b) - segundos(anterior[0]) <= 6
                and len(combinado) <= 80):
            anterior[1:] = [b, combinado]
            continue
    grupos.append([a, b, txt])

saida = []
ultimo = 0
for i, (a, b, txt) in enumerate(grupos, 1):
    linhas = textwrap.wrap(txt, width=42, break_long_words=False, break_on_hyphens=False)
    assert len(linhas) <= 2 and all(len(l) <= 42 for l in linhas)
    assert segundos(a) >= ultimo and segundos(b) > segundos(a)
    assert not re.search(r'[<>\[\]]', txt)
    ultimo = segundos(b)
    saida.append(f'{i}\n{a} --> {b}\n' + '\n'.join(linhas))
assert ' '.join(x[2] for x in grupos) == ' '.join(x[2] for x in originais)
(p / 'legenda-pt-BR-youtube.srt').write_text('\n\n'.join(saida) + '\n', encoding='utf-8')
print(f'{len(originais)} trechos agrupados em {len(grupos)} legendas; texto preservado; até 2 linhas de 42 caracteres; fim {grupos[-1][1]}.')
