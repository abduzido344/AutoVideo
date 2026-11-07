import fs from 'fs';
import { Proj, video, frame, HERE, clamp, io, out } from './kit.mjs';
import { prota, fala, piscar } from './vetor.mjs';
import { PAPEL, TINTA, TURQ, AMBAR, CINZA, VERM, AZUL, AMAR, BRANCO, ent, sai, vis, lerp, raw, fundo, txt, g, surge, cartao, barraH, imagem, ICON, bateria, nuvem, fonte } from './mg.mjs';

const V = `${HERE}/../../videos/005_por_que_voce_vive_cansado_sem_ter_feito_nada`;
const EDL = fs.readFileSync(`${V}/midia/edl.csv`, 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const span = id => { const i = EDL.findIndex(r => r[2] === `motion/${id}.mp4`); return [+EDL[i][0], +(EDL[i + 1]?.[0] ?? EDL[i][1])]; };
const PAL = JSON.parse(fs.readFileSync(`${V}/audio/palavras.json`, 'utf8'));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const pw = (frag, perto) => { const f = norm(frag); let m = null;
  for (const [w, t] of PAL) if (norm(w).startsWith(f) && Math.abs(t - perto) < 4 && (m == null || Math.abs(t - perto) < Math.abs(m - perto))) m = t;
  if (m == null) { console.warn(`aviso: palavra ${frag} perto de ${perto}`); return perto; } return m; };
const FONTES = `${V}/midia/fontes`;
const print = f => { const x = fs.readdirSync(FONTES).find(n => n.startsWith(f + '_')); return x && `${FONTES}/${x}`; };
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const CINZA2 = '#e2ded6', PALIDO = '#cfe7dc';
const pico = (t, c, w) => Math.max(0, 1 - Math.abs(t - c) / w);

const I = {
  lua: `<path d="M20 -70a70 70 0 1 0 50 110a56 56 0 1 1 -50 -110z" fill="${AMAR}" ${S6}/>`,
  cabeca: `<circle r="66" fill="#d8d8d8" ${S6}/><path d="M-30 -20q12 -12 24 0M8 -20q12 -12 24 0" fill="none" ${S6}/>`,
  olho: `<path d="M-80 0q80 -70 160 0q-80 70 -160 0z" fill="${BRANCO}" ${S6}/><circle r="26" fill="${AZUL}" ${S6}/><circle r="10" fill="${TINTA}"/>`,
  coracao: `<path d="M0 60L-60 0q-30 -34 0 -58q30 -20 60 12q30 -32 60 -12q30 24 0 58z" fill="${VERM}" ${S6}/>`,
  pessoas: `<circle cx="-34" cy="-30" r="24" fill="${AZUL}" ${S6}/><circle cx="34" cy="-30" r="24" fill="${AMBAR}" ${S6}/><path d="M-74 50q0 -50 40 -50q40 0 40 50z" fill="${AZUL}" ${S6}/><path d="M-6 50q0 -50 40 -50q40 0 40 50z" fill="${AMBAR}" ${S6}/>`,
  pincel: `<path d="M-60 70l70 -90" fill="none" stroke="#8a5e3c" stroke-width="16" stroke-linecap="round"/><path d="M4 -30l26 -36q20 -14 30 -4q10 10 -4 30l-36 26z" fill="${TURQ}" ${S6}/>`,
  estrela: `<path d="M0 -70L18 -22L70 -20L28 10L44 62L0 32L-44 62L-28 10L-70 -20L-18 -22Z" fill="${AMAR}" ${S6}/>`,
  tomada: `<rect x="-60" y="-40" width="90" height="80" rx="14" fill="${BRANCO}" ${S6}/><path d="M30 -20h40M30 20h40" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/><path d="M-60 0h-60" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/>`,
  onda: `<path d="M-90 0q22 -50 45 0t45 0t45 0t45 0" fill="none" stroke="${AZUL}" stroke-width="14" stroke-linecap="round"/>`,
  peca: `<path d="M-60 -60h40q0 -26 20 -26t20 26h40v40q26 0 26 20t-26 20v40h-40q0 -26 -20 -26t-20 26h-40z" fill="${AMBAR}" ${S6}/>`,
  relogio: `<circle r="80" fill="${BRANCO}" ${S6}/><path d="M0 -50V0L36 22" fill="none" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/>`,
  violao: `<path d="M8 -20l60 -60" fill="none" stroke="#5b3a22" stroke-width="16" stroke-linecap="round"/><circle cx="-20" cy="30" r="44" fill="#c98b4e" ${S6}/><circle cx="16" cy="-6" r="32" fill="#c98b4e" ${S6}/><circle cx="-6" cy="16" r="12" fill="${TINTA}"/>`,
  panela: `<rect x="-70" y="-20" width="140" height="80" rx="12" fill="#9aa3ad" ${S6}/><rect x="-84" y="-34" width="168" height="22" rx="8" fill="#b7bec6" ${S6}/><path d="M-20 -50q-10 -16 0 -32M20 -50q-10 -16 0 -32" fill="none" ${S6}/>`,
  bola: `<circle r="66" fill="${BRANCO}" ${S6}/><path d="M0 -24l22 16l-8 26h-28l-8 -26z" fill="${TINTA}"/><path d="M0 -24v-40M22 -8l38 -12M14 18l22 34M-14 18l-22 34M-22 -8l-38 -12" fill="none" ${S6}/>`,
  livro: ICON.livro, sino: ICON.sino, maleta: ICON.maleta, conta: ICON.conta, check: ICON.check,
  arvore: `<rect x="-14" y="10" width="28" height="70" fill="#8a6345" ${S6}/><circle cy="-20" r="60" fill="#6aad63" ${S6}/>`,
  nota: `<path d="M-20 50V-50l60 -16v90" fill="none" stroke="${TINTA}" stroke-width="12"/><ellipse cx="-38" cy="52" rx="24" ry="18" fill="${TINTA}"/><ellipse cx="22" cy="34" rx="24" ry="18" fill="${TINTA}"/>`,
  sozinho: `<circle cy="-36" r="30" fill="${TURQ}" ${S6}/><path d="M-50 60q0 -66 50 -66q50 0 50 66z" fill="${TURQ}" ${S6}/>`,
  nada: `<circle r="62" fill="none" stroke="${TINTA}" stroke-width="10" stroke-dasharray="14 14"/>`,
  tela: `<rect x="-50" y="-90" width="100" height="180" rx="16" fill="#22252b" ${S6}/><rect x="-38" y="-74" width="76" height="148" rx="6" fill="#cfe3f0"/>`,
  lampada: `<path d="M-40 -10q-10 -70 40 -74q50 4 40 74q-8 20 -14 30h-52q-6 -10 -14 -30z" fill="${AMAR}" ${S6}/><rect x="-26" y="22" width="52" height="34" rx="6" fill="${CINZA}" ${S6}/>`,
  som: `<path d="M-60 -24h30l40 -34v116l-40 -34h-30z" fill="${CINZA}" ${S6}/><path d="M30 -24q18 24 0 48M50 -44q34 44 0 88" fill="none" ${S6}/>`,
  fone: `<path d="M-60 20v-20q0 -64 60 -64q60 0 60 64v20" fill="none" stroke="${TINTA}" stroke-width="12"/><rect x="-76" y="10" width="34" height="60" rx="12" fill="#2a2d33" ${S6}/><rect x="42" y="10" width="34" height="60" rx="12" fill="#2a2d33" ${S6}/>`,
  envelope: `<rect x="-80" y="-52" width="160" height="104" rx="8" fill="${BRANCO}" ${S6}/><path d="M-80 -52L0 10L80 -52" fill="none" ${S6}/>`,
  balao: `<path d="M-50 -34h100q20 0 20 20v40q0 20 -20 20h-60l-24 22v-22h-16q-20 0 -20 -20v-40q0 -20 20 -20z" fill="${BRANCO}" ${S6}/>`,
  cama: `<rect x="-90" y="0" width="180" height="40" rx="8" fill="#a6abb3" ${S6}/><rect x="-100" y="-40" width="20" height="100" rx="6" fill="#8a6d52" ${S6}/><path d="M-76 -6q20 -24 50 -6" fill="${BRANCO}" ${S6}/>`,
  bussola: `<circle r="66" fill="${BRANCO}" ${S6}/><path d="M0 -46L14 0L0 46L-14 0Z" fill="${VERM}" ${S6}/><circle r="8" fill="${TINTA}"/>`,
  tenis: `<path d="M-80 30q-6 -36 24 -44l40 -10q20 20 50 18l40 6q22 6 22 30z" fill="${BRANCO}" ${S6}/><path d="M-40 -16q10 22 40 26" fill="none" stroke="${AMBAR}" stroke-width="12" stroke-linecap="round"/>`,
  receita: `<rect x="-60" y="-80" width="120" height="160" rx="8" fill="${BRANCO}" ${S6}/><path d="M-36 -44h72M-36 -14h72M-36 16h46" fill="none" stroke="${CINZA}" stroke-width="8" stroke-linecap="round"/>`,
  feed: `<rect x="-90" y="-60" width="180" height="120" rx="14" fill="${BRANCO}" ${S6}/><rect x="-70" y="-42" width="60" height="60" rx="8" fill="${AZUL}"/><path d="M8 -30h60M8 -6h44" fill="none" stroke="${CINZA}" stroke-width="10" stroke-linecap="round"/>`,
  cursor: `<path d="M0 0V80L22 60L38 96L52 90L36 54H64Z" fill="${BRANCO}" ${S6}/>`,
  prancheta: `<rect x="-90" y="-120" width="180" height="240" rx="12" fill="#b98a5e" ${S6}/><rect x="-74" y="-96" width="148" height="200" rx="6" fill="${BRANCO}" ${S6}/><rect x="-30" y="-132" width="60" height="30" rx="8" fill="${CINZA}" ${S6}/>`,
};
const ic = (n, x, y, s = 1, o = {}) => g(I[n], { x, y, s, ...o });
const card = (n, label, x, y, k, { w = 300, h = 320, cor = BRANCO, s = 1, tam = 40 } = {}) => k <= 0 ? '' :
  g(cartao(w, h, { fill: cor }) + (n ? ic(n, 0, -30, .95) : '') + (label ? txt(label, 0, h / 2 - 36, { tam }) : ''), { x, y: y + (1 - k) * 40, s: s * (.92 + .08 * k), op: k });
const risca = (x0, x1, y, k, cor = VERM) => k <= 0 ? '' : `<path d="M${x0} ${y}L${x0 + (x1 - x0) * k} ${y}" stroke="${cor}" stroke-width="18" stroke-linecap="round"/>`;
const resp = t => Math.sin(t / 3.2 * Math.PI * 2);
const P = (f, o) => prota(t => { const q = f(t);
  return { s: .5, tronco: .6 * resp(t), cab: 0, br: { E: [19, -7, 0], D: [-18, 9, 0] }, pe: { E: [3, -1, -2], D: [-3, 1, 2] }, ...q,
    rosto: { pisca: piscar(t, [1.1, 3.9, 6.6]), ...(q.rosto || {}) } }; }, o);
const triste = { sorriso: -.4, sobr: 4, sobrIn: .8 }, feliz = { sorriso: 1 }, cansado = { sorriso: -.2, pisca: .4, sobr: -2 };

const mostraPrint = (f, cit, w = 1240, legenda) => a => [fundo(), raw('print', t => {
  const p = print(f), k = ent(t, 0, .7);
  const corpo = p ? g(imagem(p, 0, 0, w), { x: 960, y: (legenda ? 430 : 540) + (1 - k) * 40, s: 1 + .04 * clamp(t / 7), op: k }) : fonte(...cit, t, 0);
  return corpo + (legenda ? txt(legenda, 960, 860, { tam: 40, peso: 600, cor: '#555', op: ent(t, .4) }) : ''); })];
const F1 = mostraPrint('F1', [], 1500, 'Aristóteles, Ética a Nicômaco, livro X');
const F2 = mostraPrint('F2', [], 1300, 'Rest Test — Universidade de Durham (2016)');
const F3 = mostraPrint('F3', [], 1600, 'Sonnentag e Fritz (2007), Journal of Occupational Health Psychology');
const F4 = mostraPrint('F4', [], 520, 'Saundra Dalton-Smith, Sacred Rest (2017)');

// palavra grega
const SCOLE = 'σχολή';
const grega = (a, { prefixo = 0, legenda = null, quente = false } = {}) => [fundo(quente ? '#f1e4cf' : PAPEL), raw('grega', t => {
  const k = ent(t, 0, .6), kp = prefixo ? ent(t, prefixo - a, .5) : 0;
  return g(txt(SCOLE, 0, 0, { tam: 220, peso: 700 }), { x: 960 + 70 * kp, y: 520 + (1 - k) * 30, op: k }) +
    (kp > 0 ? g(txt('ἀ', 0, 0, { tam: 220, cor: VERM }), { x: 660, y: 520 - (1 - kp) * 160, op: kp }) : '') + (legenda ? legenda(t) : ''); })];

// roda dos 7
const TIPOS = [['físico', 'lua', TURQ], ['mental', 'cabeca', AZUL], ['sensorial', 'olho', AMBAR], ['emocional', 'coracao', VERM], ['social', 'pessoas', '#8e7cc3'], ['criativo', 'pincel', '#5fb0b7'], ['espiritual', 'estrela', '#d9a441']];
const setor = (i, R = 320, r0 = 70) => { const a0 = (i / 7) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / 7) * 2 * Math.PI - Math.PI / 2, p = (r, a) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
  return `M${p(r0, a0)}L${p(R, a0)}A${R} ${R} 0 0 1 ${p(R, a1)}L${p(r0, a1)}A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`; };
