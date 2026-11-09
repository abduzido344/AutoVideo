import json, csv, math, wave, struct
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE.parents[1] / 'videos/001_ultimo_que_derrete_ganha/audio'
START, END = 44.10, 84.92
words = [(w, round(t - START, 3)) for w, t in json.loads((ORIGINAL/'palavras.json').read_text(encoding='utf8')) if START <= t < END]
(HERE/'audio/palavras.json').write_text(json.dumps(words, ensure_ascii=False), encoding='utf8')
(HERE/'s002_palavras.json').write_text(json.dumps(words, ensure_ascii=False), encoding='utf8')
with (ORIGINAL/'tempos.csv').open(encoding='utf8', newline='') as f:
    paragraphs = [r['texto'] for r in csv.DictReader(f) if START <= float(r['inicio']) < END]
(HERE/'narracao.txt').write_text('\n\n'.join(paragraphs)+'\n', encoding='utf8')

def stamp(t):
    ms = round(t*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
blocks=[]
for i in range(0,len(words),4):
    group=words[i:i+4]; stop=words[i+4][1] if i+4<len(words) else END-START
    blocks.append(f'{len(blocks)+1}\n{stamp(group[0][1])} --> {stamp(stop)}\n'+ ' '.join(w for w,t in group)+'\n')
(HERE/'midia/legendas.srt').write_text('\n'.join(blocks),encoding='utf8')

sr=24000; duration=41.82
with wave.open(str(HERE/'audio/ambiente.wav'),'wb') as out:
    out.setparams((1,2,sr,0,'NONE','not compressed'))
    buf=bytearray()
    for n in range(round(sr*duration)):
        t=n/sr
        fade=min(1,t/0.6,max(0,(duration-t)/0.7))
        v=(0.024*math.sin(2*math.pi*55*t)+0.012*math.sin(2*math.pi*82.4*t))*fade
        for at,freq in [(13.95,140),(16.2,680),(27.8,90),(29.6,180)]:
            dt=t-at
            if 0<=dt<0.5:
                v+=0.13*math.exp(-dt*12)*math.sin(2*math.pi*freq*dt)
        if 21.4<t<27.5:
            pulse=t%0.7
            v+=0.025*math.exp(-pulse*30)*math.sin(2*math.pi*(1100-900*pulse)*pulse)
        buf.extend(struct.pack('<h',round(max(-1,min(1,v))*32767)))
    out.writeframes(buf)
print(f'{len(words)} palavras; {END-START:.2f}s de narracao; arquivos preparados.')
