# Piloto 1 · MQA shorts/002_foco_47_segundos (2026-11-09/10)
Short vertical 2D, 38,7 s, 17 cenas (1 IMAGEM em 4 usos + 13 MOTION), sem trilha. 10 agentes, G2/G4/G5 com o usuário. Não postado (G5: "não postar agora").
## Devoluções por portão
- G2: 1. R1 pediu virada 5→6; o roteirista recusou (contou o p5 como virada); o usuário decidiu 6 e o orquestrador aplicou.
- G4: 2. R2 reprovou a cor; o montador travou no dict COR fixo do montar.py; o usuário liberou a edição e a 2ª passou (R−B −27…−13 / −3 / +41…+50).
- G5: 0. R3 aprova.
## Escrita fora da posse
- montador → `midia/sfx.csv` (do sonoplasta), para cortar a cauda do "vibra" a pedido do meu brief.
- montador → `sistema/pipeline/montar.py` (2 linhas do COR), com liberação do usuário.
- Os demais ficaram na posse (sonoplasta `alias.tsv`, animador `motion/effectcraft/m002_foco.mjs`).
## medir.py
101 palavras · 157 ppm · 0:38 (alvo 151 ±10%) · 14,4 palavras/sinal · 1 [pausa] · gancho p1 0:00 · revelação p3 0:12 · sem "inscrev" · sem FORA.
## GPU (modal billing report)
Narração H100 US$ 0,11 · imagens L4 US$ 0,02 · total ≈ US$ 0,13. Nenhum script imprime o custo medido.
## O que travou
- Canal sem `tema.json`: sem trilha_db e sem paleta; sonoplasta e animador avisaram.
- O cache do montar.py não inclui o COR: foi preciso apagar `%TEMP%/montagem_*` para valer.
- legendar.py vertical (4 palavras/20 car., sem opção por pasta) deixa "30min." e "mais." sozinhos.
- "braço do CTA" do brief não tem definição em lugar nenhum.
## Mudar nas definições
- `passagem.md`/roteirista: marco = parágrafo onde a solução começa (cor quente), contando os [pausa]; o revisor só cita o número.
- montador: não editar sfx.csv; pedir ao sonoplasta (devolve:sonoplasta), e o brief do orquestrador não pode pedir isso.
- narrador e cenógrafo: anotar o custo de `modal billing report --json` pelo app id, não a estimativa.
- cenógrafo: gerar no tamanho final (1080×1920), não 720×1280.
- montador/R2: medir R−B por trecho antes de entregar; COR com intensidade por canal ou em cor.txt.
