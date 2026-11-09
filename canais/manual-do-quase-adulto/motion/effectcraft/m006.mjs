import fs from 'fs';
import { Proj, video, frame, HERE, clamp, io, out } from './kit.mjs';
import { prota, fala, piscar } from './vetor.mjs';
import { PAPEL, TINTA, TURQ, AMBAR, CINZA, VERM, AZUL, AMAR, BRANCO, ent, sai, vis, lerp, raw, fundo, txt, g, surge, cartao, barraH, imagem, ICON, bateria, nuvem } from './mg.mjs';

const V = `${HERE}/../../videos/006_por_que_voce_sente_saudade_de_2016`;
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
const CINZA2 = '#e2ded6', ROSA = '#f2a7b8', QUENTE = '#f1e4cf';
const pico = (t, c, w) => Math.max(0, 1 - Math.abs(t - c) / w);
const resp = t => Math.sin(t / 3.2 * Math.PI * 2);

const I = {
  casa: `<path d="M-70 0L0 -60L70 0" fill="none" ${S6}/><rect x="-54" y="-6" width="108" height="76" fill="${BRANCO}" ${S6}/><rect x="-16" y="24" width="32" height="46" fill="${AMBAR}" ${S6}/><rect x="20" y="8" width="24" height="22" fill="${AMAR}" ${S6}/>`,
  raio: `<path d="M14 -80L-40 10H0L-14 80L40 -10H0Z" fill="${AMAR}" ${S6}/>`,
  coracao: `<path d="M0 60L-60 0q-30 -34 0 -58q30 -20 60 12q30 -32 60 -12q30 24 0 58z" fill="${VERM}" ${S6}/>`,
  balao: `<path d="M-50 -34h100q20 0 20 20v40q0 20 -20 20h-60l-24 22v-22h-16q-20 0 -20 -20v-40q0 -20 20 -20z" fill="${BRANCO}" ${S6}/>`,
  receita: `<rect x="-60" y="-80" width="120" height="160" rx="8" fill="${BRANCO}" ${S6}/><path d="M-36 -44h72M-36 -14h72M-36 16h46" fill="none" stroke="${CINZA}" stroke-width="8" stroke-linecap="round"/><path d="M-40 44l14 14l26 -30" fill="none" stroke="${TURQ}" stroke-width="10" stroke-linecap="round"/>`,
  lente: `<circle r="62" fill="${ROSA}" opacity=".8" ${S6}/><path d="M44 44l50 50" stroke="${TINTA}" stroke-width="20" stroke-linecap="round"/>`,
  bussola: `<circle r="66" fill="${BRANCO}" ${S6}/><path d="M0 -46L14 0L0 46L-14 0Z" fill="${VERM}" ${S6}/><circle r="8" fill="${TINTA}"/>`,
  nota: `<path d="M-20 50V-50l60 -16v90" fill="none" stroke="${TINTA}" stroke-width="12"/><ellipse cx="-38" cy="52" rx="24" ry="18" fill="${TINTA}"/><ellipse cx="22" cy="34" rx="24" ry="18" fill="${TINTA}"/>`,
  feed: `<rect x="-90" y="-60" width="180" height="120" rx="14" fill="${BRANCO}" ${S6}/><rect x="-70" y="-42" width="60" height="60" rx="8" fill="${AZUL}"/><path d="M8 -30h60M8 -6h44" fill="none" stroke="${CINZA}" stroke-width="10" stroke-linecap="round"/>`,
  relogio: `<circle r="80" fill="${BRANCO}" ${S6}/><path d="M0 -50V0L36 22" fill="none" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/>`,
  carro: `<path d="M-90 20v-30l30 -40h110l30 40v30z" fill="${AMAR}" ${S6}/><circle cx="-50" cy="30" r="22" fill="#33363b" ${S6}/><circle cx="50" cy="30" r="22" fill="#33363b" ${S6}/><rect x="-46" y="-42" width="80" height="34" rx="6" fill="#cfe3f0" ${S6}/>`,
  moto: `<circle cx="-56" cy="30" r="30" fill="none" stroke="${TINTA}" stroke-width="12"/><circle cx="56" cy="30" r="30" fill="none" stroke="${TINTA}" stroke-width="12"/><path d="M-56 30L-10 -10H30L56 30" fill="none" ${S6}/><rect x="-40" y="-70" width="60" height="50" rx="8" fill="${VERM}" ${S6}/>`,
  loja: `<rect x="-90" y="-40" width="180" height="120" fill="${BRANCO}" ${S6}/><path d="M-100 -40l20 -40h160l20 40z" fill="${VERM}" ${S6}/><rect x="-60" y="-10" width="120" height="60" fill="#cfe3f0" ${S6}/>`,
  balanco: `<path d="M-80 80L-50 -70H50L80 80" fill="none" stroke="#8a5e3c" stroke-width="14" stroke-linecap="round"/><path d="M-20 -70v90M20 -70v90" fill="none" stroke="${TINTA}" stroke-width="5"/><rect x="-34" y="18" width="68" height="16" rx="6" fill="${AMBAR}" ${S6}/>`,
  tesoura: `<circle cx="-40" cy="40" r="24" fill="none" stroke="${VERM}" stroke-width="12"/><circle cx="40" cy="40" r="24" fill="none" stroke="${VERM}" stroke-width="12"/><path d="M-24 22L40 -70M24 22L-40 -70" stroke="${CINZA}" stroke-width="12" stroke-linecap="round"/>`,
  camera: `<rect x="-90" y="-50" width="180" height="120" rx="16" fill="#33363b" ${S6}/><rect x="-40" y="-76" width="60" height="30" rx="6" fill="#33363b" ${S6}/><circle cx="0" cy="10" r="40" fill="#5f6b78" ${S6}/><circle cx="0" cy="10" r="18" fill="#cfe3f0"/>`,
  filme: `<rect x="-100" y="-50" width="200" height="100" fill="#2a2d33" ${S6}/>` + [-80, -40, 0, 40, 80].map(x => `<rect x="${x - 8}" y="-44" width="16" height="12" fill="${BRANCO}"/><rect x="${x - 8}" y="32" width="16" height="12" fill="${BRANCO}"/>`).join('') + `<rect x="-70" y="-24" width="60" height="48" fill="${AMBAR}"/><rect x="10" y="-24" width="60" height="48" fill="${ROSA}"/>`,
  aviao: `<path d="M-90 0L70 -10q30 0 30 10t-30 10L-90 0z" fill="${BRANCO}" ${S6}/><path d="M0 -6L-40 -70h24L40 -6zM0 6L-40 70h24L40 6z" fill="${AZUL}" ${S6}/>`,
  mesa: `<rect x="-90" y="10" width="180" height="20" rx="6" fill="#8a5e3c" ${S6}/><ellipse cx="0" cy="-10" rx="60" ry="30" fill="${AMBAR}" ${S6}/><path d="M-60 -10q60 -60 120 0" fill="#c27b3a" ${S6}/>`,
  bike: `<circle cx="-56" cy="30" r="40" fill="none" stroke="${TINTA}" stroke-width="10"/><circle cx="56" cy="30" r="40" fill="none" stroke="${TINTA}" stroke-width="10"/><path d="M-56 30L-14 -30H40L56 30M-14 -30L6 30L40 -30M-24 -50h24M40 -30l-10 -24h20" fill="none" stroke="${TURQ}" stroke-width="10" stroke-linecap="round"/>`,
  oculos: `<circle cx="-56" r="46" fill="${ROSA}" opacity=".75" ${S6}/><circle cx="56" r="46" fill="${ROSA}" opacity=".75" ${S6}/><path d="M-10 -6q10 -10 20 0M-102 -10l-30 -16M102 -10l30 -16" fill="none" ${S6}/>`,
  anilha: `<circle r="70" fill="#3b3e44" ${S6}/><circle r="18" fill="${PAPEL}" ${S6}/>`,
  prova: `<rect x="-60" y="-80" width="120" height="160" rx="8" fill="${BRANCO}" ${S6}/><path d="M-36 -44h72M-36 -14h72" stroke="${CINZA}" stroke-width="8" stroke-linecap="round"/><text x="0" y="62" font-family="Segoe UI" font-weight="700" font-size="60" fill="${VERM}" text-anchor="middle">?</text>`,
  porta: `<rect x="-50" y="-80" width="100" height="160" fill="#8a5e3c" ${S6}/><circle cx="30" cy="0" r="8" fill="${AMAR}"/><path d="M70 -30l30 -20M74 0h36M70 30l30 20" stroke="${VERM}" stroke-width="10" stroke-linecap="round"/>`,
  sol: `<circle r="50" fill="${AMAR}" ${S6}/>` + [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M${70 * Math.cos(i * Math.PI / 4)} ${70 * Math.sin(i * Math.PI / 4)}L${92 * Math.cos(i * Math.PI / 4)} ${92 * Math.sin(i * Math.PI / 4)}" stroke="${AMBAR}" stroke-width="10" stroke-linecap="round"/>`).join(''),
  pessoas: `<circle cx="-34" cy="-30" r="24" fill="${AZUL}" ${S6}/><circle cx="34" cy="-30" r="24" fill="${AMBAR}" ${S6}/><path d="M-74 50q0 -50 40 -50q40 0 40 50z" fill="${AZUL}" ${S6}/><path d="M-6 50q0 -50 40 -50q40 0 40 50z" fill="${AMBAR}" ${S6}/>`,
  celular: `<rect x="-50" y="-90" width="100" height="180" rx="16" fill="#22252b" ${S6}/><rect x="-38" y="-74" width="76" height="148" rx="6" fill="#cfe3f0"/>`,
  festa: `<path d="M-50 70L0 -70L50 70Z" fill="${TURQ}" ${S6}/><path d="M-30 20h60M-40 46h80" stroke="${AMAR}" stroke-width="10"/><circle cy="-76" r="12" fill="${VERM}" ${S6}/>`,
  globo: `<circle r="80" fill="#9fd0e6" ${S6}/><path d="M-50 -40q30 -10 40 10t30 20q-10 30 -40 30q-20 -30 -30 -60zM30 -60q30 10 40 40q-20 0 -40 -10z" fill="${TURQ}" ${S6}/>`,
  pin: `<path d="M0 70Q-60 0 -60 -30a60 60 0 1 1 120 0Q60 0 0 70z" fill="${VERM}" ${S6}/><circle cy="-30" r="22" fill="${BRANCO}" ${S6}/>`,
  placa: `<path d="M0 90V-60" stroke="#8a5e3c" stroke-width="14"/><path d="M-90 -80h80l20 20l-20 20h-80z" fill="${BRANCO}" ${S6}/><path d="M90 -30h-80l-20 20l20 20h80z" fill="${BRANCO}" ${S6}/>`,
  gatilho: `<rect x="-90" y="-40" width="140" height="50" rx="12" fill="${CINZA}" ${S6}/><path d="M-10 10q0 40 30 50" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/><path d="M-60 10l-10 60h40l10 -60" fill="#8a5e3c" ${S6}/>`,
  cadeado: `<path d="M-40 -10v-30q0 -40 40 -40q40 0 40 40v30" fill="none" stroke="${TINTA}" stroke-width="14"/><rect x="-60" y="-10" width="120" height="90" rx="14" fill="${AMBAR}" ${S6}/><circle cy="30" r="12" fill="${TINTA}"/>`,
  lupa: `<circle cx="-14" cy="-14" r="56" fill="#cfe3f0" ${S6}/><path d="M28 28l50 50" stroke="${TINTA}" stroke-width="22" stroke-linecap="round"/>`,
  peca: `<path d="M-60 -60h40q0 -26 20 -26t20 26h40v40q26 0 26 20t-26 20v40h-40q0 -26 -20 -26t-20 26h-40z" fill="${AMBAR}" ${S6}/>`,
  sino: ICON.sino, conta: ICON.conta, livro: ICON.livro, check: ICON.check,
  estrela: `<path d="M0 -70L18 -22L70 -20L28 10L44 62L0 32L-44 62L-28 10L-70 -20L-18 -22Z" fill="${AMAR}" ${S6}/>`,
  aula: `<rect x="-90" y="-60" width="180" height="110" rx="6" fill="#2f5d50" ${S6}/><path d="M-60 -24h80M-60 4h120" stroke="${BRANCO}" stroke-width="8" stroke-linecap="round"/><path d="M-40 50v30M40 50v30" stroke="${TINTA}" stroke-width="10"/>`,
  panela: `<rect x="-70" y="-20" width="140" height="80" rx="12" fill="#9aa3ad" ${S6}/><rect x="-84" y="-34" width="168" height="22" rx="8" fill="#b7bec6" ${S6}/><path d="M-20 -50q-10 -16 0 -32M20 -50q-10 -16 0 -32" fill="none" ${S6}/>`,
  controle: `<path d="M-80 0q0 -40 40 -40h80q40 0 40 40l10 40q4 24 -20 24q-14 0 -30 -24h-80q-16 24 -30 24q-24 0 -20 -24z" fill="#3b3e44" ${S6}/><path d="M-50 -6h30M-35 -21v30" stroke="${BRANCO}" stroke-width="8" stroke-linecap="round"/><circle cx="40" cy="-14" r="8" fill="${VERM}"/><circle cx="56" cy="2" r="8" fill="${AMAR}"/>`,
  claquete: `<rect x="-90" y="-30" width="180" height="110" rx="6" fill="#2a2d33" ${S6}/><path d="M-90 -30L-80 -80L96 -56L90 -30z" fill="${BRANCO}" ${S6}/><path d="M-50 -76L-60 -32M0 -70L-10 -30M50 -62L40 -30" stroke="${TINTA}" stroke-width="12"/>`,
  maoApoio: `<path d="M-30 50V-10q0 -14 12 -14t12 14V-40q0 -14 12 -14t12 14v20q0 -12 12 -12t12 12v70z" fill="#d8d8d8" ${S6}/>`,
  saida: `<rect x="-100" y="-50" width="200" height="100" rx="10" fill="${TURQ}" ${S6}/><path d="M-60 0h80M0 -24l24 24l-24 24" fill="none" stroke="${BRANCO}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`,
  postit: ICON.postit, cracha: ICON.cracha,
};
const ic = (n, x, y, s = 1, o = {}) => g(I[n], { x, y, s, ...o });
const risca = (x0, x1, y, k, cor = VERM) => k <= 0 ? '' : `<path d="M${x0} ${y}L${x0 + (x1 - x0) * k} ${y}" stroke="${cor}" stroke-width="18" stroke-linecap="round"/>`;
const pessoaMini = (cor, x, y, s = 1, op = 1) => g(`<circle cy="-30" r="20" fill="${cor}" ${S6}/><path d="M-34 40q0 -50 34 -50q34 0 34 50z" fill="${cor}" ${S6}/>`, { x, y, s, op });
const P = (f, o) => prota(t => { const q = f(t);
  return { s: .5, tronco: .6 * resp(t), cab: 0, br: { E: [19, -7, 0], D: [-18, 9, 0] }, pe: { E: [3, -1, -2], D: [-3, 1, 2] }, ...q,
    rosto: { pisca: piscar(t, [1.1, 3.9, 6.6, 9.4]), ...(q.rosto || {}) } }; }, o);
const triste = { sorriso: -.4, sobr: 4, sobrIn: .8 }, feliz = { sorriso: 1 };

const titulo = (s, t, t0 = 0, { y = 540, tam = 120, cor = TINTA } = {}) => { const k = ent(t, t0); return g(txt(s, 0, 0, { tam, cor }), { x: 960, y: y + (1 - k) * 30, s: .94 + .06 * k, op: k }); };
const leg = (s, t, t0, { y = 880, tam = 54, cor = TINTA } = {}) => g(txt(s, 0, 0, { tam, cor }), { x: 960, y: y + (1 - ent(t, t0)) * 20, op: ent(t, t0) });
const mostraPrint = (f, w, legenda, { quente = false, desfoque = false } = {}) => a => [fundo(quente ? QUENTE : PAPEL), raw('print', t => {
  const p = print(f), k = ent(t, 0, .7);
  let corpo = g(imagem(p, 0, 0, w), { x: 960, y: 450 + (1 - k) * 40, s: 1 + .04 * clamp(t / 7), op: k });
  if (desfoque) corpo = `<defs><filter id="bl" filterUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><feGaussianBlur stdDeviation="22"/></filter></defs><g filter="url(#bl)">${corpo}</g>` + g(txt('?', 0, 0, { tam: 260, cor: AMBAR }), { x: 960, y: 520, op: ent(t, .5) });
  return corpo + (legenda ? txt(legenda, 960, 870, { tam: 40, peso: 600, cor: '#555', op: ent(t, .4) }) : ''); })];
const icFala = (L, a, y = 540, gap = 400, tam = 44) => raw('ícones', t => L.map(([n, l, w], i) => { const k = ent(t, w - a - .15, .4), x = 960 + (i - (L.length - 1) / 2) * gap;
  return g(ic(n, 0, -30, 1.2) + (l ? txt(l, 0, 130, { tam }) : ''), { x, y: y + (1 - k) * 30, s: .9 + .1 * k, op: k }); }).join(''));
const tres = (L, foco, { quente = false } = {}) => a => [fundo(quente ? QUENTE : PAPEL), raw('três', t => L.map(([n, l], i) => { const on = i < foco ? 1 : i === foco ? ent(t, .15, .45) : 0, x = 480 + i * 480;
  const pop = i === foco ? 1 + .06 * pico(t, .5, .3) : 1;
  return g(cartao(380, 440, { fill: on > .5 ? BRANCO : CINZA2 }) + (on > 0 ? g(ic(n, 0, -40, 1.1), { op: on }) + txt(l, 0, 150, { tam: 40, op: on }) : txt('?', 0, 60, { tam: 160, cor: '#bdb8ae' })),
    { x, y: 540, s: pop, op: ent(t, i * .1) }); }).join(''))];
const polaroid = (cor = AMBAR, rot = 0, desbota = 0, conteudo = '') => g(`<rect x="-120" y="-140" width="240" height="280" fill="${BRANCO}" ${S6}/><rect x="-100" y="-120" width="200" height="190" fill="${cor}" opacity="${1 - desbota * .85}"/>` + conteudo, { r: rot });
const guardados = (t, k = 1) => g(ic('receita', 0, 0, .55), { x: 1720, y: 120, op: k }) + g(cartao(150, 100, { fill: '#fdebd3' }) + txt('2008', 0, 14, { tam: 36, cor: AMBAR }), { x: 1560, y: 120, op: k });
const quente = c => fundo(QUENTE);

const C = {
  M002: mostraPrint('F1', 760, 'Johannes Hofer, Basileia, 1688'),
  M003: a => [fundo(), raw('balão', t => { const k = ent(t, .1);
    return g(ic('balao', 0, 0, 5), { x: 960, y: 500 + (1 - k) * 40, s: .9 + .1 * k, op: k }) + g(txt('tô com saudade', 0, 0, { tam: 76 }), { x: 960, y: 500, op: ent(t, .4) }); })],
  M004: a => [fundo(), raw('carimbo', t => { const k = ent(t, .3, .3);
    return titulo('nostalgia', t, 0, { tam: 170 }) + g(`<rect x="-330" y="-80" width="660" height="160" rx="20" fill="none" stroke="${VERM}" stroke-width="14"/>` + txt('DIAGNÓSTICO', 0, 34, { tam: 96, cor: VERM }), { x: 960, y: 560, r: -10, s: 1.4 - .4 * k, op: k }); })],
  M005: a => { const kn = pw('nostos', 17.2) - a, ka = pw('algos', 20) - a;
    return [fundo(), raw('grego', t => { const k1 = ent(t, kn - .2), k2 = ent(t, ka - .3);
      return g(txt('νόστος', 0, 0, { tam: 140 }) + ic('casa', 0, -230, 1.3) + txt('voltar para casa', 0, 90, { tam: 44, cor: '#666' }), { x: 560, y: 560 + (1 - k1) * 30, op: k1 }) +
        txt('+', 960, 560, { tam: 120, cor: '#999', op: k2 }) +
        g(txt('ἄλγος', 0, 0, { tam: 140 }) + ic('raio', 0, -230, 1.3) + txt('dor', 0, 90, { tam: 44, cor: '#666' }), { x: 1360, y: 560 + (1 - k2) * 30, op: k2 }); })];
  },
  M006: a => [fundo(), raw('funde', t => { const k = io(clamp((t - .1) / .8));
    return g(ic('casa', 0, 0, 1.1), { x: lerp(560, 900, k), y: 360, op: 1 - .3 * k }) + g(ic('raio', 0, 0, 1.1), { x: lerp(1360, 1020, k), y: 360 }) +
      titulo('nostalgia', t, .5, { y: 640, tam: 150, cor: TURQ }) + leg('a dor de querer voltar', t, 1.2, { y: 780, tam: 60 }); })],
  M007: a => { const kc = pw('casa', 34.4) - a;
    return [fundo(), raw('cama', () => `<rect x="300" y="700" width="560" height="120" rx="16" fill="#a6abb3" ${S6}/><rect x="260" y="560" width="50" height="300" rx="10" fill="#8a6d52" ${S6}/>`),
      P(t => ({ pos: [560, 720], s: .5, tronco: 2, cab: 10, rosto: { ...triste, pisca: .3, gx: 10 } })),
      raw('casa longe', t => { const k = ent(t, .6, .8), kv = io(clamp((t - kc + .3) / 1));
        return g(ic('casa', 0, 0, 1.4), { x: 1540, y: 420, op: k }) + `<path d="M800 460Q1180 250 1460 420" fill="none" stroke="${TINTA}" stroke-width="8" stroke-dasharray="18 16" opacity="${k}"/>` +
          g(pessoaMini(TURQ, 0, 0, 1.4), { x: lerp(900, 1500, kv), y: lerp(380, 400, kv) - 80 * Math.sin(Math.PI * kv), op: kv > 0 ? 1 : 0 }); })];
  },
  M009: a => [fundo(), raw('receita', t => { const k = ent(t, .1);
    return g(ic('receita', 0, 0, 3), { x: 760, y: 520 + (1 - k) * 40, op: k }) + g(txt('voltar', 0, 0, { tam: 90, anc: 'start' }) + txt('para casa', 0, 100, { tam: 90, anc: 'start', cor: TURQ }), { x: 1060, y: 500, op: ent(t, .5) }); })],
  M010: a => [fundo(), raw('guarda', t => { const k = io(clamp((t - .3) / 1.1));
    return g(ic('receita', 0, 0, 3), { x: lerp(760, 1720, k), y: lerp(520, 120, k), s: lerp(1, .18, k) }) +
      (k > .95 ? g(`<rect x="-80" y="-80" width="160" height="160" rx="20" fill="none" stroke="${AMBAR}" stroke-width="6" stroke-dasharray="14 10"/>`, { x: 1720, y: 120, op: ent(t, 1.5) }) : ''); })],
  M011: a => [fundo(), raw('anos', t => { const k = io(clamp((t - .3) / 2.4)), ano = Math.round(lerp(1688, 2026, k));
    return guardados(t) + g(txt(String(ano), 0, 0, { tam: 260 }), { x: 960, y: 600, s: 1 + .03 * pico(t, 2.7, .3) }) + leg('338 anos depois', t, 2.6, { y: 780 }); })],
  M012: mostraPrint('F2', 1300, 'Fortune, janeiro de 2026'),
  M013: a => { const k4 = pw('quatrocentos', 51.3) - a;
    return [fundo(), raw('buscas', t => { const k = clamp((t - .2) / (k4 + .8)), pts = [];
      for (let i = 0; i <= 40; i++) { const u = i / 40; if (u > k) break; const y = u < .8 ? 760 - 40 * u - 10 * Math.sin(i) : 760 - 32 - (u - .8) / .2 * 520; pts.push(`${300 + u * 1320} ${y}`); }
      return `<path d="M300 800H1640M300 800V200" stroke="${TINTA}" stroke-width="6"/>` + txt('buscas por "2016"', 300, 170, { tam: 44, anc: 'start', cor: '#666' }) +
        (pts.length > 1 ? `<path d="M${pts.join('L')}" fill="none" stroke="${VERM}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
        g(txt('+450%', 0, 0, { tam: 180, cor: VERM }), { x: 1180, y: 420, op: ent(t, k4 - a * 0 - .1), s: .9 + .1 * ent(t, k4) }); })];
  },
  M014: a => [fundo(), raw('grade', t => { let s = ''; const n = Math.floor(clamp(t / 2.6) * 96);
    for (let i = 0; i < 96; i++) if (i < n) { const c = i % 16, r = Math.floor(i / 16); s += `<rect x="${180 + c * 100}" y="${120 + r * 100}" width="84" height="84" rx="10" fill="${[TURQ, AMBAR, AZUL, ROSA][i % 4]}" ${S6}/>`; }
    return s + g(`<rect x="-420" y="-80" width="840" height="160" rx="30" fill="${BRANCO}" ${S6}/>` + txt('1,6 milhão de vídeos', 0, 26, { tam: 76 }), { x: 960, y: 900, op: ent(t, 1) }); })],
  M015: a => [fundo(), raw('bolo', t => { const k = ent(t, .1);
    return g(`<rect x="-240" y="-60" width="480" height="200" rx="20" fill="${ROSA}" ${S6}/><path d="M-240 -10q60 40 120 0t120 0t120 0t120 0" fill="none" stroke="${BRANCO}" stroke-width="16"/>` + txt('2016', 0, 100, { tam: 110, cor: BRANCO }) +
      `<rect x="-14" y="-170" width="28" height="110" fill="${AMAR}" ${S6}/>` + `<path d="M0 -230q-22 30 0 50q22 -20 0 -50z" fill="${AMBAR}" opacity="${.7 + .3 * Math.sin(t * 9)}"/>`, { x: 960, y: 520 + (1 - k) * 40, op: k }) +
      leg('10 anos', t, .8, { y: 880, tam: 70 }); })],
  M016: a => [fundo(), raw('pior', t => { const k = ent(t, .1);
    return g(nuvem(520, 300, [0, 1]) + ic('raio', 0, 170, 1.2), { x: 960, y: 380 + 8 * Math.sin(t * 2), op: k }) + titulo('2016: o pior ano?', t, .6, { y: 800, tam: 100 }); })],
  M017: a => { const k12 = pw('doze', 73) - a;
    return [fundo(), raw('ibge', t => { const k = clamp((t - .4) / (k12 - .4));
      const anos = [['2014', 6.5], ['2015', 9], ['2016', 12]];
      return g(cartao(1100, 760), { x: 960, y: 500, op: ent(t, 0) }) + txt('IBGE · PNAD Contínua · desocupação no 4º tri', 960, 200, { tam: 40, cor: '#555', op: ent(t, 0) }) +
        anos.map(([y, v], i) => { const kk = clamp(k * 3 - i), h = v / 12 * 440 * kk, x = 660 + i * 300;
          return `<rect x="${x - 70}" y="${760 - h}" width="140" height="${h}" rx="8" fill="${i === 2 ? VERM : CINZA}" ${S6}/>` + txt(y, x, 820, { tam: 44 }) + (kk > .9 ? txt(`${String(v).replace('.', ',')}%`, x, 740 - h, { tam: i === 2 ? 70 : 44, cor: i === 2 ? VERM : TINTA }) : ''); }).join(''); })];
  },
  M018: mostraPrint('F9', 1240, 'uma pesquisa de 2008', { desfoque: true }),
  M019: a => [fundo(), raw('contrário', t => { const k = io(clamp((t - .3) / .9));
    return g(`<path d="M-200 0H160M100 -60L180 0L100 60" fill="none" stroke="${TURQ}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>`, { x: 960, y: 500, r: 180 * k }) + leg('o contrário do que parece', t, 1.1, { y: 760, tam: 70 }); })],
  M020: a => [fundo(), raw('guarda 2', t => { const k = io(clamp((t - .3) / 1.1));
    return g(ic('receita', 0, 0, .55), { x: 1720, y: 120 }) + g(cartao(150, 100, { fill: '#fdebd3' }) + txt('2008', 0, 14, { tam: 36, cor: AMBAR }), { x: lerp(960, 1560, k), y: lerp(540, 120, k), s: lerp(3, 1, k) }); })],
  M022: a => { const like = pw('like', 97.6) - a, insc = pw('inscreve', 98.5) - a;
    return [fundo(), P(t => { const k = io(clamp((t - .4) / .6));
      return { pos: [560, 720], s: .62, br: { E: [19, -7, 0], D: [lerp(-18, -88, k), lerp(9, -4, k), 0] }, mao: { D: k > .5 ? 'aponta' : 'costas' }, rosto: { sorriso: .8, gx: 8 * k, sobr: 2 } }; }),
      raw('botões', t => { const kl = ent(t, like - .1, .35), ki = ent(t, insc, .35), pl = 1 - .06 * pico(t, like + .15, .15), pi = 1 - .06 * pico(t, insc + .15, .15);
        const b1 = `<rect x="-200" y="-64" width="400" height="128" rx="64" fill="${kl > .5 ? TURQ : BRANCO}" ${S6}/>` + g(ICON.like, { x: -110, y: 4, s: .7 }) + txt('Gostei', 40, 22, { tam: 52, cor: kl > .5 ? BRANCO : TINTA });
        const b2 = `<rect x="-240" y="-64" width="480" height="128" rx="64" fill="${ki > .5 ? '#cfcac2' : VERM}" ${S6}/>` + txt(ki > .5 ? 'Inscrito' : 'Inscrever-se', ki > .5 ? 20 : 0, 22, { tam: 52, cor: ki > .5 ? TINTA : BRANCO }) + (ki > .5 ? g(ICON.sino, { x: -150, y: 0, s: .7 }) : '');
        return surge(b1, t, .3, { x: 1360, y: 440, s: pl }) + surge(b2, t, .6, { x: 1360, y: 650, s: pi }); })];
  },
  M023: tres([['lente', 'a memória'], ['coracao', 'do que sente falta'], ['bussola', 'usar a seu favor']], 0),
  M024: tres([['lente', 'a memória'], ['coracao', 'do que sente falta'], ['bussola', 'usar a seu favor']], 1),
  M025: tres([['lente', 'a memória'], ['coracao', 'do que sente falta'], ['bussola', 'usar a seu favor']], 2),
  M028: a => [fundo('#2d3240'), raw('polaroid', t => g(polaroid('#cfe3f0', -4), { x: 960, y: 520, s: 2.4, op: ent(t, 0) })),
    P(t => ({ pos: [960, 640], s: .42, rosto: { sorriso: 1, gx: 0 } })),
    raw('filtro', t => { const k = ent(t, .3, .4);
      return g(`<path d="M-120 -40q-40 -90 10 -110q30 30 40 80z" fill="#8a5e3c" ${S6}/><path d="M120 -40q40 -90 -10 -110q-30 30 -40 80z" fill="#8a5e3c" ${S6}/><ellipse cx="0" cy="40" rx="30" ry="22" fill="${TINTA}"/>`, { x: 960, y: 380, s: .45 + .05 * k, op: k }); })],
  M029: a => [fundo('#2d3240'), raw('notas', t => g(polaroid('#cfe3f0', -4), { x: 960, y: 520, s: 2.4 }) +
    [0, 1, 2, 3].map(i => { const u = ((t * .5 + i * .25) % 1); return g(ic('nota', 0, 0, .7), { x: 960 + (i - 1.5) * 220 + 30 * Math.sin(t * 2 + i), y: 600 - u * 520, op: Math.sin(Math.PI * u) }); }).join(''))],
  M045: a => [fundo(), raw('cronológico', t => { let s = `<rect x="660" y="60" width="600" height="820" rx="30" fill="${BRANCO}" ${S6}/>`;
    for (let i = 0; i < 4; i++) { const k = ent(t, .2 + i * .25, .4); s += g(ic('feed', 0, 0, 2.2), { x: 960, y: 170 + i * 200 + (1 - k) * 20, op: k }) + txt(`${21 - i * 2}:00`, 1300, 186 + i * 200, { tam: 44, anc: 'start', cor: '#666', op: k }); }
    return s + g(txt('em ordem', 0, 0, { tam: 60 }), { x: 380, y: 480, op: ent(t, 1.6) }); })],
  M046: mostraPrint('F11', 1000, 'Instagram, 15 de março de 2016'),
  M047: a => [fundo(), raw('embaralha', t => { let s = `<rect x="660" y="60" width="600" height="820" rx="30" fill="${BRANCO}" ${S6}/>`; const k = io(clamp((t - .4) / 1.4));
    const ordem = [2, 0, 3, 1];
    for (let i = 0; i < 4; i++) s += g(ic('feed', 0, 0, 2.2), { x: 960 + 40 * Math.sin(Math.PI * k) * (i % 2 ? 1 : -1), y: lerp(170 + i * 200, 170 + ordem[i] * 200, k) });
    return s + g(ic('lupa', 0, 0, 1.3), { x: 1500, y: lerp(800, 300, io(clamp((t - 1.8) / 1.2))), op: ent(t, 1.6) }) + g(txt('o algoritmo', 0, 0, { tam: 56 }) + txt('escolhe', 0, 70, { tam: 56 }), { x: 360, y: 460, op: ent(t, 2.2) }); })],
  M048: mostraPrint('F2', 1300, 'Fortune, janeiro de 2026'),
  M049: a => { const ke = pw('economia', 231.3) - a;
    return [fundo(), raw('balança', t => { const r = 12 * io(clamp((t - ke + .2) / .7)), R = r * Math.PI / 180;
      const L = [960 - 380 * Math.cos(R), 420 - 380 * Math.sin(R)], D = [960 + 380 * Math.cos(R), 420 + 380 * Math.sin(R)];
      return `<path d="M960 420V820M860 820h200" fill="none" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/><path d="M${L[0]} ${L[1]}L${D[0]} ${D[1]}" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/><circle cx="960" cy="420" r="22" fill="${AMBAR}" ${S6}/>` +
        g(cartao(330, 130) + txt('filtro', 0, 14, { tam: 50 }), { x: L[0], y: L[1] + 110 }) + g(cartao(330, 130, { fill: '#fdebd3' }) + txt('economia', 0, 14, { tam: 50, cor: AMBAR }), { x: D[0], y: D[1] + 110, op: ent(t, ke - .5) }); })];
  },
  M050: a => [fundo(), raw('barato', t => [['carro', 'corrida barata', 0], ['moto', 'entrega barata', .6]].map(([n, l, d], i) => { const k = ent(t, .2 + d, .5), x = 600 + i * 720;
    return g(ic(n, 0, -40, 1.8) + txt(l, 0, 170, { tam: 50 }) + g(`<circle r="46" fill="${TURQ}" ${S6}/>` + txt('$', 0, 22, { tam: 60, cor: BRANCO }), { x: 160, y: -170, s: .8 + .2 * k }), { x: lerp(x - 300, x, k), y: 520, op: k }); }).join(''))],
  M051: a => { const kb = pw('brincar', 241.5) - a;
    return [fundo(), raw('loja x parque', t => g(ic('loja', 0, 0, 2) + txt('lugar para vender', 0, 220, { tam: 46 }), { x: 560, y: 480, op: ent(t, .1), s: 1 - .1 * ent(t, kb) }) +
      txt('×', 960, 500, { tam: 120, cor: '#999', op: ent(t, .4) }) + g(ic('balanco', 0, 0, 2) + txt('lugar para brincar', 0, 220, { tam: 46, cor: TURQ }), { x: 1360, y: 480 + (1 - ent(t, kb - .3)) * 30, op: ent(t, kb - .3) }))];
  },
  M053: a => { const ke = pw('editora', 250.3) - a;
    return [fundo(), raw('editora', t => { const k = ent(t, ke - .4, .5);
      return g(ic('camera', 0, 0, 2.2), { x: 960, y: 460, op: 1 - k, s: 1 - .2 * k }) + g(ic('filme', 0, 0, 3), { x: 960, y: 460, op: k }) +
        g(ic('tesoura', 0, 0, 1.4), { x: 960 + 60 * Math.sin(t * 8) * k, y: 300, r: 20 * Math.sin(t * 10) * k, op: k }) + leg(k > .5 ? 'editora' : 'câmera', t, .2, { y: 820, tam: 90, cor: k > .5 ? VERM : TINTA }); })];
  },
  M054: mostraPrint('F4', 1240, 'Mitchell, Thompson, Peterson e Cronk (1997)'),
  M055: tres([['aviao', 'Europa, 10 dias'], ['mesa', 'feriado, 4 dias'], ['bike', 'bicicleta, 3 sem.']], -1),
  M056: tres([['aviao', 'Europa, 10 dias'], ['mesa', 'feriado, 4 dias'], ['bike', 'bicicleta, 3 sem.']], 0),
  M057: tres([['aviao', 'Europa, 10 dias'], ['mesa', 'feriado, 4 dias'], ['bike', 'bicicleta, 3 sem.']], 1),
  M059: a => { const L = [['antes', pw('antes', 269.9)], ['durante', pw('durante', 270.5)], ['depois', pw('depois', 271.5)]];
    return [fundo(), raw('linha', t => `<path d="M300 540H1620" stroke="${TINTA}" stroke-width="8" stroke-linecap="round" opacity="${ent(t, 0)}"/>` +
      L.map(([l, w], i) => { const k = ent(t, w - a - .15, .4), x = 460 + i * 500; return g(`<circle r="30" fill="${[TURQ, CINZA, AMBAR][i]}" ${S6}/>` + txt(l, 0, 110, { tam: 60 }), { x, y: 540, s: .8 + .2 * k, op: k }); }).join(''))];
  },
  M060: a => [fundo(), raw('pontos', t => { let s = `<path d="M300 820H1620M300 820V200" stroke="${TINTA}" stroke-width="6"/>`;
    ['antes', 'durante', 'depois'].forEach((l, i) => s += txt(l, 520 + i * 440, 880, { tam: 44 }));
    for (let v = 0; v < 3; v++) { const k = ent(t, .2 + v * .7, .5), ys = [380, 640, 360].map(y => y + v * 20);
      s += `<path d="M520 ${ys[0]}L960 ${ys[1]}L1400 ${ys[2]}" fill="none" stroke="${[AZUL, TURQ, AMBAR][v]}" stroke-width="10" opacity="${k}"/>` + ys.map((y, i) => `<circle cx="${520 + i * 440}" cy="${y}" r="18" fill="${[AZUL, TURQ, AMBAR][v]}" ${S6} opacity="${k}"/>`).join(''); }
    return s; })],
  M063: a => [fundo(), raw('óculos', t => { const k = io(clamp((t - .3) / .8));
    return g(polaroid(AZUL, -3, 0, ic('bike', 0, -20, .8)), { x: 960, y: 450, s: 2 }) + g(ic('oculos', 0, 0, 3), { x: 960, y: lerp(-100, 400, k) }) + leg('visão cor de rosa', t, 1.2, { y: 880, tam: 70, cor: '#c0607a' }); })],
  M064: a => [fundo(), raw('2º', t => titulo('2º mecanismo', t, .1, { tam: 130 }))],
  M065: mostraPrint('F5', 1240, 'Walker, Vogl e Thompson (1997)'),
  M066: a => { const kb = pw('boas', 303.4) - a;
    return [fundo(), raw('desbota', t => { const k = clamp((t - .4) / 3.4);
      return g(polaroid('#6c7380', 4, k) + txt('ruim', 0, 210, { tam: 50 }), { x: 640, y: 480, s: 1.5, op: ent(t, 0) }) +
        g(polaroid(AMBAR, -4, k * .2) + txt('boa', 0, 210, { tam: 50 }), { x: 1280, y: 480, s: 1.5, op: ent(t, kb - .3) }); })];
  },
  M067: a => [fundo(), raw('peso', t => { const k = io(clamp((t - .8) / 1.8));
    return g(polaroid('#6c7380', 4, .8), { x: 760, y: 480, s: 1.5 }) + g(ic('anilha', 0, 0, 1.4), { x: 1240, y: 420 - 200 * k, op: 1 - k }) + leg('o fato fica, o peso some', t, .4, { y: 860 }); })],
  M068: a => { const L = [['prova', 'a prova', pw('prova', 313.4)], ['porta', 'a briga', pw('briga', 314.8)], ['coracao', 'a vergonha', pw('vergonha', 310.2)]];
    return [fundo(), raw('ruins', t => L.map(([n, l, w], i) => { const k = ent(t, w - a - .15, .4), d = clamp((t - (pw('forca', 316.2) - a)) / 1.5);
      return g(polaroid('#c9c4ba', [-5, 3, -2][i], d, ic(n, 0, -25, .8)) + txt(l, 0, 210, { tam: 44, op: 1 - .6 * d }), { x: 480 + i * 480, y: 480 + (1 - k) * 30, s: 1.3, op: k * (1 - .5 * d) }); }).join(''))];
  },
  M070: a => [fundo(), raw('3º', t => titulo('3º mecanismo', t, .1, { tam: 130 }))],
  M071: mostraPrint('F6', 1100, 'pico de reminiscência (David Rubin e colegas)'),
  M072: a => { const k10 = pw('dez', 340.9) - a;
    return [fundo(), raw('curva', t => { const k = clamp((t - .2) / 2.5), pts = [];
      for (let i = 0; i <= 60; i++) { const u = i / 60; if (u > k) break; const age = u * 70, y = 780 - 420 * (Math.exp(-(((age - 20) / 8) ** 2)) * .9 + Math.max(0, (age - 50) / 20) ** 2 * .7 + .05); pts.push(`${300 + u * 1320} ${y}`); }
      const kb = ent(t, k10 - .3, .5);
      return `<rect x="${300 + 10 / 70 * 1320}" y="200" width="${20 / 70 * 1320}" height="600" fill="${AMAR}" opacity="${.45 * kb}"/>` + `<path d="M300 800H1620M300 800V200" stroke="${TINTA}" stroke-width="6"/>` +
        (pts.length > 1 ? `<path d="M${pts.join('L')}" fill="none" stroke="${TURQ}" stroke-width="14" stroke-linecap="round"/>` : '') +
        [0, 10, 20, 30, 40, 50, 60, 70].map(x => txt(String(x), 300 + x / 70 * 1320, 850, { tam: 34, cor: '#666' })).join('') + txt('idade da lembrança', 960, 920, { tam: 40, cor: '#666' }) +
        g(txt('10 a 30 anos', 0, 0, { tam: 70, cor: AMBAR }), { x: 300 + 20 / 70 * 1320, y: 170, op: kb }); })];
  },
  M073: a => { const k16 = pw('tinha', 349.4) - a;
    return [fundo(), raw('régua', t => { const k = io(clamp((t - k16 + .2) / 1));
      let s = `<path d="M260 600H1660" stroke="${TINTA}" stroke-width="8"/>`;
      for (let i = 0; i <= 40; i += 5) s += `<path d="M${260 + i * 35} 580v40" stroke="${TINTA}" stroke-width="6"/>` + txt(String(i), 260 + i * 35, 680, { tam: 36, cor: '#666' });
      const x0 = 260 + lerp(20, 10, k) * 35;
      return s + `<rect x="${x0}" y="500" width="${10 * 35}" height="80" rx="16" fill="${k > .5 ? AMBAR : TURQ}" ${S6}/>` + txt(k > .5 ? 'em 2016' : 'hoje', x0 + 175, 460, { tam: 64 }); })];
  },
  M074: a => [fundo(), icFala([['celular', 'o primeiro celular', pw('celular', 355)], ['festa', 'a primeira festa', pw('festa', 356.5)], ['coracao', 'o primeiro amor', pw('amor', 358.3)]], a, 520, 520)],
  M076: a => [fundo(), raw('2016 riscado', t => titulo('2016', t, 0, { tam: 260 }) + risca(700, 1220, 500, ent(t, .6, .4)))],
  M077: a => [fundo(), raw('15', t => { const k = ent(t, .1);
    return g(polaroid(AMBAR, -4, 0, txt('15', 0, 30, { tam: 120, cor: BRANCO })) + txt('anos em 2016', 0, 210, { tam: 40 }), { x: 960, y: 480 + (1 - k) * 40, s: 1.8, op: k }); })],
  M078: a => { const kb = pw('boleto', 373.6) - a;
    return [fundo(), raw('lista', t => g(ic('conta', 0, 0, 1.6) + risca(-90, 90, 0, ent(t, kb + .3, .4)), { x: 480, y: 480, op: ent(t, kb - .2) })),
      icFala([['casa', 'amigo a uma rua', pw('amigos', 375.6)], ['placa', 'nada decidido', pw('decidir', 378.2)]], a, 510, 620)];
  },
  M080: a => [fundo(), raw('globo', t => g(ic('globo', 0, 0, 3), { x: 960, y: 520, r: t * 10, op: ent(t, 0), s: .94 + .06 * ent(t, 0) }))],
  M081: mostraPrint('F7', 1240, 'Hepper e colegas (2014), Emotion'),
  M082: a => [fundo(), raw('18 países', t => { let s = `<ellipse cx="960" cy="480" rx="760" ry="330" fill="#dfe7ea" ${S6}/>`;
    for (let i = 0; i < 18; i++) { const fr = x => x - Math.floor(x), u = fr(Math.sin(i * 12.9898) * 43758.5), v = fr(Math.sin(i * 78.233) * 12543.7), k = ent(t, .2 + i * .12, .3); s += g(ic('pin', 0, 0, .35), { x: 960 + (u - .5) * 1040, y: 480 + (v - .5) * 360 - 20 * (1 - k), op: k }); }
    return s + leg('18 países · 1.704 estudantes', t, 2.4, { y: 870, tam: 64 }); })],
  M083: a => [fundo(), raw('agridoce', t => ['América', 'Europa', 'África', 'Ásia', 'Oceania'].map((c, i) => { const k = ent(t, .2 + i * .25, .4), x = 260 + i * 350;
    return g(cartao(300, 360) + g(`<path d="M0 50L-50 0q-25 -28 0 -48q25 -16 50 10z" fill="${AMBAR}" ${S6}/><path d="M0 50L50 0q25 -28 0 -48q-25 -16 -50 10z" fill="${AZUL}" ${S6}/>`, { y: -30, s: 1.3 }) + txt(c, 0, 140, { tam: 40 }), { x, y: 500 + (1 - k) * 30, op: k }); }).join('') +
    leg('doce e amarga', t, 1.8, { y: 860, tam: 64 }))],
  M085: mostraPrint('F8', 1240, 'Wildschut, Sedikides, Arndt e Routledge (2006)'),
  M086: a => [fundo(), raw('gatilho', t => g(ic('gatilho', 0, 0, 2.4), { x: 960, y: 460, r: -6 * pico(t, 1.2, .2), op: ent(t, 0) }) + leg('o que dispara a saudade?', t, .5, { y: 820, tam: 70 }))],
  M087: a => { const ks = pw('solidao', 428) - a;
    return [fundo(), raw('nuvem', t => g(nuvem(420, 220, [0, 1]), { x: 960, y: 220 + 6 * Math.sin(t * 2), op: ent(t, .1) }) + leg('humor ruim', t, .3, { y: 230, tam: 50 })),
      P(t => ({ pos: [960, 760], s: .55, cab: 6, rosto: { ...triste, gx: 0, gy: 6 } })),
      raw('vão', t => [-1, 1].map(sd => pessoaMini(CINZA, 960 + sd * lerp(300, 760, io(clamp((t - ks + .4) / 1.2))), 760, 1.6, 1 - .5 * ent(t, ks))).join('') + leg('solidão', t, ks - .2, { y: 1000, tam: 70, cor: VERM }))];
  },
  M088: a => [fundo(), raw('mudanças', t => ['sair de casa', 'outra cidade', 'grupo novo', 'emprego novo'].map((l, i) => { const k = ent(t, .1 + i * .18, .4);
    return g(cartao(520, 110) + txt(l, 0, 16, { tam: 46 }), { x: 960 + (i % 2 ? 40 : -40), y: 820 - i * 140 - (1 - k) * 60, r: (i % 2 ? 3 : -3), op: k }); }).join('') + leg('ao mesmo tempo', t, .9, { y: 140, tam: 60 }))],
  M090: a => { const kg = pw('grupo', 437.9) - a;
    return [fundo(), raw('cidade e grupo', t => { const kc = io(clamp((t - .1) / .8)), kd = io(clamp((t - kg + .2) / 1));
      return g(ic('pin', 0, 0, 1.2), { x: lerp(300, 620, kc), y: 420 - 120 * Math.sin(Math.PI * kc) }) + `<path d="M300 520Q460 340 620 520" fill="none" stroke="${TINTA}" stroke-width="6" stroke-dasharray="14 12"/>` +
        [0, 1, 2, 3, 4].map(i => { const a0 = i / 5 * Math.PI * 2; return pessoaMini([TURQ, AMBAR, AZUL, VERM, ROSA][i], 1300 + Math.cos(a0) * (110 + 260 * kd), 480 + Math.sin(a0) * (90 + 200 * kd), 1.3, 1 - .4 * kd); }).join(''); })];
  },
  M092: a => [fundo(), raw('perfeito', t => titulo('2016 era perfeito', t, 0, { tam: 120 }) + risca(420, 1500, 500, ent(t, 1, .5)))],
  M093: a => [fundo(), raw('bateria', t => { const c = lerp(.5, .12, clamp((t - .3) / 2));
    return g(bateria(c), { x: 960, y: 460, s: 3.4 }) + leg('cansada de agora', t, .6, { y: 800, tam: 70 }); })],
  M095: a => { const kp = pw('problemas', 465.8) - a, ke = pw('editada', 468.9) - a;
    return [fundo(), raw('balança', t => { const r = 14 * io(clamp((t - kp) / .8)), R = r * Math.PI / 180;
      const L = [960 - 400 * Math.cos(R), 360 - 400 * Math.sin(R)], D = [960 + 400 * Math.cos(R), 360 + 400 * Math.sin(R)];
      const pilha = [0, 1, 2, 3, 4].map(i => g(ic('conta', 0, 0, .7), { y: -i * 46, r: (i % 2 ? 6 : -5) })).join('');
      return `<path d="M960 360V860M860 860h200" fill="none" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/><path d="M${L[0]} ${L[1]}L${D[0]} ${D[1]}" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/><circle cx="960" cy="360" r="22" fill="${AMBAR}" ${S6}/>` +
        g(pilha + txt('hoje', 0, 110, { tam: 50 }), { x: L[0], y: L[1] + 160, op: ent(t, .2) }) +
        g(polaroid(AMAR, -3, 0, ic('sol', 0, -25, .9)) + ic('tesoura', 130, -130, .55) + txt('lembrança editada', 0, 210, { tam: 40 }), { x: D[0], y: D[1] + 110, s: .9, op: ent(t, .6) }) +
        `<path d="M${D[0] - 120} ${D[1] - 20}l40 40M${D[0] + 80} ${D[1] - 10}l30 30" stroke="${VERM}" stroke-width="8" stroke-dasharray="10 8" opacity="${ent(t, ke - .2)}"/>`; })];
  },
  M096: a => [fundo(), raw('placar', t => { const k = ent(t, .1);
    return g(`<rect x="-480" y="-150" width="960" height="300" rx="30" fill="#2a2d33" ${S6}/>` + txt('presente', -240, -60, { tam: 50, cor: BRANCO }) + txt('filme', 240, -60, { tam: 50, cor: BRANCO }) +
      txt('0', -240, 90, { tam: 160, cor: VERM }) + txt(String(Math.min(10, Math.floor(clamp((t - .4) / 1.4) * 10))), 240, 90, { tam: 160, cor: AMAR }), { x: 960, y: 520, s: .92 + .08 * k, op: k }); })],
  M097: a => [fundo('#2d3240'), raw('cinema', t => { const k = io(clamp((t - .3) / 1.2));
    return g(`<rect x="-600" y="-300" width="1200" height="600" fill="${AMAR}" opacity=".9" ${S6}/>` + ic('sol', 0, -20, 2) , { x: 960, y: 420, s: lerp(.4, .9, k) }) +
      g(ic('claquete', 0, 0, 1.3), { x: 300, y: 800, op: ent(t, 1.4) }) + [0, 1, 2].map(i => g(ic('nota', 0, 0, .7), { x: 1400 + i * 140, y: 800 - 30 * Math.sin(t * 3 + i), op: ent(t, 1.8 + i * .2) })).join('') +
      leg('as melhores cenas', t, 2.4, { y: 880, tam: 50, cor: BRANCO }); })],
  M098: a => [fundo(), raw('voltam', t => { const k = io(clamp((t - .1) / 1.1));
    return g(ic('receita', 0, 0, 2.4), { x: lerp(1720, 700, k), y: lerp(120, 520, k), s: lerp(.23, 1, k) }) +
      g(cartao(300, 200, { fill: '#fdebd3' }) + txt('2008', 0, 24, { tam: 80, cor: AMBAR }), { x: lerp(1560, 1240, k), y: lerp(120, 520, k), s: lerp(.5, 1.3, k) }); })],
  M099: mostraPrint('F9', 1240, 'Zhou, Sedikides, Wildschut e Gao (2008), Psychological Science'),
  M100: a => { const L = [['Xinyue Zhou', 'China', pw('zhou', 487)], ['Constantine Sedikides', 'Southampton', pw('sedikides', 491)], ['Tim Wildschut', 'Southampton', pw('wildschut', 492.5)]];
    return [fundo(), raw('autores', t => L.map(([n, u, w], i) => { const k = ent(t, w - a - .3, .4);
      return g(cartao(500, 160) + txt(n, 0, -4, { tam: 44 }) + txt(u, 0, 50, { tam: 32, cor: '#666', peso: 400 }), { x: 960, y: 260 + i * 220 + (1 - k) * 30, op: k }); }).join(''))];
  },
  M101: a => [fundo(), raw('estudos', t => txt('4 estudos', 960, 200, { tam: 80, op: ent(t, 0) })),
    icFala([['estrela', 'crianças', pw('criancas', 494.9)], ['livro', 'universitários', pw('universitarios', 495.9)], ['cracha', 'operários', pw('operarios', 497.3)]], a, 560, 480)],
  M102: a => [fundo(), raw('pontos', t => { let s = `<path d="M300 820H1620M300 820V200" stroke="${TINTA}" stroke-width="6"/>` + txt('solidão →', 1500, 880, { tam: 40, cor: '#666' }) + g(txt('saudade →', 0, 0, { tam: 40, cor: '#666' }), { x: 240, y: 300, r: -90 });
    for (let i = 0; i < 30; i++) { const u = (i * .618) % 1, k = ent(t, .2 + i * .05, .3); s += `<circle cx="${360 + u * 1200}" cy="${780 - u * 480 - ((i * .377) % 1 - .5) * 160}" r="14" fill="${TURQ}" opacity="${k}"/>`; }
    return s + `<path d="M360 780L1560 300" stroke="${AMBAR}" stroke-width="10" stroke-dasharray="20 14" opacity="${ent(t, 2.2)}"/>`; })],
  M103: a => { const kc = pw('contar', 514.3) - a, kl = pw('lembravam', 509) - a;
    return [fundo(), P(t => ({ pos: [960, 720], s: .58, cab: -4, rosto: { sorriso: lerp(0, .9, ent(t, kl)), gx: -4, gy: -6 } })),
      raw('lembra', t => g(nuvem(360, 220, [1, 1]) + g(polaroid(AMBAR, -4, 0, ic('pessoas', 0, -20, .8)), { s: .45 }), { x: 640, y: 260, op: ent(t, kl - .4) }) +
        [[-460, 760], [-340, 520], [380, 540], [480, 780], [0, 360]].map(([dx, y], i) => g(ic('maoApoio', 0, 0, 1.2), { x: 960 + dx, y: y + (1 - ent(t, kc - 2.4 + i * .3)) * 40, r: dx > 0 ? -20 : 20, op: ent(t, kc - 2.4 + i * .3) })).join(''))];
  },
  M104: mostraPrint('F10', 1240, 'Routledge e colegas (2011)'),
  M105: a => { const ks = pw('sentido', 526) - a;
    return [fundo(), raw('medidor', t => { const k = io(clamp((t - .3) / (ks))), ang = lerp(-80, 60, k);
      return `<path d="M560 700A400 400 0 0 1 1360 700" fill="none" stroke="${CINZA2}" stroke-width="60"/><path d="M560 700A400 400 0 0 1 ${960 + 400 * Math.sin(ang * Math.PI / 180)} ${700 - 400 * Math.cos(ang * Math.PI / 180)}" fill="none" stroke="${TURQ}" stroke-width="60"/>` +
        g(`<path d="M0 0V-330" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/><circle r="30" fill="${AMBAR}" ${S6}/>`, { x: 960, y: 700, r: ang }) + leg('sentido na vida', t, .4, { y: 880, tam: 70 }); })];
  },
  M106: a => { const kl = pw('lembrete', 532.5) - a;
    return [fundo(), raw('fuga', t => { const k = ent(t, kl - .5, .5);
      return g(ic('saida', 0, 0, 2.4) + risca(-120, 120, 0, ent(t, .6, .4)) + txt('fuga', 0, 170, { tam: 60 }), { x: 960, y: 480, op: 1 - k, s: 1 - .2 * k }) +
        g(ic('postit', 0, 0, 2.6) + txt('lembrete', 0, 0, { tam: 44 }), { x: 960, y: 480 + (1 - k) * 40, op: k, r: -3 }); })];
  },
  M109: a => [quente(), raw('trancado', t => g(cartao(560, 300) + txt('2016', 0, 40, { tam: 140, cor: '#999' }), { x: 960, y: 480, op: ent(t, 0) }) + g(ic('cadeado', 0, 0, 1.6), { x: 1180, y: 600, op: ent(t, .5), r: 6 * pico(t, 1, .2) }) +
    leg('não dá para voltar', t, 1, { y: 860, tam: 64 }))],
  M110: a => [quente(), raw('lupa', t => g(ic('lupa', 0, 0, 2.6), { x: 960 + 120 * Math.sin(t * 1.4), y: 460, op: ent(t, 0) }) + leg('do que exatamente?', t, .5, { y: 840, tam: 80 }))],
  M111: a => [quente(), raw('peça', t => { const k = io(clamp((t - .6) / 1.6));
    return g(cartao(420, 300) + txt('2016', 0, 120, { tam: 50, cor: '#999' }), { x: 480, y: 480 }) + g(cartao(420, 300) + txt('2026', 0, 120, { tam: 50, cor: TURQ }) +
      `<path d="M-60 -60h40q0 -26 20 -26t20 26h40v40q26 0 26 20t-26 20v40h-40q0 -26 -20 -26t-20 26h-40z" fill="none" stroke="#bbb" stroke-width="6" stroke-dasharray="12 10"/>`, { x: 1440, y: 480 }) +
      g(ic('peca', 0, 0, 1), { x: lerp(480, 1440, k), y: 480 - 200 * Math.sin(Math.PI * k), r: 360 * k * .25 }); })],
  M113: a => [quente(), raw('mensagem', t => { const k = ent(t, .3);
    return g(ic('celular', 0, 0, 3.4), { x: 960, y: 520 }) + g(`<rect x="-200" y="-50" width="400" height="100" rx="40" fill="${TURQ}" ${S6}/>` + txt('lembrei de você', 0, 14, { tam: 40, cor: BRANCO }), { x: 960, y: 520 + (1 - k) * 60, s: .9 + .1 * k, op: k }); })],
  M114: a => [quente(), raw('fio', t => { const kb = pw('briga', 567.4) - a, ks = pw('silencio', 568.7) - a, d = clamp((t - ks) / 1);
    return pessoaMini(TURQ, 520, 560, 2.4) + pessoaMini(AMBAR, 1400, 560, 2.4) +
      `<path d="M600 520Q960 ${560 + 30 * Math.sin(t * 2)} 1320 520" fill="none" stroke="${VERM}" stroke-width="10" opacity="${1 - .85 * d}" stroke-dasharray="${d > 0 ? '20 ' + (6 + 30 * d) : 'none'}"/>` +
      leg('no silêncio', t, ks - .2, { y: 860, tam: 64 }); })],
  M115: a => [quente(), raw('sino', t => g(ic('sino', 0, 0, 3) + risca(-130, 130, 0, ent(t, .6, .4)), { x: 960, y: 460, r: 8 * Math.sin(t * 12) * (1 - ent(t, .6)), op: ent(t, 0) }) + leg('menos notificação', t, .8, { y: 820, tam: 64 }))],
  M116: a => [quente(), raw('seguindo', t => { const n = Math.round(lerp(1240, 180, io(clamp((t - .3) / 2))));
    return g(cartao(600, 260) + txt(n.toLocaleString('pt-BR'), 0, 30, { tam: 120 }) + txt('seguindo', 0, 100, { tam: 40, cor: '#666' }), { x: 960, y: 500, op: ent(t, 0) }); })],
  M118: a => [quente(), raw('1ª vez', t => g(ic('estrela', 0, 0, 3), { x: 960, y: 440, r: 10 * t, op: ent(t, 0), s: .9 + .1 * ent(t, 0) }) + leg('primeira vez', t, .4, { y: 800, tam: 80 }))],
  M119: a => [quente(), icFala([['pin', 'um lugar', pw('lugar', 585.5)], ['aula', 'uma aula', pw('aula', 586.3)], ['panela', 'uma receita', pw('receita', 587.4)]], a, 520, 480)],
  M120: a => [quente(), raw('meses', t => { let s = '';
    for (let i = 0; i < 12; i++) { const c = i % 6, r = Math.floor(i / 6), on = i === 7 ? ent(t, 1.2, .5) : 0;
      s += g(`<rect x="-100" y="-80" width="200" height="160" rx="16" fill="${on > .5 ? AMAR : BRANCO}" ${S6}/>` + (on > .5 ? ic('estrela', 0, 0, .7) : ''), { x: 410 + c * 220, y: 380 + r * 220, op: ent(t, i * .05, .3), s: i === 7 ? 1 + .1 * pico(t, 1.4, .3) : 1 }); }
    return s + leg('o mês que vira lembrança', t, 1.6, { y: 870, tam: 60 }); })],
  M121: a => [quente(), raw('semana', t => { let s = '';
    ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].forEach((d, i) => { s += txt(d, 330 + i * 210, 260, { tam: 40, cor: '#666' }) + `<rect x="${240 + i * 210}" y="290" width="180" height="440" rx="14" fill="${BRANCO}" ${S6}/>`;
      if (i < 5) s += `<rect x="${256 + i * 210}" y="${320 + (i % 3) * 60}" width="148" height="70" rx="10" fill="${CINZA2}"/>`; });
    const k = ent(t, .6, .5);
    return s + g(`<rect x="-80" y="-110" width="160" height="220" rx="14" fill="${TURQ}" ${S6}/>` + ic('controle', 0, -20, .7) + txt('brincar', 0, 80, { tam: 34, cor: BRANCO }), { x: 330 + 5 * 210, y: 510 + (1 - k) * 40, op: k }); })],
  M124: a => { const L = [['nuvem', 'ansioso', pw('ansioso', 609.6)], ['feed', 'comparando', pw('vivia', 612.3)], ['relogio', 'com pressa', pw('tempo', 614.5)]];
    return [fundo(), raw('verso', t => { const k = io(clamp((t - .2) / .8)), sx = Math.abs(Math.cos(Math.PI * k));
      return g(k < .5 ? polaroid(AMAR, 0, 0, ic('sol', 0, -25, .9)) : `<rect x="-120" y="-140" width="240" height="280" fill="${BRANCO}" ${S6}/>`, { x: 960, y: 480, s: 2.4 * Math.max(sx, .02) }) +
        (k >= 1 ? L.map(([n, l, w], i) => { const kk = ent(t, w - a - .15, .4);
          return g((n === 'nuvem' ? g(nuvem(180, 110, [0, 0]), {}) : ic(n, 0, 0, .55)) + txt(l, 0, 95, { tam: 34 }), { x: 960, y: 260 + i * 200 + (1 - kk) * 20, op: kk }); }).join('') : ''); })];
  },
  M126: a => [quente(), raw('post', t => { const k = ent(t, .1);
    return g(`<rect x="-330" y="-380" width="660" height="760" rx="24" fill="${BRANCO}" ${S6}/><rect x="-290" y="-300" width="580" height="420" rx="10" fill="${AMBAR}"/>` + ic('sol', 0, -100, 1.2) +
      txt('2026 · bons tempos', -290, 210, { tam: 44, anc: 'start' }) + ic('nota', 220, 300, .6) + `<circle cx="-260" cy="-340" r="22" fill="${TURQ}" ${S6}/>`, { x: 960, y: 540 + (1 - k) * 40, s: .9 + .1 * k, op: k }); })],
  M128: a => [fundo('#e7eef0'), raw('cuidado', t => { const u = .5 - .5 * Math.cos(t / 4 * Math.PI * 2);
    return `<circle cx="960" cy="420" r="${190 + 30 * u}" fill="${AZUL}" opacity=".18"/>` + g(ic('coracao', 0, 0, 2.2), { x: 960, y: 420, s: 1 + .03 * u, op: ent(t, 0) }) +
      leg('tristeza que não passa?', t, .4, { y: 760, tam: 64, cor: '#3c5e7d' }) + leg('converse com um psicólogo', t, 4, { y: 860, tam: 70, cor: TINTA }); })],
  M130: a => [quente(), raw('receita', t => g(ic('receita', 0, 0, 3), { x: 760, y: 520, op: ent(t, 0) }) + g(txt('voltar', 0, 0, { tam: 90, anc: 'start' }) + txt('para casa', 0, 100, { tam: 90, anc: 'start', cor: TURQ }), { x: 1060, y: 500, op: ent(t, .3) }))],
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