const roda = (a, foco, { acesas = foco, cx = 960, cy = 450, so = null, lua = false, extra = null } = {}) => [fundo(), raw('roda', t => {
  const k = ent(t, 0, .5), kf = ent(t, .15, .45);
  let s = '';
  TIPOS.forEach(([n, icn, cor], i) => { const on = (so ? so(i, t) : i < acesas ? 1 : i === foco ? kf : 0), pop = i === foco ? 1 + .08 * pico(t, .45, .3) : 1;
    const am = ((i + .5) / 7) * 2 * Math.PI - Math.PI / 2;
    s += g(`<path d="${setor(i)}" fill="${on > .5 ? (i === foco ? cor : PALIDO) : CINZA2}" ${S6}/>` + g(I[icn], { x: 205 * Math.cos(am), y: 205 * Math.sin(am), s: .55, op: .35 + .65 * on }), { s: pop }); });
  s = g(s, { x: cx, y: cy + (1 - k) * 30, op: k });
  if (foco != null && foco >= 0) s += txt(TIPOS[foco][0], 960, 860, { tam: 80, cor: TIPOS[foco][2], op: kf });
  return s + (extra ? extra(t) : ''); })];

// quatro cards de Sonnentag
const REC = [['desligamento', 'tomada'], ['relaxamento', 'onda'], ['domínio', 'peca'], ['controle', 'relogio']];
const cards4 = (a, { on = () => [0, 0, 0, 0], interroga = () => 0, extra = null } = {}) => [fundo(), raw('cards4', t => { const L = on(t);
  return REC.map(([l, n], i) => { const k = ent(t, i * .1), x = 330 + i * 420, f = L[i], q = i === 2 ? interroga(t) : 0;
    let b = cartao(360, 480, { fill: f > .5 ? BRANCO : CINZA2 }) + txt(String(i + 1), 0, -160, { tam: 70, cor: f > .5 ? TURQ : '#a9a49a' });
    if (f > 0) b += g(I[n], { y: 20, s: f }) + txt(l, 0, 190, { tam: 40, op: f });
    else if (q > 0) b += txt('?', 0, 60, { tam: 180, cor: AMBAR, op: q });
    return g(b, { x, y: 560 + (1 - k) * 40, s: 1 + .06 * (f > 0 && f < 1 ? Math.sin(Math.PI * f) : 0), op: k }); }).join('') + (extra ? extra(t) : ''); })];

