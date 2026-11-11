import fs from 'fs';
import { Proj, video, frame, HERE, clamp, io, out } from './kit.mjs';
import { PAPEL, TINTA, TURQ, AMBAR, CINZA, VERM, AZUL, AMAR, BRANCO, ent, sai, vis, lerp, raw, fundo, txt, g, cartao, barraH, ICON } from './mg.mjs';

const V = `${HERE}/../../videos/007_por_que_algumas_pessoas_tem_mais_sorte`;
const ts = s => { const [m, x] = s.split(':'); return +m * 60 + +x; };
const SB = Object.fromEntries(fs.readFileSync(`${V}/storyboard.md`, 'utf8').split('\n').filter(l => /^\| \d+ \|/.test(l))
  .map(l => { const c = l.split('|').map(s => s.trim()); return ['M' + c[1].padStart(3, '0'), c[2].split('–').map(ts)]; }));
const PAL = JSON.parse(fs.readFileSync(`${V}/audio/palavras.json`, 'utf8'));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const pw = (frag, perto) => { const f = norm(frag); let m = null;
  for (const [w, t] of PAL) if (norm(w).startsWith(f) && Math.abs(t - perto) < 2 && (m == null || Math.abs(t - perto) < Math.abs(m - perto))) m = t;
  if (m == null) { console.warn(`aviso: ${frag} perto de ${perto}`); return perto; } return m; };
const LIMPO = !!process.env.LIMPO;
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const CINZA2 = '#e2ded6', ROSA = '#e98aa0', QUENTE = '#f1e4cf', VERDE = '#5fb07a', ESC = '#4a4d55';
const pico = (t, c, w) => Math.max(0, 1 - Math.abs(t - c) / w);
const sw = t => Math.sin(t / 3.2 * Math.PI * 2);

const folha = `<path d="M0 0C-10 -20 -46 -30 -46 -56C-46 -78 -18 -84 0 -62C18 -84 46 -78 46 -56C46 -30 10 -20 0 0Z" fill="${VERDE}" ${S6}/>`;
const I = {
  trevo: `<path d="M4 20q18 40 -4 84" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/>` + [0, 90, 180, 270].map(r => `<g transform="rotate(${r})">${folha}</g>`).join('') + `<circle r="10" fill="#4c9a66"/>`,
  raio: `<path d="M14 -80L-40 10H0L-14 80L40 -10H0Z" fill="${AMAR}" ${S6}/>`,
  coracao: `<path d="M0 60L-60 0q-30 -34 0 -58q30 -20 60 12q30 -32 60 -12q30 24 0 58z" fill="${VERM}" ${S6}/>`,
  balao: `<path d="M-50 -34h100q20 0 20 20v40q0 20 -20 20h-60l-24 22v-22h-16q-20 0 -20 -20v-40q0 -20 20 -20z" fill="${BRANCO}" ${S6}/>`,
  baloes: `<path d="M-80 -50h80q16 0 16 16v34q0 16 -16 16h-50l-20 18v-18h-10q-16 0 -16 -16v-34q0 -16 16 -16z" fill="${BRANCO}" ${S6}/><path d="M10 -6h70q16 0 16 16v30q0 16 -16 16h-6v16l-18 -16h-46q-16 0 -16 -16v-30q0 -16 16 -16z" fill="${AZUL}" ${S6}/>`,
  relogio: `<circle r="80" fill="${BRANCO}" ${S6}/><path d="M0 -50V0L36 22" fill="none" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/>`,
  aviao: `<path d="M-90 0L70 -10q30 0 30 10t-30 10L-90 0z" fill="${BRANCO}" ${S6}/><path d="M0 -6L-40 -70h24L40 -6zM0 6L-40 70h24L40 6z" fill="${AZUL}" ${S6}/>`,
  lupa: `<circle cx="-14" cy="-14" r="56" fill="#cfe3f0" opacity=".55" ${S6}/><path d="M28 28l50 50" stroke="${TINTA}" stroke-width="22" stroke-linecap="round"/>`,
  estrela: `<path d="M0 -70L18 -22L70 -20L28 10L44 62L0 32L-44 62L-28 10L-70 -20L-18 -22Z" fill="${AMAR}" ${S6}/>`,
  moeda: `<circle r="40" fill="${AMAR}" ${S6}/><circle r="26" fill="none" stroke="${AMBAR}" stroke-width="6"/>`,
  lampada: `<path d="M-22 40v-14q-34 -20 -34 -54a56 56 0 1 1 112 0q0 34 -34 54v14z" fill="${AMAR}" ${S6}/><rect x="-24" y="40" width="48" height="26" rx="6" fill="${CINZA}" ${S6}/>`,
  envelope: `<rect x="-80" y="-52" width="160" height="104" rx="8" fill="${BRANCO}" ${S6}/><path d="M-80 -52L0 10L80 -52" fill="none" ${S6}/>`,
  trofeu: `<path d="M-44 -60h88v30q0 46 -44 56q-44 -10 -44 -56z" fill="${AMAR}" ${S6}/><path d="M-44 -46h-24q0 40 30 46M44 -46h24q0 40 -30 46" fill="none" ${S6}/><path d="M-10 26h20v24h-20z" fill="${AMBAR}" ${S6}/><rect x="-36" y="50" width="72" height="20" rx="4" fill="${AMBAR}" ${S6}/>`,
  chaves: `<circle cx="-30" cy="-40" r="34" fill="none" stroke="${AMBAR}" stroke-width="12"/><path d="M-10 -14l60 70M-30 -6v90" stroke="${CINZA}" stroke-width="18" stroke-linecap="round"/><path d="M40 44l14 -10M50 56l12 -10M-30 60h16M-30 76h12" stroke="${CINZA}" stroke-width="10"/><circle cx="-30" cy="-40" r="34" fill="none" ${S6}/>`,
  microfone: `<rect x="-34" y="-110" width="68" height="120" rx="34" fill="#3b3e44" ${S6}/><path d="M-34 -70h68M-34 -44h68" stroke="#6b707a" stroke-width="6"/><path d="M-56 -30q0 70 56 70q56 0 56 -70M0 40v50M-40 90h80" fill="none" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/>`,
  pegada: `<ellipse cx="0" cy="10" rx="30" ry="46" fill="${TINTA}"/>` + [[-24, -48, 9], [-8, -56, 10], [8, -56, 10], [24, -48, 9], [34, -32, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${TINTA}"/>`).join(''),
  medalha: `<path d="M-30 -90l20 50h20l20 -50" fill="${VERM}" ${S6}/><circle cy="0" r="44" fill="${AMAR}" ${S6}/><path d="M0 -20L6 -6h14l-11 9l4 14l-13 -8l-13 8l4 -14l-11 -9h14z" fill="${AMBAR}"/>`,
  notebook: `<rect x="-130" y="-90" width="260" height="170" rx="12" fill="#3b3e44" ${S6}/><rect x="-112" y="-74" width="224" height="138" rx="4" fill="#22252b"/><path d="M-160 80h320l-20 26h-280z" fill="${CINZA}" ${S6}/>`,
  cronometro: `<rect x="-18" y="-120" width="36" height="24" rx="6" fill="${CINZA}" ${S6}/><path d="M60 -80l16 -16" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/><circle r="96" fill="${BRANCO}" ${S6}/>`,
  aula: `<rect x="-90" y="-60" width="180" height="110" rx="6" fill="#2f5d50" ${S6}/><path d="M-60 -24h80M-60 4h120" stroke="${BRANCO}" stroke-width="8" stroke-linecap="round"/><path d="M-40 50v30M40 50v30" stroke="${TINTA}" stroke-width="10"/>`,
  capelo: ICON.capelo, haltere: ICON.haltere, cofrinho: ICON.cofrinho, cracha: ICON.cracha, like: ICON.like, sino: ICON.sino, check: ICON.check, livro: ICON.livro,
  psico: `<circle cy="-50" r="34" fill="${AMBAR}" ${S6}/><path d="M-60 60q0 -70 60 -70q60 0 60 70z" fill="${TURQ}" ${S6}/><rect x="10" y="0" width="56" height="70" rx="6" fill="${BRANCO}" ${S6}/><path d="M22 20h32M22 36h32M22 52h20" stroke="${CINZA}" stroke-width="5"/>`,
  mao: `<path d="M-30 70V-10q0 -14 12 -14t12 14V-40q0 -14 12 -14t12 14v20q0 -12 12 -12t12 12v84z" fill="#d8d8d8" ${S6}/>`,
  cursor: `<path d="M0 0L0 64L16 48L28 76L40 70L28 44L50 44Z" fill="${BRANCO}" ${S6}/>`,
  codigo: `<rect x="-112" y="-74" width="224" height="138" fill="#22252b"/>`,
};
const ic = (n, x, y, s = 1, o = {}) => g(I[n], { x, y, s, ...o });
const pop = (body, t, t0, o = {}) => LIMPO ? '' : pop0(body, t, t0, o);
const pop0 = (body, t, t0, { x = 0, y = 0, s = 1, r = 0, dy = 36, t1, d = .55 } = {}) => { const k = t1 != null ? Math.min(ent(t, t0, d), sai(t, t1)) : ent(t, t0, d);
  return g(body, { x, y: y + (1 - k) * dy, s: s * (.9 + .1 * k), r, op: k }); };
const risca = (x0, x1, y, k, cor = VERM) => k <= 0 ? '' : `<path d="M${x0} ${y}L${x0 + (x1 - x0) * k} ${y}" stroke="${cor}" stroke-width="16" stroke-linecap="round"/>`;
const sub = (x0, x1, y, k, cor = AMBAR) => k <= 0 ? '' : `<path d="M${x0} ${y}L${x0 + (x1 - x0) * k} ${y}" stroke="${cor}" stroke-width="10" stroke-linecap="round"/>`;
const pessoa = (cor, x, y, s = 1, op = 1, r = 0) => g(`<circle cy="-34" r="22" fill="${cor}" ${S6}/><path d="M-34 40q0 -54 34 -54q34 0 34 54z" fill="${cor}" ${S6}/>`, { x, y, s, op, r });
const leg = (s, t, t0, o) => LIMPO ? '' : leg0(s, t, t0, o);
const leg0 = (s, t, t0, { x = 960, y = 860, tam = 54, cor = TINTA, peso = 700 } = {}) => { const k = ent(t, t0); return g(txt(s, 0, 0, { tam, cor, peso }), { x, y: y + (1 - k) * 20, op: k }); };
const selo = (s, t, t0, t1 = 99) => { if (LIMPO) return ''; const k = Math.min(ent(t, t0, .5), sai(t, t1)), w = s.length * 21 + 70;
  return g(`<rect x="0" y="-34" width="${w}" height="68" rx="34" fill="${BRANCO}" ${S6}/><circle cx="34" cy="0" r="10" fill="${AMBAR}"/>` + txt(s, 56, 13, { tam: 36, peso: 600, anc: 'start' }), { x: 60 - (1 - k) * 40, y: 90, op: k }); };
const SEELIG = 'Tina Seelig · Mel Robbins Podcast, ep. 388', WISE = 'Richard Wiseman · The Luck Factor, 2003';
const trad = (x, y, op = 1) => LIMPO ? '' : g(`<rect x="-80" y="-22" width="160" height="44" rx="22" fill="${CINZA2}"/>` + txt('tradução', 0, 11, { tam: 28, peso: 600, cor: '#666' }), { x, y, op });
const cena = (bg, f) => a => [fundo(bg), raw('cena', t => f(t, (frag, rel) => pw(frag, a + rel) - a))];

const veleiro = (k = 1, cor = BRANCO) => `<path d="M-120 20h240l-40 60h-160z" fill="#8a5e3c" ${S6}/><path d="M0 20V-170" stroke="${TINTA}" stroke-width="10"/>` +
  (k > .01 ? `<path d="M8 ${10 - 170 * k}Q${8 + 120 * k} ${-60 * k} 8 10z" fill="${cor}" ${S6}/>` : '');
const livro = (abre, capa, cor, giro = 1) => { const sx = Math.max(.02, Math.sin(Math.PI / 2 * giro)), ca = 1 - 2 * abre, cs = ca < 0 ? Math.min(-.02, ca) : Math.max(.02, ca);
  return `<g transform="scale(${sx} 1) translate(-170 0)"><rect x="0" y="-230" width="340" height="460" rx="8" fill="${BRANCO}" ${S6}/><path d="M30 -170h270M30 -130h270M30 -90h220M30 -40h270M30 0h240M30 40h270" stroke="${CINZA2}" stroke-width="10"/>` +
    `<g transform="scale(${cs} 1)"><rect x="0" y="-230" width="340" height="460" rx="8" fill="${cor}" ${S6}/><rect x="0" y="-230" width="34" height="460" fill="#000" opacity=".15"/>${ca > 0 ? capa : ''}</g></g>`; };

const FAT = [['físico', 'haltere', VERM], ['emocional', 'coracao', ROSA], ['social', 'baloes', AZUL], ['financeiro', 'moeda', AMBAR], ['intelectual', 'lampada', TURQ]];
const pt = (r, a) => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)];
const fatia = (R, i, fill, extra = '') => { const a0 = -126 + 72 * i, [x1, y1] = pt(R, a0), [x2, y2] = pt(R, a0 + 72);
  return `<path d="M0 0L${x1} ${y1}A${R} ${R} 0 0 1 ${x2} ${y2}Z" fill="${fill}" ${extra}/>`; };
