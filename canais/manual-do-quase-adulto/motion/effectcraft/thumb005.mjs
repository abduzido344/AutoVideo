import { Proj, frame, HERE } from './kit.mjs';
import { prota } from './vetor.mjs';
import { TINTA, AMBAR, VERM, AZUL, AMAR, TURQ, BRANCO, raw, g, ICON } from './mg.mjs';

const OUT = `${HERE}/../../videos/005_por_que_voce_vive_cansado_sem_ter_feito_nada/midia/thumbs/02_sete-tipos.png`;
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const I = {
  lua: `<path d="M20 -70a70 70 0 1 0 50 110a56 56 0 1 1 -50 -110z" fill="${AMAR}" ${S6}/>`,
  estrela: `<path d="M0 -70L18 -22L70 -20L28 10L44 62L0 32L-44 62L-28 10L-70 -20L-18 -22Z" fill="${AMAR}" ${S6}/>`,
  coracao: `<path d="M0 60L-60 0q-30 -34 0 -58q30 -20 60 12q30 -32 60 -12q30 24 0 58z" fill="${VERM}" ${S6}/>`,
  tela: `<rect x="-50" y="-90" width="100" height="180" rx="16" fill="#22252b" ${S6}/><rect x="-38" y="-74" width="76" height="148" rx="6" fill="#cfe3f0"/>`,
  sino: ICON.sino,
  aba: `<path d="M-90 30v-34q0 -20 20 -20h140q20 0 20 20v34" fill="${BRANCO}" ${S6}/>`,
  mascara: `<ellipse rx="70" ry="76" fill="${BRANCO}" ${S6}/><circle cx="-24" cy="-12" r="8" fill="${TINTA}"/><circle cx="24" cy="-12" r="8" fill="${TINTA}"/><path d="M-34 20q34 34 68 0" fill="none" stroke="${TINTA}" stroke-width="7" stroke-linecap="round"/>`,
  arvore: `<rect x="-16" y="10" width="32" height="90" fill="#8a6345" ${S6}/><circle cy="-30" r="80" fill="#6aad63" ${S6}/>`,
  nota: `<path d="M-20 50V-50l60 -16v90" fill="none" stroke="${TINTA}" stroke-width="12"/><ellipse cx="-38" cy="52" rx="24" ry="18" fill="${TINTA}"/><ellipse cx="22" cy="34" rx="24" ry="18" fill="${TINTA}"/>`,
  bateria: k => `<rect x="-60" y="-30" width="110" height="60" rx="10" fill="${BRANCO}" ${S6}/><rect x="52" y="-12" width="12" height="24" rx="4" fill="${TINTA}"/><rect x="-50" y="-20" width="${90 * k}" height="40" rx="6" fill="${k > .5 ? TURQ : VERM}"/>`,
};
const T = (partes, x, y, tam, w = 22) => { const sp = f => partes.map(([s, c]) => `<tspan${f ? ` fill="${c}"` : ''}>${s}</tspan>`).join('');
  return `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle" fill="none" stroke="${TINTA}" stroke-width="${w}" stroke-linejoin="round">${sp(false)}</text>` +
  `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle">${sp(true)}</text>`; };