const icFala = (L, a, y = 540, gap = 330) => raw('ícones', t => L.map(([n, l, w], i) => { const k = ent(t, w - a - .15, .4), x = 960 + (i - (L.length - 1) / 2) * gap;
  return g(ic(n, 0, -30, 1.1) + (l ? txt(l, 0, 120, { tam: 40 }) : ''), { x, y: y + (1 - k) * 30, s: .9 + .1 * k, op: k }); }).join(''));
const pergunta = (a, quente = false) => [fundo(quente ? '#f1e4cf' : PAPEL), raw('pergunta', t => { const k = ent(t, .1, .5);
  return g(txt('cansado de quê?', 0, 0, { tam: 150, cor: TINTA }), { x: 960, y: 580 + (1 - k) * 30, s: .94 + .06 * k + .02 * clamp(t / 5), op: k }); })];
const pessoaMini = (cor, x, y, s = 1, op = 1) => g(`<circle cy="-30" r="20" fill="${cor}" ${S6}/><path d="M-34 40q0 -50 34 -50q34 0 34 50z" fill="${cor}" ${S6}/>`, { x, y, s, op });

const C = {
  M02: a => grega(a, { legenda: t => [['lampada', 'pensar', pw('pensar', 5.3)], ['balao', 'conversar', pw('conversar', 6)], ['livro', 'aprender', pw('aprender', 7)]]
    .map(([n, l, w], i) => { const k = ent(t, w - a - .15, .4); return g(ic(n, 0, 0, .8) + txt(l, 0, 110, { tam: 40 }), { x: 560 + i * 400, y: 740 + (1 - k) * 30, op: k }); }).join('') }),
  M03: a => [fundo(), raw('escola', t => { const k1 = ent(t, 0), k2 = ent(t, .8), k3 = ent(t, pw('escola', 10.4) - a - .2, .5);
    return txt(SCOLE, 420, 560, { tam: 130, op: k1 }) + txt('→', 760, 560, { tam: 100, op: k2, cor: '#999' }) + txt('skholé', 1000, 560, { tam: 110, peso: 600, op: k2 }) +
      txt('→', 1270, 560, { tam: 100, op: k3, cor: '#999' }) + g(txt('escola', 0, 0, { tam: 130, cor: TURQ }), { x: 1560, y: 560, s: .9 + .1 * k3, op: k3 }) +
      txt('tempo livre', 420, 680, { tam: 40, cor: '#666', op: k1 }); })],
  M04: a => grega(a, { prefixo: pw('nao', 16.3), legenda: t => txt('trabalho', 960, 780, { tam: 70, cor: VERM, op: ent(t, pw('trabalho', 17.5) - a - .1) }) }),
  M05: a => [fundo(), raw('não descanso', t => { const k = ent(t, 0), k2 = ent(t, pw('descanso', 20.2) - a - .4);
    return g(txt('ἀ', 0, 0, { tam: 180, cor: VERM }) + txt('não', 0, 130, { tam: 50, cor: '#666' }), { x: 640, y: 480, op: k }) + txt('+', 820, 480, { tam: 120, op: k, cor: '#999' }) +
      g(txt(SCOLE, 0, 0, { tam: 180 }) + txt('descanso', 0, 130, { tam: 50, cor: '#666' }), { x: 1160, y: 480, op: k }) +
      g(txt('trabalho = não descanso', 0, 0, { tam: 76, cor: VERM }), { x: 960, y: 860 + (1 - k2) * 20, op: k2 }); })],
  M06: F1,
  M07: a => [fundo(), raw('guarda', t => { const k = io(clamp((t - .4) / 1.1));
    return g(txt(SCOLE, 0, 0, { tam: 220 }), { x: lerp(960, 1700, k), y: lerp(560, 120, k), s: lerp(1, .35, k) }) +
      (k > .95 ? g(`<rect x="-150" y="-70" width="300" height="110" rx="20" fill="none" stroke="${AMBAR}" stroke-width="6" stroke-dasharray="14 10"/>`, { x: 1700, y: 100, op: ent(t, 1.5) }) : ''); })],
  M08: F2,
  M09: a => { const k18 = pw('18', 41) - a, k134 = pw('134', 43.3) - a;
    return [fundo(), raw('mapa', t => { let s = `<ellipse cx="960" cy="480" rx="760" ry="330" fill="#dfe7ea" ${S6}/>`;
      for (let i = 0; i < 160; i++) { const u = (i * 0.618) % 1, v = (i * 0.377) % 1, x = 960 + (u - .5) * 1300, y = 480 + (v - .5) * 520, dentro = ((x - 960) / 760) ** 2 + ((y - 480) / 330) ** 2 < .92;
        if (dentro) s += `<circle cx="${x}" cy="${y}" r="9" fill="${TURQ}" opacity="${ent(t, i * .012, .3)}"/>`; }
      return s + g(txt('18 mil pessoas', 0, 0, { tam: 80 }), { x: 620, y: 880, op: ent(t, k18 - .2) }) + g(txt('134 países', 0, 0, { tam: 80, cor: TURQ }), { x: 1360, y: 880, op: ent(t, k134 - .2) }); })];
  },
  M10: a => { const k68 = pw('68', 46.5) - a;
    return [fundo(), raw('68', t => { let s = '';
      for (let i = 0; i < 100; i++) { const c = i % 20, r = Math.floor(i / 20), on = i < 68, kk = on ? ent(t, k68 - .3 + i * .008, .3) : 0;
        s += pessoaMini(kk > .5 ? VERM : '#c9c4ba', 260 + c * 74, 150 + r * 100, .7, ent(t, i * .006, .3)); }
      return s + g(txt('68%', 0, 0, { tam: 180, cor: VERM }), { x: 760, y: 790, op: ent(t, k68), s: .9 + .1 * ent(t, k68) }) + txt('querem descansar mais', 1240, 770, { tam: 44, op: ent(t, k68 + .4) }); })];
  },
  M11: F3,
  M12: a => { const km = pw('mais', 62.8) - a;
    return [fundo(), raw('balança', t => { const r = -12 * io(clamp((t - km) / .7)), R = r * Math.PI / 180;
      const L = [960 - 380 * Math.cos(R), 420 - 380 * Math.sin(R)], D = [960 + 380 * Math.cos(R), 420 + 380 * Math.sin(R)];
      return `<path d="M960 420V820M860 820h200" fill="none" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>` +
        `<path d="M${L[0]} ${L[1]}L${D[0]} ${D[1]}" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>` + `<circle cx="960" cy="420" r="22" fill="${AMBAR}" ${S6}/>` +
        g(cartao(330, 130) + txt('fazer menos', 0, 14, { tam: 46 }), { x: L[0], y: L[1] + 110 }) + g(cartao(330, 130, { fill: '#fdebd3' }) + txt('fazer mais', 0, 14, { tam: 46, cor: AMBAR }), { x: D[0], y: D[1] + 110 }) +
        txt('descansar', 960, 200, { tam: 70, op: ent(t, 0) }); })];
  },
  M13: a => [fundo(), raw('guarda 2', t => { const k = io(clamp((t - .3) / 1.1));
    return g(txt(SCOLE, 0, 0, { tam: 220 }), { x: 1700, y: 120, s: .35 }) +
      g(cartao(330, 130, { fill: '#fdebd3' }) + txt('fazer mais', 0, 14, { tam: 46, cor: AMBAR }), { x: lerp(960, 1700, k), y: lerp(560, 260, k), s: lerp(1.4, .55, k) }); })],
  M14: a => { const like = pw('like', 73.5) - a, insc = pw('inscreve', 74.5) - a;
    return [fundo(), raw('sofá', () => `<rect x="180" y="640" width="720" height="200" rx="40" fill="#8b9097" ${S6}/><rect x="140" y="560" width="120" height="280" rx="40" fill="#868b92" ${S6}/><rect x="820" y="560" width="120" height="280" rx="40" fill="#868b92" ${S6}/>`),
      P(t => { const k = io(clamp((t - .4) / .6));
        return { pos: [540, 700], s: .55, tronco: -4, cab: 6, ordem: ['cabeloTras', 'tronco', 'cabeca', 'cabelo', 'sobrancelhas', 'maoE', 'bracoE', 'maoD', 'bracoD'],
          br: { E: [19, -7, 0], D: [lerp(-18, -88, k), lerp(9, -4, k), 0] }, mao: { D: k > .5 ? 'aponta' : 'costas' }, rosto: { sorriso: .5, gx: 8 * k } }; }),
      raw('assento', () => `<rect x="220" y="760" width="640" height="90" rx="24" fill="#959aa1" ${S6}/>`),
      raw('botões', t => { const kl = ent(t, like - .1, .35), ki = ent(t, insc, .35), pl = 1 - .06 * pico(t, like + .15, .15), pi = 1 - .06 * pico(t, insc + .15, .15);
        const b1 = `<rect x="-200" y="-64" width="400" height="128" rx="64" fill="${kl > .5 ? TURQ : BRANCO}" ${S6}/>` + g(ICON.like, { x: -110, y: 4, s: .7 }) + txt('Gostei', 40, 22, { tam: 52, cor: kl > .5 ? BRANCO : TINTA });
        const b2 = `<rect x="-240" y="-64" width="480" height="128" rx="64" fill="${ki > .5 ? '#cfcac2' : VERM}" ${S6}/>` + txt(ki > .5 ? 'Inscrito' : 'Inscrever-se', ki > .5 ? 20 : 0, 22, { tam: 52, cor: ki > .5 ? TINTA : BRANCO }) + (ki > .5 ? g(ICON.sino, { x: -150, y: 0, s: .7 }) : '');
        return surge(b1, t, .3, { x: 1400, y: 440, s: pl }) + surge(b2, t, .6, { x: 1400, y: 650, s: pi }); })];
  },
  M15: a => [fundo(), raw('três', t => [0, 1, 2].map(i => card(null, null, 480 + i * 480, 540, ent(t, i * .15), { w: 380, h: 440, cor: CINZA2 }) + txt('?', 480 + i * 480, 600, { tam: 160, cor: '#bdb8ae', op: ent(t, i * .15) })).join(''))],
  M16: a => { const L = [['cama', 'sono não basta', pw('sono', 82.6)], ['peca', '7 tipos', pw('tipos', 84.6)], ['bussola', 'escolher', pw('escolher', 88)]];
    return [fundo(), raw('três', t => L.map(([n, l, w], i) => { const r = ent(t, w - a - .15, .45), x = 480 + i * 480;
      return card(r > .5 ? n : null, r > .5 ? l : null, x, 540, 1, { w: 380, h: 440, cor: r > .5 ? BRANCO : CINZA2 }) + (r <= .5 ? txt('?', x, 600, { tam: 160, cor: '#bdb8ae' }) : '') +
        (i === 0 && r > .5 ? risca(x - 110, x + 110, 470, ent(t, w - a + .3, .4)) : ''); }).join(''))];
  },
  M18: a => { const wm = pw('mensagem', 99.5) - a;
    return [fundo('#2d3240'), raw('feed', t => { let s = '';
      for (let i = 0; i < 9; i++) { const y = ((i * 170 - t * 420) % 1530 + 1530) % 1530 - 200; s += ic('feed', 960, y, 1.6); }
      const km = ent(t, wm - .1, .4), h = 14 + 5 * clamp(t / (span('M18')[1] - span('M18')[0]));
      return `<rect x="700" y="0" width="520" height="1080" fill="#3a4152"/>` + s +
        g(ic('balao', 0, 0, 1.8) + ic('maleta', 0, -6, .55), { x: 1390, y: 380 + (1 - km) * 30, op: km }) +
        g(ic('relogio', 0, 0, 1.4) + txt(`${Math.floor(h)}h`, 0, 170, { tam: 60, cor: BRANCO }), { x: 420, y: 480 }); })];
  },
  M22: a => { const k3 = pw('3', 115.8) - a;
    return [fundo(), raw('bateria', t => { const k = ent(t, 0), carga = Math.min(.375 * clamp((t - .3) / (k3 - .3)) / .375, 1) * .375;
      return g(bateria(carga, carga < .25 ? VERM : AMBAR), { x: 960, y: 500, s: 3 * (.92 + .08 * k), op: k }) + txt('8 horas de sono', 960, 760, { tam: 70, op: k }) +
        txt('e acordou como se fossem 3', 960, 840, { tam: 46, cor: '#666', op: ent(t, k3 - .1) }); })];
  },
  M23: a => [fundo(), raw('consultório', () => `<rect x="810" y="80" width="300" height="200" rx="10" fill="${BRANCO}" ${S6}/><path d="M960 110v140M890 180h140" stroke="${VERM}" stroke-width="22" stroke-linecap="round"/>`),
    P(t => ({ pos: [620, 560], s: .62, cab: 4, rosto: { ...cansado, pisca: .4 + .6 * pico(t, 2.4, .25), gx: 10, ...fala(t, [[.3, 1.6]]) } })),
    P(t => ({ pos: [1320, 560], s: .62, cab: -3, br: { E: [19, -7, 0], D: [-28, 110, 0] }, rosto: { gx: -10, sorriso: .3, sobr: 2 } }), { pers: 'feminina', nome: 'médica' }),
    raw('prancheta', () => ic('prancheta', 1350, 640, .55))],
  M24: a => { const kn = pw('normal', 127.5) - a, ke = pw('esgotados', 129.3) - a;
    return [fundo(), raw('exames', t => { let s = g(ic('prancheta', 0, 0, 2.6), { x: 700, y: 560, op: ent(t, 0) });
      for (let j = 0; j < 4; j++) { const k = ent(t, .3 + j * ((kn - .3) / 4), .3); s += `<path d="M590 ${390 + j * 100}h140" stroke="${CINZA}" stroke-width="12" stroke-linecap="round" opacity="${ent(t, 0)}"/>` + g(ic('check', 0, 0, .45), { x: 790, y: 390 + j * 100, op: k, s: .45 * (.8 + .2 * k) }); }
      return s + g(bateria(.15, VERM), { x: 1360, y: 560, s: 2.6, op: ent(t, ke - .2) }) + txt('esgotado', 1360, 760, { tam: 60, cor: VERM, op: ent(t, ke) }); })];
  },
  M25: F4,
  M26: a => { const k7 = pw('7', 140.2) - a;
    return roda(a, -1, { so: (i, t) => i === 0 ? ent(t, 1, .4) : 0, extra: t => g(ic('lua', 0, 0, 2.2), { x: lerp(960, 960 + 205 * Math.cos(-Math.PI / 2 + Math.PI / 7), io(clamp((t - .2) / .8))), y: lerp(450, 450 + 205 * Math.sin(-Math.PI / 2 + Math.PI / 7), io(clamp((t - .2) / .8))), s: lerp(1, .25, io(clamp((t - .2) / .8))), op: 1 - ent(t, 1, .3) }) +
      txt('7 tipos de descanso', 960, 860, { tam: 70, op: ent(t, k7 - .2) }) });
  },
  M27: a => roda(a, 0), M29: a => roda(a, 1), M33: a => roda(a, 2), M37: a => roda(a, 3), M40: a => roda(a, 4), M43: a => roda(a, 5), M45: a => roda(a, 6),
  M30: a => [fundo(), raw('abas', t => { let s = ic('cabeca', 960, 560, 2.8);
    for (let i = 0; i < 20; i++) { const k = ent(t, .15 + i * .07, .25), c = i % 5, r = Math.floor(i / 5);
      s += g(`<path d="M-90 30v-34q0 -20 20 -20h140q20 0 20 20v34" fill="${[BRANCO, '#e9f0f6', '#fdf0d8'][i % 3]}" ${S6}/>`, { x: 560 + c * 200 + (r % 2) * 40, y: 120 + r * 70 + (1 - k) * 20, op: k }); }
    return s + txt('20 abas', 960, 860, { tam: 60, op: ent(t, 1.5) }); })],
  M31: a => [fundo(), icFala([['conta', 'vence amanhã', pw('conta', 156.6)], ['envelope', 'sem resposta', pw('mail', 158.3)], ['balao', 'a conversa de ontem', pw('conversa', 161)]], a, 540, 520)],
  M34: a => [fundo(), icFala([['tela', '', pw('tela', 170.3)], ['sino', '', pw('notificacao', 171)], ['lampada', '', pw('luz', 172.2)], ['som', '', pw('barulho', 172.8)], ['fone', '', pw('fone', 174.3)]], a, 540, 300)],
  M38: a => [fundo(), P(t => { const k = io(clamp((t - 1.2) / .8)); return { pos: [960, 600], s: .7, rosto: { ...triste, pisca: .3, gx: 0 } }; }),
    raw('máscara', t => { const k = io(clamp((t - 1.2) / .8));
      return g(`<ellipse rx="140" ry="150" fill="${BRANCO}" ${S6}/><circle cx="-50" cy="-20" r="14" fill="${TINTA}"/><circle cx="50" cy="-20" r="14" fill="${TINTA}"/><path d="M-70 40q70 70 140 0" fill="none" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/><path d="M140 0h80" stroke="${TINTA}" stroke-width="6"/>`,
        { x: 960 + 420 * k, y: 330 - 30 * k, r: 20 * k }); })],
  M39: a => { const L = [['sorrir na reunião', pw('sorrir', 192)], ['segurar a resposta', pw('segurar', 193.8)], ['ser o amigo forte', pw('amigo', 196)]];
    const rosto = i => i === 0 ? `<circle r="70" fill="#d8d8d8" ${S6}/><circle cx="-24" cy="-14" r="8" fill="${TINTA}"/><circle cx="24" cy="-14" r="8" fill="${TINTA}"/><path d="M-34 20q34 30 68 0" fill="none" ${S6}/>`
      : i === 1 ? `<circle r="70" fill="#d8d8d8" ${S6}/><circle cx="-24" cy="-14" r="8" fill="${TINTA}"/><circle cx="24" cy="-14" r="8" fill="${TINTA}"/><path d="M-36 28h72" stroke="${TINTA}" stroke-width="12"/>` + [-24, -8, 8, 24].map(x => `<path d="M${x} 20v16" stroke="${AMBAR}" stroke-width="6"/>`).join('')
      : I.pessoas + `<path d="M-80 -60l160 0" stroke="${TURQ}" stroke-width="0"/>`;
    return [fundo(), raw('três', t => L.map(([l, w], i) => { const k = ent(t, w - a - .15, .4); return g(cartao(420, 420) + g(rosto(i), { y: -40 }) + txt(l, 0, 150, { tam: 36 }), { x: 480 + i * 480, y: 540 + (1 - k) * 40, op: k }); }).join(''))];
  },
  M41: a => { const ke = pw('enche', 201.6) - a, kv = pw('esvazia', 204.6) - a;
    return [fundo(), P(t => ({ pos: [960, 620], s: .55, rosto: { sorriso: .3, gx: t < kv ? -10 : 10 } })),
      P(t => ({ pos: [420, 620], s: .5, rosto: { ...feliz, gx: 10 } }), { pers: 'feminina', variante: 'ruiva', nome: 'amiga' }),
      P(t => ({ pos: [1500, 620], s: .5, cab: 4, rosto: { sorriso: -.2, sobr: -3, sobrIn: -.5, gx: -10, ...fala(t, [[kv - .2, kv + 1.5]]) } }), { pers: 'feminina', variante: 'azul', nome: 'chato' }),
      raw('bateria', t => { const c = t < kv ? .3 + .6 * clamp((t - ke) / .8) : .9 - .75 * clamp((t - kv) / .8);
        return g(bateria(c), { x: 960, y: 170, s: 1.4 }) + `<path d="M560 300L800 230" stroke="${TURQ}" stroke-width="10" stroke-linecap="round" opacity="${vis(t, ke, kv - .2)}"/>` + `<path d="M1360 300L1120 230" stroke="${VERM}" stroke-width="10" stroke-linecap="round" opacity="${ent(t, kv)}"/>`; })];
  },
  M46: a => { const kl = pw('lista', 231) - a;
    return [fundo(), raw('rede', t => { const z = lerp(1, .32, io(clamp((t - 1.6) / 4))); let s = '';
      for (let i = 0; i < 60; i++) { const ang = i * 2.4, r = 260 + (i % 7) * 190, x = 960 + r * Math.cos(ang), y = 540 + r * .62 * Math.sin(ang);
        s += `<path d="M960 540L${x} ${y}" stroke="#c9c4ba" stroke-width="4"/>` + pessoaMini([TURQ, AMBAR, AZUL, VERM][i % 4], x, y, 1.1); }
      return g(s + g(cartao(260, 300) + [0, 1, 2, 3].map(j => `<path d="M-90 ${-90 + j * 56}h${150 - j * 20}" stroke="${CINZA}" stroke-width="10" stroke-linecap="round"/><rect x="-110" y="${-102 + j * 56}" width="20" height="20" rx="4" fill="none" stroke="${TINTA}" stroke-width="4"/>`).join(''), { x: 960, y: 540 }),
        { x: 960 * (1 - z), y: 540 * (1 - z), s: z }) + txt('faz parte de algo maior', 960, 870, { tam: 50, op: ent(t, kl) }); })];
  },
  M47: a => roda(a, -1, { so: (i, t) => i === 0 ? 1 : .2, extra: t => txt('só um se resolve dormindo', 960, 860, { tam: 64, op: ent(t, .3) }) }),
  M48: a => [fundo(), raw('baterias', t => g(bateria(1, TURQ), { x: 300, y: 500, s: 1.6, op: ent(t, 0) }) + txt('sono', 300, 650, { tam: 44 }) +
    [1, 2, 3, 4, 5, 6].map(i => g(bateria(.12 + (i % 3) * .05), { x: 300 + i * 230, y: 500, s: 1.2, op: ent(t, .2 + i * .12) }) + txt(TIPOS[i][0], 300 + i * 230, 620, { tam: 30, op: ent(t, .2 + i * .12) })).join(''))],
  M49: a => roda(a, -1, { so: () => .6, extra: t => { const k = ent(t, pw('exame', 250.8) - a - .3, .3); return g(`<rect x="-300" y="-80" width="600" height="160" rx="20" fill="none" stroke="${VERM}" stroke-width="14"/>` + txt('NÃO É EXAME', 0, 34, { tam: 90, cor: VERM }), { x: 960, y: 500, r: -12, s: 1.4 - .4 * k, op: k }); } }),
  M50: a => pergunta(a), M76: a => pergunta(a, true),
  M52: F3, M70: F2,
  M53: a => [fundo(), raw('questionário', t => { let s = g(cartao(900, 900, { r: 10 }), { x: 960, y: 540 });
    for (let i = 0; i < 16; i++) { const y = 140 + i * 50, k = clamp((t - .2) / 2.4 * 16 - i);
      s += `<path d="M560 ${y}h420" stroke="#d8d4cc" stroke-width="10" stroke-linecap="round"/>` + [0, 1, 2, 3, 4].map(j => `<circle cx="${1080 + j * 50}" cy="${y}" r="13" fill="${k > .5 && j === (i * 3) % 5 ? TURQ : BRANCO}" stroke="${TINTA}" stroke-width="4"/>`).join(''); }
    return s; })],
  M54: a => cards4(a),
  M55: a => cards4(a, { on: t => [ent(t, .1, .5), 0, 0, 0] }),
  M56: a => [fundo(), raw('escritório', () => `<rect x="300" y="200" width="360" height="560" rx="8" fill="#8a6d52" ${S6}/><rect x="320" y="220" width="320" height="520" fill="#3a3d42"/>` + ic('maleta', 480, 140, .9)),
    P(t => { const x = lerp(520, 1200, io(clamp((t - .2) / 2))); return { pos: [x, 700], s: .5, br: { E: [19 + 8 * Math.sin(t * 7), -7, 0], D: [-18 + 8 * Math.sin(t * 7), 9, 0] }, rosto: { ...cansado, gx: 6 } }; }),
    raw('balão', t => { const x = lerp(520, 1200, io(clamp((t - .35) / 2))); return g(nuvem(300, 200, [-1, 1]) + ic('maleta', 0, 0, .8), { x: x + 220, y: 200 + 10 * Math.sin(t * 3), op: ent(t, .8) }); })],
  M58: a => cards4(a, { on: t => [1, ent(t, .1, .5), 0, 0] }),
  M59: a => [fundo('#e7eef0'), raw('respira', t => { const u = .5 - .5 * Math.cos(t / 3.2 * Math.PI * 2);
    return `<circle cx="960" cy="520" r="${160 + 140 * u}" fill="${AZUL}" opacity=".25"/><circle cx="960" cy="520" r="${120 + 110 * u}" fill="${AZUL}" opacity=".45"/>` + txt(u > .5 ? 'inspira' : 'solta', 960, 860, { tam: 60, cor: '#3c5e7d' }); })],
  M61: a => cards4(a, { on: t => [1, 1, 0, ent(t, .1, .5)], interroga: t => ent(t, .6, .5) }),
  M62: a => { const ka = pw('algoritmo', 307.8) - a;
    return [fundo(), P(t => { const k = io(clamp((t - (ka - .6)) / .4)); return { pos: [620, 620], s: .55, br: { E: [19, -7, 0], D: [lerp(-28, -100, k), lerp(118, -50, k), 0] }, mao: { D: k > .4 ? 'aberta' : 'punho' }, rosto: { sorriso: .6, gx: 10, sobr: 2 } }; }),
      raw('relógio', t => { const kc = io(clamp((t - (ka - .3)) / .7)), xc = lerp(1500, 1840, kc) + 30 * Math.sin(t * 3) * (1 - kc);
        return ic('relogio', 1050, 420, 1.6) + txt('domingo', 1050, 600, { tam: 50 }) + g(ic('cursor', 0, 0, 1.6), { x: xc - 200 * (1 - kc) * clamp(t / 2), y: 400, r: 20 * kc, op: 1 - .6 * kc }); })];
  },
  M63: a => cards4(a, { on: t => [1, 1, 0, 1], interroga: t => 1 - ent(t, 1.6, .3), extra: t => { const k = io(clamp((t - .3) / 1.3));
    return g(cartao(330, 130, { fill: '#fdebd3' }) + txt('fazer mais', 0, 14, { tam: 46, cor: AMBAR }), { x: lerp(1700, 1170, k), y: lerp(260, 600, k), s: lerp(.55, 1, k) }); } }),
  M64: a => cards4(a, { on: t => [1, 1, ent(t, .1, .5), 1] }),
  M65: a => [fundo(), raw('maleta', t => g(ic('maleta', 0, 0, 1.4) + risca(-110, 110, 0, ent(t, .3, .4)), { x: 960, y: 220, op: ent(t, 0) })),
    icFala([['violao', 'instrumento', pw('instrumento', 322)], ['panela', 'receita nova', pw('cozinhar', 323)], ['bola', 'jogar bola', pw('bola', 325.2)], ['peca', 'quebra-cabeça', pw('quebra', 326.5)]], a, 640, 400)],
  M71: a => { const L = [['livro', 'ler', 58, pw('ler', 354)], ['arvore', 'natureza', 53, pw('natureza', 355.5)], ['sozinho', 'ficar sozinho', 52, pw('sozinho', 356.8)], ['nota', 'ouvir música', 41, pw('musica', 358.4)], ['nada', 'não fazer nada', 40, pw('nada', 360)]];
    return [fundo(), raw('top5', t => L.map(([n, l, p, w], i) => { const k = ent(t, w - a - .15, .4), y = 170 + i * 175;
      return g(txt(`${i + 1}`, 0, 22, { tam: 64, cor: '#999' }) + ic(n, 130, 0, .6) + txt(l, 230, 18, { tam: 52, anc: 'start' }) + g(barraH(560, 46, p / 60 * k, TURQ), { x: 720 }) + txt(p + '%', 1320, 18, { tam: 48, anc: 'start', op: k }), { x: 260, y: y + (1 - k) * 20, op: k }); }).join(''))];
  },
  M72: a => [fundo(), raw('tela fora', t => { const k = io(clamp((t - .3) / .9)), b = pico(t, 1.35, .3);
    return [0, 1, 2, 3, 4].map(i => `<rect x="${420 + i * 220}" y="380" width="180" height="300" rx="20" fill="${PALIDO}" ${S6}/>`).join('') + txt('top 5', 960, 300, { tam: 50, cor: '#666' }) +
      g(ic('tela', 0, 0, 1.4), { x: lerp(1800, 1560, k) + 30 * b, y: 530, r: 10 * b }) + risca(1480, 1640, 530, ent(t, 1.6, .4)); })],
  M73: a => [fundo(), raw('nada', t => { const k = ent(t, .1, .6); return g(ic('nada', 0, 0, 3) + txt('5º', 0, 30, { tam: 90, cor: '#999' }), { x: 960, y: 460, s: .9 + .1 * k + .03 * Math.sin(t * 2), op: k }) + txt('não fazer nada', 960, 820, { tam: 90, op: k }); })],
  M74: a => [fundo('#2d3240'), raw('feed rápido', t => { let s = `<rect x="660" y="0" width="600" height="1080" fill="#3a4152"/>`;
    for (let i = 0; i < 12; i++) { const y = ((i * 140 - t * 1500) % 1680 + 1680) % 1680 - 200; s += ic('feed', 960, y, 1.8); }
    return s + g(`<rect x="-260" y="-50" width="520" height="80" rx="40" fill="#2d3240"/>` + txt('nenhum escolhido', 0, 12, { tam: 50, cor: AMAR }), { x: 960, y: 860, op: ent(t, 3) }); })],
  M77: a => roda(a, 0, { extra: t => g(ic('lua', 0, 0, 1.6), { x: 1500, y: 500, op: ent(t, .4) }) + txt('dorme', 1500, 700, { tam: 60, op: ent(t, .5) }) }),
  M82: a => [fundo('#f1e4cf'), icFala([['receita', 'uma receita', pw('receita', 406.5)], ['tenis', 'uma corrida', pw('corrida', 407.6)], ['livro', 'um livro', pw('livro', 408.6)]], a)],
  M84: a => [fundo('#f1e4cf'), raw('cadeiras', () => [600, 1320].map(x => `<rect x="${x - 120}" y="640" width="240" height="40" rx="10" fill="#8a5e3c" ${S6}/><rect x="${x - 120}" y="400" width="40" height="280" rx="10" fill="#8a5e3c" ${S6}/>`).join('')),
    P(t => ({ pos: [620, 560], s: .55, cab: 3, rosto: { gx: 10, sorriso: .2, sobrIn: .3, ...fala(t, [[.6, 2.4]]) } })),
    P(t => ({ pos: [1320, 560], s: .55, cab: -3, rosto: { gx: -10, sorriso: .7, ...fala(t, [[2.8, 4.6]]) } }), { pers: 'feminina', nome: 'médica' }),
    raw('falas', t => [[t > .6 && t < 2.6, 820, 230], [t > 2.8 && t < 4.8, 1110, 230]].map(([on, x, y]) => on ? g(`<rect x="-110" y="-60" width="220" height="120" rx="40" fill="${BRANCO}" ${S6}/>` +
      [0, 1, 2].map(j => `<circle cx="${-46 + j * 46}" cy="0" r="12" fill="${TINTA}" opacity="${.3 + .7 * (Math.sin(t * 6 - j) > 0)}"/>`).join(''), { x, y }) : '').join(''))],
  M86: a => [fundo('#f1e4cf'), raw('escola quente', t => { const k = ent(t, 0), k2 = ent(t, .9);
    return g(txt(SCOLE, 0, 0, { tam: 160 }), { x: 620, y: 560, op: k }) + txt('→', 960, 560, { tam: 110, cor: '#a08a6a', op: k2 }) + g(txt('escola', 0, 0, { tam: 160, cor: AMBAR }), { x: 1340, y: 560, op: k2 }); })],
  M87: a => [fundo('#f1e4cf'), raw('desligar', t => txt('desligar', 960, 580, { tam: 170, op: ent(t, 0) }) + risca(560, 1360, 530, ent(t, pw('desligar', 433.5) - a, .4)))],
};

const ids = (process.argv[2] || Object.keys(C).join(',')).split(',');
const pr = new Proj(), jobs = [];
for (const id of ids) {
  const [a, b] = span(id), c = pr.comp(id, b - a);
  pr.layers(c, C[id](a));
  if (process.argv[3]) jobs.push(...process.argv[3].split(';').map(s => frame(id, s === 'm' ? (b - a) * .7 : +s, `${HERE}/prev/${id}.png`)));
  else { fs.mkdirSync(`${V}/midia/motion`, { recursive: true }); jobs.push(video(id, `${V}/midia/motion/${id}.mp4`)); }
}
fs.mkdirSync(`${HERE}/prev`, { recursive: true });
await pr.run(jobs);