const risco = ({ R = 280, nivel = [0, 0, 0, 0, 0], on = [1, 1, 1, 1, 1], icones = [0, 0, 0, 0, 0], rotulo = 1, ponteiro = null, alerta = -1, t = 0 }) => {
  let s = `<circle r="${R + 12}" fill="#000" opacity=".1" transform="translate(8 12)"/><circle r="${R}" fill="${BRANCO}" ${S6}/>`;
  FAT.forEach(([n, ic0, c], i) => { if (on[i] > 0 && nivel[i] > 0) s += g(fatia(R * nivel[i] / 10, i, c), { op: on[i] }); });
  if (alerta >= 0) s += g(fatia(R, alerta, VERM), { op: .25 + .25 * Math.sin(t * 9) });
  for (let k = 2; k <= 8; k += 2) s += `<circle r="${R * k / 10}" fill="none" stroke="${CINZA}" stroke-width="2" stroke-dasharray="6 8"/>`;
  FAT.forEach((f, i) => { const [x, y] = pt(R, -126 + 72 * i); s += `<path d="M0 0L${x} ${y}" stroke="${TINTA}" stroke-width="5"/>`; });
  s += `<circle r="${R}" fill="none" ${S6}/>`;
  FAT.forEach(([n, ico], i) => { const k = icones[i]; if (k <= 0) return; const [x, y] = pt(R + 92, -90 + 72 * i);
    s += g(g(I[ico], { s: .62 }) + (rotulo ? txt(n, 0, y > 40 ? 82 : -66, { tam: 34 }) : ''), { x, y: y + (1 - k) * 20, op: k, s: .9 + .1 * k + (alerta === i ? .05 * Math.sin(t * 9) : 0) }); });
  if (ponteiro != null) { const [x, y] = pt(R * .9, ponteiro - 90); s += `<path d="M0 0L${x} ${y}" stroke="${VERM}" stroke-width="12" stroke-linecap="round"/>`; }
  return s + `<circle r="16" fill="${TINTA}"/>`;
};

const PTS = [[360, ['voo bem cedo'], 'aviao'], [760, ['manteve', 'contato'], 'envelope'], [1160, ['aula de criatividade', 'Stanford'], 'aula'], [1560, ['1–2 anos', 'depois'], 'relogio']];
const linha = ({ prog = 1, on = [1, 1, 1, 0], y = 560, dim = 0 }) => {
  const xe = lerp(200, 1720, prog);
  let s = `<path d="M200 ${y}H1720" stroke="${CINZA2}" stroke-width="14" stroke-linecap="round"/><path d="M200 ${y}H${xe}" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>`;
  PTS.forEach(([x, l, ico], i) => { const k = on[i]; if (k <= 0) return;
    s += g(`<circle r="26" fill="${AMBAR}" ${S6}/>` + g(I[ico], { y: -150, s: .75 }) + l.map((q, j) => txt(q, 0, 90 + j * 44, { tam: 38, cor: dim ? '#777' : TINTA })).join(''), { x, y: y + (1 - k) * 20, op: k * (dim ? .55 : 1) }); });
  return s;
};

const portas = (abre, luz = 1) => [[300, 1], [640, .8], [910, .64], [1130, .52], [1310, .42]].map(([x, s], i) => {
  const k = abre[i] || 0, y = 800 - (1 - s) * 360;
  return g(`<rect x="-110" y="-320" width="220" height="320" fill="${AMAR}" opacity="${.25 + .75 * k * luz}"/><rect x="-110" y="-320" width="220" height="320" fill="none" ${S6}/>` +
    `<g transform="translate(-110 0) scale(${1 - .82 * k} 1)"><rect x="0" y="-320" width="220" height="320" fill="#8a5e3c" ${S6}/><circle cx="190" cy="-150" r="10" fill="${AMAR}" ${S6}/></g>`, { x, y, s });
}).reverse().join('');