const tracos = (x, y, d) => [-1, 1].map(s => `<path d="M${x + s * d} ${y - 30}l${s * 40} -14M${x + s * d} ${y}l${s * 50} 0M${x + s * d} ${y + 30}l${s * 40} 14" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/>`).join('');
const rotulo = (s, x, y) => { const w = s.length * 26 + 50; return `<rect x="${x - w / 2}" y="${y - 30}" width="${w}" height="54" rx="14" fill="${BRANCO}" ${S6}/>` + `<text x="${x}" y="${y + 11}" font-family="Segoe UI" font-weight="800" font-size="36" text-anchor="middle" fill="${TINTA}">${s}</text>`; };
const ROW = ['cabeloTras', 'tronco', 'cabeca', 'cabelo', 'sobrancelhas', 'maoE', 'bracoE', 'maoD', 'bracoD'];
const W = 440, H = 330;
const P = [
  ['Físico', '#b9a6e8', { br: { E: [165, 15, 0], D: [-165, -15, 0] }, mao: { E: 'punho', D: 'punho' }, cab: -6, rosto: { pisca: 1, abre: .9, sorriso: .3, sobr: 4 } }, b => g(I.lua, { x: 360, y: 80, s: .7 })],
  ['Mental', '#8fb8e6', { cab: 8, rosto: { sobrIn: 1, sobr: 2, sorriso: -.6, gx: -8, gy: -10 } }, b => [[90, 70, -12], [340, 60, 10], [370, 140, 18], [70, 150, -18]].map(([x, y, r]) => g(I.aba, { x, y, r, s: .55 })).join('')],
  ['Sensorial', '#f2cf63', { cab: -4, br: { E: [30, -125, 0], D: [-30, 125, 0] }, mao: { E: 'aberta', D: 'aberta' }, rosto: { pisca: 1, sorriso: -.7, sobrIn: .9 } }, b => g(I.sino, { x: 80, y: 90, s: .6, r: -14 }) + g(I.tela, { x: 370, y: 110, s: .5, r: 12 })],
  ['Emocional', '#ef8f7c', { cab: 6, rosto: { sorriso: -.5, sobr: 5, sobrIn: .9, gy: 8 } }, b => g(I.mascara, { x: 350, y: 120, s: .8, r: 14 })],
  ['Social', '#c5a3e0', { rosto: { sorriso: .9, abre: .5, gx: 10 } }, b => g(I.bateria(.9), { x: 360, y: 80, s: .9 })],
  ['Criativo', '#9fd68e', { cab: -8, rosto: { gy: -20, gx: -6, sorriso: .7, sobr: 3 } }, b => g(I.arvore, { x: 370, y: 140, s: .9 }) + g(I.nota, { x: 80, y: 80, s: .6 })],
  ['Espiritual', '#f5b971', { cab: 4, br: { E: [28, -118, 0], D: [-28, 118, 0] }, mao: { E: 'punho', D: 'punho' }, rosto: { pisca: 1, sorriso: .6 } }, b => g(I.estrela, { x: 360, y: 80, s: .8 }) + g(I.estrela, { x: 80, y: 120, s: .4 })],
];
const painel = ([nome, cor, q, deco], x, y) => { const id = 'cl' + nome, pr = prota(() => ({ pos: [x + W / 2, y + H + 95], s: .6, ordem: ROW, br: { E: [19, -7, 0], D: [-18, 9, 0] }, ...q, rosto: { ...q.rosto } }));
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="22"/></clipPath><g clip-path="url(#${id})"><rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${cor}"/>` +
    g(deco(), { x, y }) + pr.raw(0) + `</g><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="22" fill="none" stroke="${TINTA}" stroke-width="8"/>` + rotulo(nome, x + W / 2, y + H - 34);
};
const circulo = ([nome, cor, q, deco], cx, cy, R = 170) => { const id = 'cc' + nome, pr = prota(() => ({ pos: [cx, cy + R + 60], s: .62, ordem: ROW, br: { E: [19, -7, 0], D: [-18, 9, 0] }, ...q, rosto: { ...q.rosto } }));
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath><g clip-path="url(#${id})"><circle cx="${cx}" cy="${cy}" r="${R}" fill="${cor}"/>` +
    g(deco(), { x: cx - W / 2, y: cy - R + 10 }) + pr.raw(0) + `</g><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${TINTA}" stroke-width="9"/>` + rotulo(nome, cx, cy + R - 10);
};
const CREME = '#fbf3e0';
const V = {
  A_grade: () => `<rect width="1920" height="1080" fill="#f7efd9"/>` +
    tracos(960, 92, 820) + T([['7 TIPOS DE ', CREME], ['DESCANSO', TURQ]], 960, 134, 118) +
    P.slice(0, 4).map((p, i) => painel(p, 28 + i * 470, 186)).join('') +
    tracos(960, 588, 560) + T([['QUAL TE ', CREME], ['FALTA', VERM], ['?', CREME]], 960, 626, 104, 20) +
    P.slice(4).map((p, i) => painel(p, 263 + i * 470, 700)).join(''),
  B_circulos: () => `<rect width="1920" height="1080" fill="#fbf8f2"/>` +
    T([['O SONO É SÓ ', CREME], ['1 DE 7', VERM]], 960, 140, 128) +
    P.slice(0, 4).map((p, i) => circulo(p, 255 + i * 470, 390)).join('') +
    P.slice(4).map((p, i) => circulo(p, 490 + i * 470, 800)).join('') +
    g(`<circle r="62" fill="${TURQ}" stroke="${TINTA}" stroke-width="8"/><path d="M-28 2l18 20l38 -42" fill="none" stroke="${BRANCO}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`, { x: 380, y: 250 }),
  C_contraste: () => { const q = prota(() => ({ pos: [1450, 1330], s: 1.45, ordem: ROW, cab: 8, tronco: -4, br: { E: [12, -4, 0], D: [-12, 4, 0] }, rosto: { pisca: .55, sobr: -4, sobrIn: .9, sorriso: -.5, gy: 6 } }));
    return `<defs><radialGradient id="rg" cx=".7" cy=".5" r=".8"><stop offset="0" stop-color="#3f4a66"/><stop offset="1" stop-color="#1b2131"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#rg)"/>` +
      q.raw(0) + g(I.bateria(.12), { x: 1720, y: 170, s: 2.2, r: -8 }) +
      `<text x="1250" y="300" font-family="Segoe UI" font-weight="900" font-size="120" fill="#cfe0f5" opacity=".9">z</text><text x="1180" y="200" font-family="Segoe UI" font-weight="900" font-size="80" fill="#cfe0f5" opacity=".7">z</text>` +
      T([['DORMIU ', CREME], ['8H', AMAR]], 520, 330, 170) + T([['E ACORDOU', CREME]], 520, 540, 150) + T([['CANSADO?', VERM]], 520, 760, 190);
  },
};
const pr = new Proj();
for (const [k, f] of Object.entries(V)) pr.layers(pr.comp(k, 1), [raw(k, f)]);
await pr.run(Object.keys(V).map(k => frame(k, 0, OUT.replace('02_sete-tipos', k))));