const C = {
  M003: cena(PAPEL, (t, W) => { const kb = clamp((t - .3) / (W('certo', 1) - .3)), kc = ent(t, W('primeira', 1.6) - .1, .4);
    return g(cartao(980, 400) + `<rect x="-430" y="-150" width="90" height="90" rx="16" fill="${AZUL}" ${S6}/>` + txt('projeto', -310, -88, { tam: 60, anc: 'start' }) +
      `<path d="M-430 -10h520M-430 30h380" stroke="${CINZA2}" stroke-width="16" stroke-linecap="round"/>` + g(barraH(860, 50, kb, TURQ), { x: -430, y: 120 }) +
      g(I.check, { x: 400, y: -110, s: .9 + .1 * kc + .08 * pico(t, W('primeira', 1.6) + .3, .25), op: kc }), { x: 960, y: 500 + (1 - ent(t, 0)) * 40, op: ent(t, 0) }); }),

  M005: cena(PAPEL, (t, W) => { const kf = io(clamp((t - W('notícia', 1.9)) / .6)), kd = W('dá', 3.5), ka = io(clamp((t - kd + .2) / .7));
    const frase = g(cartao(1300, 220) + txt('“o acaso favorece a mente preparada”', 0, 20, { tam: 58, peso: 600 }), { x: 960, y: 500, s: 1 - .4 * kf, op: 1 - kf }) ;
    const caixa = kf > .3 ? g(`<rect x="-200" y="-150" width="400" height="260" rx="14" fill="${TURQ}" ${S6}/><path d="M-30 -150v260M30 -150v260" stroke="${AMAR}" stroke-width="24"/>` +
      g(`<rect x="-224" y="-60" width="448" height="70" rx="12" fill="#5bb894" ${S6}/><rect x="-30" y="-60" width="60" height="70" fill="${AMAR}"/><path d="M0 -60q-80 -70 -100 -20q10 30 100 20q80 -70 100 -20q-10 30 -100 20" fill="${AMAR}" ${S6}/>`, { y: -150 + 150 * ka, r: 25 * ka, x: 400 * ka }), { x: 960, y: 640 + (1 - ent(t, W('notícia', 1.9) + .2)) * 50, s: .9 + .1 * ent(t, W('notícia', 1.9) + .2), op: ent(t, W('notícia', 1.9) + .2) }) : '';
    return (kf < 1 ? frase : '') + caixa + (ka > 0 ? g(txt('dá para se preparar', 0, 0, { tam: 76 }) + txt('para a sorte', 0, 90, { tam: 76, cor: TURQ }), { x: 960, y: 200 + (1 - ka) * 120, op: ka }) +
      pop(I.trevo, t, W('sorte', 5.1) - .15, { x: 1500, y: 300, s: 1.1, r: 6 * sw(t) }) : ''); }),

  M006: cena(PAPEL, (t, W) => { const k1 = ent(t, W('acaso', 2.1) - .15), k2 = ent(t, W('sorte', 3) - .15, .35), ang = 6 * k1 - 6 * k2;
    const prato = (x, l, k, cor) => { const [px, py] = [x * Math.cos(ang * Math.PI / 180), x * Math.sin(ang * Math.PI / 180)];
      return `<path d="M${px} ${py}L${px - 120} ${py + 160}M${px} ${py}L${px + 120} ${py + 160}" stroke="${TINTA}" stroke-width="5"/><path d="M${px - 160} ${py + 160}h320q-20 60 -160 60q-140 0 -160 -60z" fill="${CINZA2}" ${S6}/>` +
        g(`<rect x="-150" y="-62" width="300" height="88" rx="44" fill="${BRANCO}" ${S6}/>` + txt(l, 0, 6, { tam: 72, cor }), { x: px, y: py + 290 - (1 - k) * 40, s: .9 + .1 * k, op: k }); };
    return g(`<path d="M-120 380h240l-40 -40h-160z" fill="#8a5e3c" ${S6}/><path d="M0 340V0" stroke="${TINTA}" stroke-width="16"/><g transform="rotate(${ang})"><path d="M-460 0H460" stroke="${TINTA}" stroke-width="16" stroke-linecap="round"/></g><circle r="22" fill="${AMBAR}" ${S6}/>` +
      prato(-460, 'acaso', k1, AZUL) + prato(460, 'sorte', k2, '#2f7a5f'), { x: 960, y: 300 + (1 - ent(t, 0)) * 30, op: ent(t, 0) }); }),

  M007: cena(PAPEL, (t, W) => { const kv = W('enxergam', .9), kp = W('deixam', 2.2), kw = W('fazer', 3.8), ks = W('semana', 5.2), sx = io(clamp((t - kw + .3) / .6));
    let s = '';
    if (sx < 1) { const kb = io(clamp((t - kp) / 1.2)), brilho = ent(t, kv - .1, .4);
      let pg = cartao(760, 700, { r: 8 }) + [[-320, -300, 300, 160], [20, -300, 300, 70], [20, -200, 300, 70], [-320, -110, 640, 30], [-320, -60, 640, 30], [-320, -10, 420, 30], [-320, 60, 300, 200], [20, 60, 300, 200]]
        .map(([x, y, w, h], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${i === 5 ? (brilho > 0 ? AMAR : CINZA2) : CINZA2}"/>`).join('') +
        (brilho > 0 ? `<rect x="-332" y="-22" width="444" height="54" rx="10" fill="none" stroke="${AMBAR}" stroke-width="${6 + 4 * Math.sin(t * 8)}" opacity="${brilho}"/>` : '');
      s += g(pg, { x: 760, y: 470 + (1 - ent(t, 0)) * 40, op: ent(t, 0) }) + g(I.lupa, { x: lerp(1100, 660, io(clamp((t - .2) / .8))), y: lerp(300, 470, io(clamp((t - .2) / .8))), s: 2.4, op: ent(t, .2) });
      for (let i = 0; i < 3; i++) s += pessoa([AZUL, AMBAR, CINZA][i], lerp(300 - i * 160, 1800 - i * 160, kb), 820 - 8 * Math.abs(Math.sin((t * 6 + i) * 1.6)), 1, kb > 0 && kb < 1 ? 1 : 0);
      s = g(s, { x: -1920 * sx });
    }
    if (sx > 0) { let w = '';
      ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].forEach((d, i) => { const k = ent(t, kw - .1 + i * .08, .4);
        w += g(`<rect x="-90" y="-90" width="180" height="180" rx="18" fill="${i === 2 && t > ks ? '#dff1e6' : BRANCO}" ${S6}/>` + txt(d, 0, -110, { tam: 38, cor: '#666' }), { x: 300 + i * 220, y: 520 + (1 - k) * 30, op: k }); });
      const kc = ent(t, ks - .1, .4); w += g(I.check, { x: 300 + 2 * 220, y: 520, s: .9 + .1 * kc, op: kc }) + leg('nesta semana', t, W('nesta', 4.8) - .1, { y: 760, tam: 60 });
      s += g(w, { x: 1920 * (1 - sx) }); }
    return s; }),

  M008: cena(PAPEL, (t, W) => { const k = ent(t, 0);
    return g(cartao(1240, 440) + `<circle cx="-430" cy="0" r="150" fill="${CINZA2}" ${S6}/><g transform="translate(-430 0)"><path d="M-100 140q0 -110 100 -110q100 0 100 110z" fill="${ESC}"/><path d="M-62 -40q0 -80 62 -80q62 0 62 80v40q-20 -36 -62 -40q-42 4 -62 40z" fill="${ESC}"/><circle cy="-40" r="52" fill="${ESC}"/></g>` +
      txt('Tina Seelig', -230, -70, { tam: 84, anc: 'start' }) + g(txt('Stanford', 0, 0, { tam: 54, anc: 'start', cor: VERM }), { x: -230, y: 20, op: ent(t, W('Stanford', 2) - .1, .4) }) +
      g(txt('pesquisa a sorte', 0, 0, { tam: 54, anc: 'start', cor: '#555' }) + g(I.trevo, { x: 470, y: -20, s: .45 }), { x: -230, y: 110, op: ent(t, W('estuda', 2.9) - .1, .4) }), { x: 960, y: 500 + (1 - k) * 40, op: k }) +
      selo(SEELIG, t, .5); }),

  M009: cena(PAPEL, (t, W) => { const k1 = ent(t, W('acaso', .3) - .15), k2 = ent(t, W('sorte', 3) - .15);
    const card = (x, k, ilu, l1, l2) => g(cartao(760, 620) + ilu + txt(l1, 0, 150, { tam: 50 }) + txt(l2, 0, 214, { tam: 50 }) + trad(260, -260), { x, y: 480 + (1 - k) * 40, op: k });
    const raio = pessoa(CINZA, 0, -20, 2) + g(I.raio, { x: 60, y: -170 - 30 * (1 - ent(t, W('acontece', 1.3), .3)), s: .9, op: ent(t, W('acontece', 1.3) - .1, .3) });
    const leme = g(`<circle r="110" fill="none" stroke="#8a5e3c" stroke-width="22"/>` + [0, 45, 90, 135].map(r => `<path d="M${-150 * Math.cos(r * Math.PI / 180)} ${-150 * Math.sin(r * Math.PI / 180)}L${150 * Math.cos(r * Math.PI / 180)} ${150 * Math.sin(r * Math.PI / 180)}" stroke="#8a5e3c" stroke-width="16" stroke-linecap="round"/>`).join('') + `<circle r="30" fill="${AMBAR}" ${S6}/>`, { y: -80, r: -20 * io(clamp((t - W('controla', 4.4)) / 1)) }) +
      g(I.mao, { x: 70, y: -140, s: 1.1, r: 30, op: ent(t, W('controla', 4.4) - .3, .4) });
    return card(520, k1, raio, 'acaso é o que', 'acontece com você') + card(1400, k2, leme, 'sorte é o que', 'você controla') + leg('— Tina Seelig', t, .4, { y: 880, tam: 40, cor: '#666', peso: 600 }); }),

  M091: cena(QUENTE, (t, W) => { const k1 = ent(t, W('Acaso', 0) - .1), k2 = ent(t, W('sorte', 2.4) - .15);
    const card = (x, k, ilu, l1, l2) => g(cartao(760, 620) + ilu + txt(l1, 0, 150, { tam: 50 }) + txt(l2, 0, 214, { tam: 50 }) + trad(260, -260), { x, y: 480 + (1 - k) * 40, op: k });
    return card(520, k1, pessoa(VERM, 0, -20, 2) + g(I.aviao, { x: 30, y: -190, s: .7, op: ent(t, W('aconteceu', .9) - .1, .4) }), 'acaso é o que', 'aconteceu com ela') +
      card(1400, k2, g(veleiro(clamp((t - W('fez', 3.8) + .3) / .8)), { y: 10, s: .8 }), 'sorte é o que', 'ela fez com isso') + leg('— Tina Seelig', t, .4, { y: 880, tam: 40, cor: '#666', peso: 600 }); }),
  M010: cena(PAPEL, (t, W) => { const kc = W('confundir', 1.2), m = io(clamp((t - kc) / .9)), sh = Math.sin(clamp((t - kc) / .9) * Math.PI * 3) * 140 * (1 - m), kx = ent(t, W('dois', 2) + .1, .3);
    const card = (x, cor, l) => g(cartao(560, 380, { fill: cor }) + txt(l, 0, 26, { tam: 84, cor: BRANCO }), { x, y: 480 });
    return card(lerp(560, 960, m) + sh, AZUL, 'acaso') + card(lerp(1360, 960, m) - sh, TURQ, 'sorte') +
      (m > .95 ? g(cartao(560, 380, { fill: '#7b9aa6' }) + txt('acaso = sorte?', 0, 22, { tam: 64, cor: BRANCO }), { x: 960, y: 480 }) : '') +
      g(`<circle r="110" fill="${BRANCO}" ${S6}/><path d="M-50 -50L50 50M50 -50L-50 50" stroke="${VERM}" stroke-width="30" stroke-linecap="round"/>`, { x: 1250, y: 300, s: 1.2 - .2 * kx, op: kx }); }),

  M013: cena(PAPEL, (t, W) => { const k = ent(t, 0);
    return g(cartao(1240, 440) + `<circle cx="-430" cy="0" r="150" fill="${CINZA2}" ${S6}/><g transform="translate(-430 0)"><path d="M-100 140q0 -110 100 -110q100 0 100 110z" fill="${ESC}"/><circle cy="-40" r="58" fill="${ESC}"/></g>` +
      g(txt('Richard Wiseman', 0, 0, { tam: 80, anc: 'start' }), { x: -230, y: -70, op: ent(t, W('Richard', .7) - .1, .4) }) + txt('psicólogo', -230, 20, { tam: 54, anc: 'start', cor: VERM }) +
      g(txt('Universidade de Hertfordshire', 0, 0, { tam: 48, anc: 'start', cor: '#555' }), { x: -230, y: 110, op: ent(t, W('Universidade', 2) - .1, .4) }), { x: 960, y: 500 + (1 - k) * 40, op: k }) +
      selo(WISE, t, .3); }),

  M014: cena(PAPEL, (t, W) => { const k4 = W('quatrocentas', 1), ks = W('sortudas', 3.3), ka = W('azaradas', 4.5), ms = io(clamp((t - ks + .2) / .7)), ma = io(clamp((t - ka + .2) / .7));
    let s = '';
    for (let i = 0; i < 400; i++) { const c = i % 25, r = Math.floor(i / 25), esq = c < 12 || (c === 12 && r < 8), ap = ent(t, .1 + (i / 400) * (k4 + .5), .3);
      if (ap <= 0) continue; const x = 470 + c * 40 + (esq ? -130 * ms : 130 * ma), y = 290 + r * 30;
      const cor = esq ? (ms > .5 ? VERDE : '#8d8b86') : (ma > .5 ? '#6f8197' : '#8d8b86');
      s += `<g opacity="${ap}"><circle cx="${x}" cy="${y - 9}" r="6" fill="${cor}"/><rect x="${x - 9}" y="${y - 2}" width="18" height="16" rx="7" fill="${cor}"/></g>`; }
    const nuvemC = `<g fill="#8d97a3" ${S6}><circle cx="-50" r="44"/><circle cx="10" cy="-24" r="56"/><circle cx="70" r="40"/></g><rect x="-80" y="0" width="190" height="40" fill="#8d97a3"/>` + [-50, 0, 50].map((x, j) => `<path d="M${x} ${60 + ((t * 120 + j * 30) % 60)}l-8 20" stroke="${AZUL}" stroke-width="8" stroke-linecap="round"/>`).join('');
    return s + txt('~400 pessoas', 960, 220, { tam: 64, op: ent(t, k4 - .1) }) +
      pop(I.trevo, t, ks - .1, { x: 590, y: 180, s: .8 }) + pop(txt('sortudas', 0, 0, { tam: 56, cor: '#3d8a59' }), t, ks, { x: 580, y: 830 }) +
      pop(nuvemC, t, ka - .1, { x: 1330, y: 160, s: .8 }) + pop(txt('azaradas', 0, 0, { tam: 56, cor: '#566a80' }), t, ka, { x: 1340, y: 830 }); }),

  M015: cena(PAPEL, (t, W) => { const kg = io(clamp((t - W('The', 1.5) + .4) / .9)), kab = io(clamp((t - W('dois', 3.3) - .4) / .8));
    const capa = txt('THE LUCK', 170, -80, { tam: 54, cor: BRANCO }) + txt('FACTOR', 170, -20, { tam: 54, cor: BRANCO }) + g(I.trevo, { x: 170, y: 90, s: .7 }) + txt('Richard Wiseman', 170, 200, { tam: 26, peso: 600, cor: BRANCO });
    return (kg > 0 ? g(livro(kab, capa, '#2f6e57', kg), { x: 960 - 170 * kab, y: 470, op: ent(t, W('The', 1.5) - .4, .3) }) : '') +
      leg('The Luck Factor · 2003', t, W('dois', 3.3) - .1, { y: 840, tam: 60 }) + selo(WISE, t, .3); }),

  M017: cena(PAPEL, (t, W) => { const ka = W('azarados', .1), km = W('minutos', 2.4), ks = W('sortudos', 3.5), kg = W('segundos', 5);
    const fa = clamp((t - ka) / (km - ka + .3)), fs2 = clamp((t - ks) / .4) * .06;
    return g(txt('azarados', 0, 0, { tam: 52, anc: 'end' }), { x: 380, y: 368, op: ent(t, ka - .1) }) + g(barraH(980, 80, fa, '#6f8197'), { x: 420, y: 350, op: ent(t, ka - .1) }) +
      g(`<circle r="80" fill="${BRANCO}" ${S6}/><path d="M0 0L${50 * Math.sin(fa * Math.PI * 2)} ${-50 * Math.cos(fa * Math.PI * 2)}" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/><circle r="8" fill="${TINTA}"/>`, { x: 1530, y: 350, op: ent(t, ka) }) +
      pop(txt('~2 min', 0, 0, { tam: 150, cor: '#566a80' }), t, km - .15, { x: 1000, y: 230 }) +
      g(txt('sortudos', 0, 0, { tam: 52, anc: 'end' }), { x: 380, y: 668, op: ent(t, ks - .1) }) + g(barraH(980, 80, fs2, TURQ), { x: 420, y: 650, op: ent(t, ks - .1) }) +
      pop(txt('segundos', 0, 0, { tam: 150, cor: TURQ }), t, kg - .15, { x: 1000, y: 820 }); }),

  M018: cena(PAPEL, (t, W) => { const kr = W('rápido', 2.4), a = (t * 360 / 1.2);
    return g(I.cronometro + `<path d="M0 0L${70 * Math.sin(a * Math.PI / 180)} ${-70 * Math.cos(a * Math.PI / 180)}" stroke="${VERM}" stroke-width="10" stroke-linecap="round"/><circle r="10" fill="${TINTA}"/>`, { x: 480, y: 500, s: 1.8, op: ent(t, 0) }) +
      g(txt('não', 0, -150, { tam: 110, anc: 'start', cor: VERM, op: ent(t, W('não', .1) - .1, .4) }), { x: 860, y: 450 }) +
      g(txt('contavam', 0, 0, { tam: 100, anc: 'start' }) + txt('mais rápido', 0, 120, { tam: 100, anc: 'start' }) + risca(-10, 560, 88, clamp((t - kr - .3) / .35)), { x: 860, y: 450 + (1 - ent(t, W('contavam', 1.5) - .1)) * 30, op: ent(t, W('contavam', 1.5) - .1) }); }),

  M024: cena(PAPEL, (t, W) => { const kr = W('relaxados', 2.2), kb = W('abertos', 3.3);
    const cone = (x, ab, k, cor) => { const [x1, y1] = pt(480, -90 - ab), [x2, y2] = pt(480, -90 + ab); return `<path d="M${x} 600L${x + x1 * k} ${600 + y1 * k}A${480 * k} ${480 * k} 0 0 1 ${x + x2 * k} ${600 + y2 * k}Z" fill="${cor}" opacity=".45"/>`; };
    const k1 = io(clamp((t - kr + .2) / .8)), k2 = io(clamp((t - kb + .2) / .8));
    return (k1 > 0 ? cone(560, 50, k1, AMAR) + [[-200, -360, 'estrela'], [120, -420, 'moeda'], [260, -260, 'trevo']].map(([dx, dy, n], i) => pop(I[n], t, kr + .5 + i * .1, { x: 560 + dx, y: 600 + dy, s: .55 })).join('') : '') +
      (k2 > 0 ? cone(1360, 9, k2, '#aeb6c0') : '') +
      pessoa(TURQ, 560, 660, 2.2, ent(t, 0)) + pessoa('#8d8b86', 1360, 660, 2.2, ent(t, .1)) +
      g(`<path d="M-30 -110q8 -14 12 0q-4 10 -12 0z" fill="${AZUL}"/><path d="M-30 -60h60" stroke="${TINTA}" stroke-width="6"/>`, { x: 1360, y: 600, op: ent(t, kb) }) +
      leg('relaxado', t, kr, { x: 560, y: 840 }) + leg('tenso', t, kb, { x: 1360, y: 840 }) + selo(WISE, t, .3); }),

  M027: cena(PAPEL, (t, W) => { const kl = W('like', .4), ki = W('inscreve', 1.1), kv = W('vídeo', 3.1), kf = W('fotos', 5.8), out1 = io(clamp((t - 2.5) / .5));
    const curX = t < kl ? lerp(1300, 760, io(clamp(t / kl))) : t < ki ? lerp(760, 1180, io(clamp((t - kl) / (ki - kl)))) : lerp(1180, 1500, io(clamp((t - ki - .2) / .6)));
    const curY = t < kl ? lerp(800, 520, io(clamp(t / kl))) : 520;
    const like = t > kl, ins = t > ki;
    let s = g(`<rect x="-200" y="-70" width="400" height="140" rx="70" fill="${like ? AZUL : BRANCO}" ${S6}/>` + g(I.like, { x: -110, s: .7 }) + txt('Gostei', 40, 20, { tam: 52, cor: like ? BRANCO : TINTA }), { x: 700, y: 520, s: 1 - .06 * pico(t, kl + .05, .15) }) +
      g(`<rect x="-220" y="-70" width="440" height="140" rx="70" fill="${ins ? CINZA2 : VERM}" ${S6}/>` + txt(ins ? 'Inscrito' : 'Inscrever', 0, 20, { tam: 52, cor: ins ? TINTA : BRANCO }), { x: 1220, y: 520, s: 1 - .06 * pico(t, ki + .05, .15) }) +
      g(I.cursor, { x: curX, y: curY });
    s = g(s, { y: -700 * out1, op: 1 - out1 });
    const km = ent(t, kv - .2, .6), lev = io(clamp((t - kf + .5) / .5));
    let mini = cartao(1100, 620, { fill: '#2a2d33' });
    for (let i = 0; i < 5; i++) { const x = -400 + i * 200, up = i === 2 ? lev : 0;
      mini += `<rect x="${x - 50}" y="80" width="100" height="70" rx="6" fill="${BRANCO}" ${S6}/>` + pessoa(i === 2 && up > .5 ? AMBAR : CINZA, x, 40 - 40 * up, 1.6, 1, up > 0 ? 0 : 18); }
    mini += g(txt('!', 0, 0, { tam: 120, cor: AMAR }), { y: -180, op: lev }) + `<path d="M-30 -270l60 36l-60 36z" fill="${VERM}" opacity="${.9 * (1 - lev)}"/>`;
    return s + (km > 0 ? g(mini, { x: lerp(1500, 960, km), y: 480, s: .9 + .1 * km, op: km }) : ''); }),

  M029: cena(PAPEL, (t, W) => { const kp = W('prêmio', 1), kc = W('sala', 2.1);
    const salas = [[-560, -280, 380, 260], [-180, -280, 400, 260], [220, -280, 340, 260], [-560, -20, 300, 300], [-260, -20, 480, 300], [220, -20, 340, 300]];
    return g(`<rect x="-580" y="-300" width="1160" height="620" fill="${BRANCO}" stroke="${TINTA}" stroke-width="14"/>` + salas.map(([x, y, w, h], i) => {
      const k = ent(t, kp + i * (kc - kp) / 5 - .1, .35);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${k > .5 ? '#fbeec8' : BRANCO}" stroke="${TINTA}" stroke-width="8"/>` + g(I.trofeu, { x: x + w / 2, y: y + h / 2, s: .7 * (.9 + .1 * k), op: k }); }).join('') +
      `<path d="M-180 120v40M220 60v60" stroke="${BRANCO}" stroke-width="16"/>`, { x: 960, y: 480 + (1 - ent(t, 0)) * 40, op: ent(t, 0) }); }),

  M032: cena(PAPEL, (t, W) => { const ks = W('sorte', 2.6), ka = W('aparentemente', 5.2);
    return g(cartao(1440, 560) + txt('“', -620, -120, { tam: 200, cor: AMBAR }) +
      g(txt('sorte é sucesso ou fracasso', 0, 0, { tam: 74 }) + g(txt('aparentemente', 0, 0, { tam: 74, cor: ka < t ? VERM : TINTA }), { y: 100 }) + txt('causado pelo acaso', 0, 200, { tam: 74 }), { y: -100, op: ent(t, ks - .15) }) +
      sub(-250, 250, 20, clamp((t - ka) / .5), VERM) + trad(560, 220) + txt('— Tina Seelig', -620, 220, { tam: 40, peso: 600, cor: '#666', anc: 'start' }), { x: 960, y: 460 + (1 - ent(t, 0)) * 40, op: ent(t, 0) }) +
      selo(SEELIG, t, W('Seelig', 1.8) - .2); }),

  M033: cena(PAPEL, (t, W) => { const kb = io(clamp((t - W('baixo', .2)) / .9)), its = [['envelope', 'mensagem enviada', W('coisas', 2.3)], ['balao', 'conversa', W('fez', 3.3)], ['capelo', 'matrícula', W('chamar', 4)]];
    return its.map(([n, l, w], i) => pop(g(I[n], { s: 1.1 }) + txt(l, 0, 130, { tam: 44 }), t, w - .2, { x: 520 + i * 440, y: 560 })).join('') +
      g(`<rect x="-760" y="-40" width="1520" height="80" rx="10" fill="${VERM}" ${S6}/><path d="M-720 0h1440" stroke="${AMAR}" stroke-width="8" stroke-dasharray="30 20"/>` + txt('acaso', 0, 22, { tam: 58, cor: BRANCO }) +
        [-1, 1].map(d => `<path d="M${d * 760} -36${Array.from({ length: 6 }, (_, j) => `M${d * 760} ${-30 + j * 12}h${d * 26}`).join('')}" stroke="${TINTA}" stroke-width="5"/>`).join(''),
        { x: 960, y: lerp(720, 220, kb), r: -6 * kb, s: 1 }); }),

  M041: cena(PAPEL, (t, W) => { const kf = clamp((t - W('emprego', 3.3) + .5) / .7), sx = Math.abs(Math.cos(Math.PI * io(kf))), ch = io(kf) > .5;
    return g(I.mao, { x: 960, y: 640, s: 2, r: 0, op: ent(t, 0) }) +
      g(`<g transform="scale(${Math.max(.03, sx)} 1)">` + (ch ? g(I.chaves, { s: 1.3 }) : g(I.cracha, { s: 1.6 }) + txt('emprego', 0, 140, { tam: 40 })) + '</g>', { x: 960, y: 400 + 8 * sw(t), s: 1, op: ent(t, 0) }) +
      pop(txt('emprego', 0, 0, { tam: 64 }), t, W('emprego', 1.6) - .1, { x: 1450, y: 330 }); }),

  M045: cena('#dfe6ea', (t, W) => g(`<path d="M-500 160q250 -60 500 0t500 0v120h-1000z" fill="#d9c79f" ${S6}/><path d="M-700 60q60 -16 120 0t120 0M480 40q60 -16 120 0t120 0" fill="none" stroke="${AZUL}" stroke-width="8" stroke-linecap="round"/>` +
      g(`<path d="M-160 0h320l-70 80h-180z" fill="${BRANCO}" ${S6}/><path d="M-20 0L0 -160L90 0z" fill="${BRANCO}" ${S6}/><path d="M-90 40h180" stroke="${CINZA2}" stroke-width="6"/>`, { x: 0, y: 90, r: 14 + 1.5 * Math.sin(t * 1.8) }), { x: 960, y: 520, op: ent(t, 0) }) +
      leg('por onde começar?', t, W('onde', 1.5) - .15, { y: 230, tam: 90 })),

  M047: cena(PAPEL, (t, W) => { const L = [['1', 'construir', 'o veleiro', W('construir', 2.6), 0], ['2', 'recrutar', 'a tripulação', W('recrutar', 4.1), 1], ['3', 'içar', 'a vela', W('vela', 6.5) - .5, 2]];
    const ilu = i => i === 0 ? g(veleiro(0), { s: .7, y: 30 }) + g(`<path d="M-20 -40l60 -40M30 -90l30 30" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>`, { x: 90, y: -30 }) :
      i === 1 ? pessoa(AZUL, -60, 0, 1.3) + pessoa(AMBAR, 0, -10, 1.3) + pessoa(TURQ, 60, 0, 1.3) : g(veleiro(clamp((t - L[2][3]) / .8), BRANCO), { s: .7, y: 30 });
    return leg('3 passos', t, W('três', 1.2) - .1, { y: 170, tam: 76 }) + L.map(([n, a1, a2, w, i]) => pop(cartao(460, 540) + `<circle cx="-170" cy="-210" r="40" fill="${AMBAR}" ${S6}/>` + txt(n, -170, -192, { tam: 52, cor: BRANCO }) +
      g(ilu(i), { y: -60 }) + txt(a1, 0, 150, { tam: 52 }) + txt(a2, 0, 214, { tam: 52, cor: TURQ }), t, w - .15, { x: 480 + i * 480, y: 560 })).join(''); }),

  M049: cena(PAPEL, (t, W) => { const kz = W('zero', 2.3), kd = W('dez', 2.9), kt = W('topa', 4.2), ang = 360 * io(clamp((t - kt + .3) / 2)) + 36;
    const k = ent(t, W('círculo', .3) - .15);
    return g(risco({ R: 300, nivel: [0, 0, 0, 0, 0], ponteiro: t > kt - .3 ? ang : null, t }) +
      g(txt('0', 0, 0, { tam: 44, cor: VERM }), { x: 30, y: 60, op: ent(t, kz - .1) }) + g(txt('10', 0, 0, { tam: 44, cor: VERM }), { x: 230, y: -260, op: ent(t, kd - .1) }), { x: 960, y: 480, s: .9 + .1 * k, op: k }) +
      leg('riscômetro', t, .6, { x: 1560, y: 480, tam: 64 }); }),

  M050: cena(PAPEL, (t, W) => { const ws = [W('físico', .4), W('emocional', 1.4), W('social', 2.5), W('financeiro', 3.5), W('intelectual', 4.7)].map(x => x - .15), kp = W('perfil', 7.4) - .9, m = io(clamp((t - kp) / .8));
    const on = ws.map(w => ent(t, w, .4)), niv = [6, 4, 7, 3, 8].map((n, i) => n * on[i]);
    let s = g(risco({ R: 280, nivel: niv, icones: on, t }), { x: lerp(960, 380, m), y: lerp(500, 480, m), s: lerp(1, .55, m) });
    if (m > 0) [[[3, 8, 2, 6, 5], 960], [[9, 2, 5, 7, 4], 1540]].forEach(([nv, x], i) => { s += g(risco({ R: 280, nivel: nv, icones: [0, 0, 0, 0, 0], t }), { x, y: 480 + (1 - ent(t, kp + .3 + i * .1)) * 30, s: .55, op: ent(t, kp + .3 + i * .1) }); });
    return s + (m > 0 ? leg('cada pessoa tem o seu perfil', t, kp + .5, { y: 820, tam: 56 }) : ''); }),

  M052: cena('#dfe6ea', (t, W) => { const ks = W('social', .3), kz = W('zero', 1.7);
    return g(risco({ R: 300, nivel: [7, 6, 1, 5, 8], icones: [1, 1, 1, 1, 1], alerta: t > ks ? 2 : -1, t }), { x: 960, y: 500, op: ent(t, 0), s: .94 + .06 * ent(t, 0) }) +
      pop(txt('perto do zero', 0, 0, { tam: 60, cor: VERM }), t, kz - .15, { x: 1540, y: 820 }); }),

  M054: cena(PAPEL, (t, W) => { const kb = W('baixa', 2), kp = W('passo', 3.2), m = io(clamp((t - .3) / (kb - .3)));
    const [sx, sy] = pt(300 * .55, -90 + 144);
    return g(risco({ R: 300, nivel: [7, 6, 1, 5, 8], icones: [1, 1, 1, 1, 1], t }) + (t > kb ? g(fatia(300, 2, AMAR), { op: .45 * ent(t, kb, .3) }) : ''), { x: 760, y: 490 }) +
      g(`<g transform="rotate(-30)">${I.mao}</g>`, { x: lerp(1500, 760 + sx + 30, m), y: lerp(900, 490 + sy + 60, m), s: 1.3 }) +
      pop(g(I.pegada, { r: 20 }) + txt('1 passo', 0, 130, { tam: 60 }) + txt('esta semana', 0, 196, { tam: 48, cor: '#555' }), t, kp - .1, { x: 1500, y: 400 }); }),

  M055: cena(PAPEL, (t, W) => { const ws = [W('um', 1.3), W('passo', 2.5) + .4, W('vitória', 4.6)];
    return [0, 1, 2].map(i => { const kp = ent(t, .1 + i * .15, .4), km = io(clamp((t - ws[i] + .1) / .4)), x = 480 + i * 480, y = 520 - i * 60;
      return g(I.pegada, { x, y: y + (1 - kp) * 20, s: 1.4 * (1 - km), r: 15, op: kp }) + (km > 0 ? g(I.medalha, { x, y, s: 1.5 * (.9 + .1 * km) + .1 * pico(t, ws[i] + .35, .2), op: km }) : ''); }).join('') +
      leg('cada passo já conta', t, W('conta', 3.9) - .2, { y: 830, tam: 60 }); }),

  M056: cena(PAPEL, (t, W) => { const kd = W('depósitos', 5.1), kr = W('rendem', 6.3), coin = i => { const t0 = kd - .6 + i * .45, k = io(clamp((t - t0) / .45)); return k > 0 && k < 1 ? g(I.moeda, { x: 480, y: lerp(120, 330, k), s: .8 }) : ''; };
    const kc = clamp((t - kr + .2) / 1.8), pts = []; for (let i = 0; i <= 40 * kc; i++) { const u = i / 40; pts.push(`${900 + u * 760} ${760 - 480 * u * u}`); }
    return g(I.cofrinho, { x: 480, y: 470, s: 2.6 * (1 + .03 * [0, 1, 2].reduce((m, i) => m + pico(t, kd - .15 + i * .45, .15), 0)), op: ent(t, .2) }) + [0, 1, 2].map(coin).join('') +
      g(`<path d="M900 780H1700M900 780V260" stroke="${TINTA}" stroke-width="6"/>` + txt('tempo', 1700, 830, { tam: 40, anc: 'end', cor: '#666' }), { op: ent(t, W('jogo', 1.6) - .1) }) +
      (pts.length > 1 ? `<path d="M${pts.join('L')}" fill="none" stroke="${TURQ}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
      leg('jogo longo', t, W('jogo', 1.6) - .1, { x: 1300, y: 200, tam: 64 }); }),

  M057: cena(PAPEL, (t, W) => { const k = io(clamp(t / .7)), kt = W('tripulação', 1.1);
    return g(cartao(1000, 640) + `<circle cx="-430" cy="-250" r="44" fill="${AMBAR}" ${S6}/>` + txt('2', -430, -230, { tam: 56, cor: BRANCO }) + txt('recrutar a tripulação', 0, 240, { tam: 64 }) +
      g(veleiro(.9) + [AZUL, AMBAR, TURQ].map((c, i) => { const kk = io(clamp((t - kt + .2 - i * .15) / .45)); return kk > 0 ? pessoa(c, -70 + i * 70 - (1 - kk) * 200, 0 - 100 * Math.sin(Math.PI * kk), 1, 1) : ''; }).join(''), { y: 0 }),
      { x: 960, y: 480, s: lerp(.45, 1, k), op: ent(t, 0, .3) }); }),

  M060: cena(PAPEL, (t, W) => { const kc = W('conversa', 1.7), kr = clamp((t - .1) / (kc - .1)), [ex, ey] = pt(70, -90 + 360 * (1 - kr));
    const face = (cor, cab) => `<rect x="-300" y="-220" width="600" height="440" rx="20" fill="#2a2d33" ${S6}/>` + pessoa(cor, 0, 100, 3.2) + cab;
    return g(face(TURQ, '') , { x: 620, y: 470, op: ent(t, 0) }) + g(face(AMBAR, `<path d="M-80 -40q0 -100 80 -100q80 0 80 100v60q-30 -60 -80 -60q-50 0 -80 60z" fill="${ESC}"/>`), { x: 1300, y: 470, op: ent(t, .1) }) +
      g(`<circle r="80" fill="${BRANCO}" ${S6}/>` + (kr < 1 ? `<path d="M0 0L0 -70A70 70 0 ${1 - kr > .5 ? 1 : 0} 1 ${ex} ${ey}Z" fill="${AMBAR}"/>` : '') + txt('5 min', 0, 130, { tam: 40 }), { x: 960, y: 800 - 30, op: ent(t, .1) }) +
      pop(I.check, t, kc, { x: 960, y: 770, s: 1.1 }); }),

  M062: cena(PAPEL, (t, W) => { const ka = W('assistente', 1.4);
    return [[AZUL, -10], [VERM, 8], [TURQ, -4], [AMBAR, 6]].map(([c, r], i) => pop(`<rect x="-220" y="-40" width="440" height="80" rx="8" fill="${c}" ${S6}/><path d="M-180 -40v80" stroke="${TINTA}" stroke-width="5"/>`, t, i * .12, { x: 560, y: 720 - i * 90, r: r * .4, dy: -60 })).join('') +
      leg('assistentes de pesquisa', t, ka - .15, { x: 1300, y: 380, tam: 60 }) + pop(txt('0', 0, 0, { tam: 260, cor: VERM }), t, ka + .3, { x: 1300, y: 640 }); }),

  M064: cena(PAPEL, (t, W) => { const kf = W('fácil', 2.6), m = io(clamp((t - kf + .9) / .8));
    return g(`<path d="M300 800h1320V200h-280v150h-280v150h-280v150h-280z" fill="${CINZA2}" ${S6}/>`, { op: ent(t, 0) }) +
      g(`<rect x="-180" y="-60" width="360" height="60" fill="${AMAR}" ${S6}/>`, { x: 520, y: 800, op: ent(t, .1) }) + leg('pedido pequeno', t, W('pedido', .1), { x: 520, y: 520, tam: 50 }) +
      g(I.mao, { x: 520, y: lerp(1060, 690, m), s: 1.6 }) + pop(txt('fácil de ajudar', 0, 0, { tam: 60, cor: TURQ }), t, kf + .2, { x: 1300, y: 130 }); }),

  M065: cena(PAPEL, (t, W) => { const ka = W('ajuda', 2.5), m = io(clamp((t - ka + .5) / .6)), tilt = 14 * (1 - m) + 2 * Math.sin(t * 3) * (1 - m);
    const braco = (cor, x, r, k) => g(`<rect x="-50" y="0" width="100" height="420" rx="40" fill="${cor}" ${S6}/>` + g(I.mao, { y: -10, s: 1.4 }), { x, y: 560, r, op: k });
    return g(`<rect x="-220" y="-170" width="440" height="300" rx="10" fill="#c99a5f" ${S6}/><path d="M-220 -110h440M-40 -170v60M40 -170v60" stroke="${TINTA}" stroke-width="6"/>`, { x: 960, y: 420 + 30 * (1 - m), r: tilt }) +
      braco(TURQ, 800, 18, ent(t, 0)) + (m > 0 ? braco(AMBAR, 1120, -18 + 0, m) : '') + leg('ajudar', t, ka, { x: 1500, y: 300, tam: 64, cor: '#b87a1e' }); }),

  M066: cena(PAPEL, (t, W) => { const kg = W('generosidade', 1.3);
    return g(veleiro(1) + [AZUL, AMBAR, TURQ, VERM, '#8d8b86'].map((c, i) => { const kk = io(clamp((t - .2 - i * .18) / .5)), side = i % 2 ? 1 : -1;
      return kk > 0 ? pessoa(c, -90 + i * 45 + side * (1 - kk) * 500, -6 - 120 * Math.sin(Math.PI * kk), .9) : ''; }).join(''), { x: 960, y: 680, s: 1.8 }) +
      pop(I.coracao + txt('generosidade', 0, 140, { tam: 56, cor: VERM }), t, kg - .15, { x: 1460, y: 330 + 6 * sw(t) }) + selo(SEELIG, t, .5); }),

  M067: cena(QUENTE, (t, W) => { const kv = W('vela', 1.6), kl = W('livro', 2.5), kvo = W('voo', 4.8), mv = io(clamp((t - kl + .2) / .7));
    const vel = g(veleiro(clamp((t - kv + .9) / 1)) + txt('3 · içar a vela', 0, 150, { tam: 52 }), { x: lerp(960, 200, mv), y: lerp(460, 200, mv), s: lerp(1.4, .5, mv) });
    const kp = io(clamp((t - kvo + .3) / 1.2));
    return vel + leg('um livro nasceu assim', t, W('nasceu', 3.5) - .2, { y: 300, tam: 64 }) + (mv > 0 ? g(linha({ prog: .1 + .1 * mv, on: [ent(t, kvo - .2, .4), 0, 0, 0] }), { op: mv }) : '') +
      (kp > 0 ? g(I.aviao, { x: 360 + 500 * kp, y: 420 - 260 * kp * kp, s: .9, r: -20 * kp, op: 1 - io(clamp((kp - .85) / .15)) }) : ''); }),

  M073: cena(QUENTE, (t, W) => { const k = clamp((t - .1) / 1.1), kq = W('perguntou', 2.8);
    return linha({ prog: .75 + .25 * k, on: [1, 1, 1, ent(t, .3, .5)], dim: 0 }) +
      pop(g(`<path d="M-300 -90h600q30 0 30 30v120q0 30 -30 30h-480l-60 50v-50h-60q-30 0 -30 -30v-120q0 -30 30 -30z" fill="${BRANCO}" ${S6}/>` + txt('quer escrever um livro?', 0, 20, { tam: 52 }), {}), t, kq - .15, { x: 1300, y: 180 }); }),

  M075: cena(QUENTE, (t, W) => { const kg = io(clamp((t - .2) / .9)), ka = W('algo', 3.1);
    const capa = txt('WHAT I WISH', 170, -120, { tam: 40, cor: BRANCO }) + txt('I KNEW WHEN', 170, -70, { tam: 40, cor: BRANCO }) + txt('I WAS 20', 170, -20, { tam: 40, cor: BRANCO }) +
      `<circle cx="170" cy="80" r="44" fill="${AMAR}" ${S6}/>` + txt('Tina Seelig', 170, 200, { tam: 28, peso: 600, cor: BRANCO });
    return (kg > 0 ? g(livro(0, capa, VERM, kg), { x: 620, y: 470 }) : '') +
      g(txt('o que eu queria', 0, 0, { tam: 66, anc: 'start' }) + txt('ter sabido', 0, 84, { tam: 66, anc: 'start' }) + txt('aos 20 anos', 0, 168, { tam: 66, anc: 'start', cor: VERM }) + trad(80, 250), { x: 940, y: 360 + (1 - ent(t, ka - .15)) * 30, op: ent(t, ka - .15) }) +
      selo('Tina Seelig · 2009', t, .8); }),

  M077: cena(QUENTE, (t, W) => { const L = [['puxar papo', W('puxar', 1.9), 560], ['ouvir um não', W('ouvir', 3.1), 960], ['continuar por perto', W('continuar', 4.3), 1360]];
    return g(linha({ prog: 1, on: [1, 1, 1, 1], dim: 1 }), { op: ent(t, 0) }) + L.map(([l, w, x]) => { const k = ent(t, w - .15, .4);
      return g(`<rect x="-180" y="-46" width="360" height="92" rx="46" fill="${AMAR}" ${S6}/>` + txt(l, 0, 13, { tam: 34 }) + `<path d="M0 50v70" stroke="${AMBAR}" stroke-width="8" stroke-dasharray="10 8"/>`, { x, y: 300 + (1 - k) * 30, s: .92 + .08 * k + .04 * pico(t, w + .3, .2), op: k }); }).join(''); }),

  M078: cena(QUENTE, (t, W) => { const kj = W('justa', 2.2), kd = W('difíceis', 5.4), st = [760, 520, 1000, 260];
    let s = '';
    st.forEach((x0, i) => { const y = 300 + i * 150, k = io(clamp((t - kj + .4 - i * .08) / .7));
      s += `<rect x="160" y="${y - 60}" width="1600" height="120" fill="${i % 2 ? '#e7b48c' : '#dca37a'}"/><path d="M160 ${y + 60}H1760" stroke="${BRANCO}" stroke-width="6"/>` +
        `<path d="M${x0} ${y - 60}v120" stroke="${BRANCO}" stroke-width="10" opacity="${k}"/>` + pessoa([AZUL, AMBAR, TURQ, '#8d8b86'][i], lerp(160, x0 - 50, k), y + 30, 1.3);
      if (i === 3) [520, 820, 1120].forEach((x, j) => { const kk = ent(t, kd - .2 + j * .12, .35); s += g(`<path d="M-30 40V-40M30 40V-40M-40 -30h80" stroke="${VERM}" stroke-width="12" stroke-linecap="round"/>`, { x, y: y + 10 - (1 - kk) * 30, op: kk }); }); });
    return `<path d="M1700 220v620" stroke="${TINTA}" stroke-width="10" stroke-dasharray="20 14"/>` + g(s, { op: ent(t, 0) }) + selo(SEELIG, t, .4); }),

  M079: cena(QUENTE, (t, W) => { const kp = W('programação', 2.9), ke = W('empreendedorismo', 4);
    return g(I.notebook + g(txt('</>', 0, 30, { tam: 90, cor: TURQ }), { op: ent(t, kp - .15, .4) }), { x: 860, y: 520, s: 2, op: ent(t, 0) }) +
      pop(I.lampada, t, ke - .15, { x: 1460, y: 330, s: 1.3 }) + selo('The Last Mile · San Quentin', t, W('The', 1.1) - .2); }),

  M080: cena(QUENTE, (t, W) => { const kc = W('escolhas', 3.6), ka = W('ainda', 2.8), k0 = io(clamp(t / 1.6)), k1 = io(clamp((t - ka + .6) / .7));
    const ramo = (dx) => { const pts = []; for (let i = 0; i <= 20 * k1; i++) { const u = i / 20; pts.push(`${960 + dx * 520 * u * u} ${560 - 330 * u}`); } return pts.length > 1 ? `<path d="M${pts.join('L')}" fill="none" stroke="${TURQ}" stroke-width="40" stroke-linecap="round"/>` : ''; };
    const tip = dx => { const u = 1, x = 960 + dx * 520, y = 230, a = Math.atan2(-330, dx * 1040) * 180 / Math.PI; return k1 > .95 ? g(`<path d="M-10 -46L60 0L-10 46z" fill="${TURQ}" ${S6}/>`, { x, y, r: a }) : ''; };
    return `<path d="M960 900V${lerp(900, 560, k0)}" stroke="${TURQ}" stroke-width="40" stroke-linecap="round"/>` + ramo(-1) + ramo(1) + tip(-1) + tip(1) +
      leg('ainda existem escolhas', t, kc - .5, { y: 140, tam: 76 }); }),

  M082: cena('#e7eef0', (t, W) => { const k = ent(t, W('conversar', .3) - .15);
    return g(`<path d="M-320 -200h640q40 0 40 40v240q0 40 -40 40h-480l-80 70v-70h-80q-40 0 -40 -40v-240q0 -40 40 -40z" fill="${BRANCO}" ${S6}/>` + g(I.psico, { x: -180, y: -10, s: 1.4 }) +
      txt('conversar com', 120, -40, { tam: 54 }) + txt('um psicólogo', 120, 40, { tam: 54, cor: '#3c5e7d' }), { x: 960, y: 460 + (1 - k) * 40, op: k, s: .94 + .06 * k }); }),

  M083: cena(QUENTE, (t, W) => { const kp = W('perguntou', .9);
    return g(I.microfone, { x: 520, y: 620, s: 1.8, r: 8, op: ent(t, 0) }) + g(I.microfone, { x: 1400, y: 620, s: 1.8, r: -8, op: ent(t, .1) }) +
      pop(`<path d="M-330 -80h660q30 0 30 30v100q0 30 -30 30h-300l-40 50l-10 -50h-310q-30 0 -30 -30v-100q0 -30 30 -30z" fill="${BRANCO}" ${S6}/>` + txt('o que fazer esta semana?', 0, 16, { tam: 52 }), t, kp - .15, { x: 960, y: 330 }) +
      selo('Mel Robbins Podcast · ep. 388', t, .3); }),

  M087: cena(QUENTE, (t, W) => { const d1 = W('decisão', 1.1), d2 = W('porta', 2.5), d3 = W('decisão', 5);
    const ab = [d1, d2, (d2 + d3) / 2, d3].map(w => io(clamp((t - w + .2) / .6)));
    return `<path d="M0 820L700 560H1220L1920 820z" fill="#d9c3a3"/><path d="M0 120L700 380H1220L1920 120" fill="none" stroke="${CINZA}" stroke-width="4"/>` + g(portas(ab), { op: ent(t, 0) }) +
      pop(g(`<rect x="-140" y="-44" width="280" height="88" rx="44" fill="${AMAR}" ${S6}/>` + txt('1 decisão', 0, 16, { tam: 44 }) + `<path d="M150 0h120M240 -24l30 24l-30 24" fill="none" stroke="${TINTA}" stroke-width="8" stroke-linecap="round"/>`), t, d3 - .15, { x: 1000, y: 300 }); }),
};

export { LIMPO, V, SB, pw, S6, CINZA2, ROSA, QUENTE, VERDE, ESC, pico, sw, I, ic, pop, risca, sub, pessoa, leg, selo, SEELIG, WISE, trad, cena, veleiro, livro, risco, linha, portas, C };
if (process.argv[1].replace(/\\/g, '/').endsWith('/m007.mjs')) {
const ids = (process.argv[2] || Object.keys(C).join(',')).split(',');
const PREV = process.env.PREV || `${HERE}/prev`;
const pr = new Proj(), jobs = [];
for (const id of ids) {
  const [a, b] = SB[id], c = pr.comp(id, b - a);
  pr.layers(c, C[id](a));
  if (process.argv[3]) jobs.push(...process.argv[3].split(';').map(s => frame(id, s === 'm' ? (b - a) * .8 : +s, `${PREV}/${id}.png`)));
  else jobs.push(video(id, `${V}/midia/motion/${id}.mp4`));
}
fs.mkdirSync(PREV, { recursive: true });
await pr.run(jobs);
}
