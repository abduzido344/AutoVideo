import fs from 'fs';
import { out, io, clamp, personagem } from './kit.mjs';

export const PAPEL = '#ece8e1', TINTA = '#1b1b1b', TURQ = '#4fa383', AMBAR = '#e3a33b', CINZA = '#a3a29d', VERM = '#d9654b', AZUL = '#5a8fc6', AMAR = '#f2d15a', BRANCO = '#fbfaf7';
export const ent = (t, t0, d = .6) => out((t - t0) / d);
export const sai = (t, t1, d = .4) => 1 - io((t - t1) / d);
export const vis = (t, t0, t1 = 1e9, d = .6) => Math.min(ent(t, t0, d), sai(t, t1));
export const lerp = (a, b, k) => a + (b - a) * k;
export const raw = (name, f) => ({ name, raw: f });
export const fundo = (c = PAPEL) => ({ name: 'fundo', solid: c });

const S = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const txt = (s, x, y, { tam = 64, peso = 700, cor = TINTA, anc = 'middle', op = 1 } = {}) =>
  op <= 0 ? '' : `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="${peso}" font-size="${tam}" fill="${cor}" text-anchor="${anc}" opacity="${op}">${esc(s)}</text>`;
export const g = (body, { x = 0, y = 0, s = 1, r = 0, op = 1 } = {}) => op <= 0 || s <= 0 ? '' : `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"${op < 1 ? ` opacity="${op}"` : ''}>${body}</g>`;
export const surge = (body, t, t0, { x = 0, y = 0, s = 1, r = 0, dy = 40, t1 } = {}) => { const k = t1 != null ? vis(t, t0, t1) : ent(t, t0); return g(body, { x, y: y + (1 - k) * dy, s: s * (.92 + .08 * k), r, op: k }); };
export const cartao = (w, h, { fill = BRANCO, r = 22, sombra = true } = {}) =>
  (sombra ? `<rect x="${-w / 2 + 8}" y="${-h / 2 + 12}" width="${w}" height="${h}" rx="${r}" fill="#000" opacity=".12"/>` : '') + `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${S}/>`;
export const barra = (w, h, k, cor) => `<rect x="0" y="${-h}" width="${w}" height="${h}" rx="10" fill="#d8d5cf"/>` + (k > 0 ? `<rect x="0" y="${-h * k}" width="${w}" height="${h * k}" rx="10" fill="${cor}" ${S}/>` : '');
export const barraH = (w, h, k, cor) => `<rect x="0" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#d8d5cf"/>` + (k > 0.01 ? `<rect x="0" y="${-h / 2}" width="${Math.max(h, w * k)}" height="${h}" rx="${h / 2}" fill="${cor}" ${S}/>` : '');

const IMG = {};
export const imagem = (file, cx, cy, w) => {
  if (!IMG[file]) { const b = fs.readFileSync(file); IMG[file] = { d: b.toString('base64'), w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
  const I = IMG[file], h = w * I.h / I.w;
  return `<rect x="${cx - w / 2 + 10}" y="${cy - h / 2 + 14}" width="${w}" height="${h}" fill="#000" opacity=".14"/><image href="data:image/png;base64,${I.d}" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}"/><rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="none" ${S}/>`;
};

export const ICON = {
  livro: `<rect x="-50" y="-64" width="100" height="128" rx="8" fill="${AZUL}" ${S}/><path d="M-32 -64V64" fill="none" ${S}/><rect x="-16" y="-38" width="52" height="22" rx="4" fill="${BRANCO}" ${S}/>`,
  capelo: `<path d="M-46 -2v28q46 26 92 0v-28" fill="#33363b" ${S}/><path d="M0 -42L76 -12L0 18L-76 -12Z" fill="#33363b" ${S}/><path d="M50 -4v42" fill="none" ${S}/><circle cx="50" cy="42" r="8" fill="${AMBAR}" ${S}/>`,
  maleta: `<path d="M-24 -40v-16h48v16" fill="none" ${S}/><rect x="-68" y="-40" width="136" height="94" rx="12" fill="#8a5a3c" ${S}/><path d="M-68 0h136" fill="none" ${S}/><rect x="-11" y="-9" width="22" height="18" rx="3" fill="${AMBAR}" ${S}/>`,
  haltere: `<rect x="-46" y="-8" width="92" height="16" rx="5" fill="#8b8b8b" ${S}/><rect x="-78" y="-42" width="28" height="84" rx="8" fill="#3b3e44" ${S}/><rect x="50" y="-42" width="28" height="84" rx="8" fill="#3b3e44" ${S}/>`,
  cofrinho: `<path d="M-30 -36l-6 -24l24 12" fill="#f0a7b4" ${S}/><path d="M-36 46v16M30 46v16" fill="none" ${S}/><ellipse cx="0" cy="4" rx="66" ry="48" fill="#f0a7b4" ${S}/><ellipse cx="64" cy="8" rx="11" ry="15" fill="#f0a7b4" ${S}/><rect x="-14" y="-38" width="30" height="8" rx="3" fill="${TINTA}"/><circle cx="34" cy="-8" r="5" fill="${TINTA}"/><circle cx="0" cy="-74" r="16" fill="${AMBAR}" ${S}/>`,
  postit: `<path d="M-60 -60h120v90l-30 30h-90z" fill="${AMAR}" ${S}/><path d="M60 30h-30v30" fill="#d9b63e" ${S}/>`,
  megafone: `<path d="M-50 -18L32 -54V54L-50 18Z" fill="${VERM}" ${S}/><rect x="-76" y="-22" width="28" height="44" rx="6" fill="#dcdad5" ${S}/><path d="M-40 18l10 38h22l-8 -32" fill="#dcdad5" ${S}/><path d="M54 -30q18 30 0 60M72 -48q30 48 0 96" fill="none" ${S}/>`,
  check: `<circle r="62" fill="${TURQ}" ${S}/><path d="M-30 2l18 20l38 -42" fill="none" stroke="${BRANCO}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`,
  pedra: `<path d="M-80 40L-66 -8L-30 -38L18 -44L60 -18L84 40Z" fill="#8f8c86" ${S}/><path d="M-20 -14l14 18M30 -10l-8 22" fill="none" ${S}/>`,
  ampulheta: `<path d="M-50 -76h100M-50 76h100" fill="none" ${S}/><path d="M-40 -76q0 52 40 76q-40 24 -40 76h80q0 -52 -40 -76q40 -24 40 -76z" fill="${BRANCO}" ${S}/><path d="M-22 -30h44l-22 26z" fill="${AMBAR}"/><path d="M-30 66q30 -30 60 0z" fill="${AMBAR}"/>`,
  tv: `<path d="M-30 74h60M0 56v18" fill="none" ${S}/><rect x="-92" y="-62" width="184" height="118" rx="12" fill="#2a2d33" ${S}/><rect x="-78" y="-48" width="156" height="90" rx="6" fill="${AZUL}"/><circle cx="40" cy="-20" r="14" fill="${AMAR}"/><path d="M-78 42l50 -40l34 26l30 -20l42 34z" fill="${TURQ}"/>`,
  cracha: `<path d="M-20 -86l20 30l20 -30" fill="none" ${S}/><rect x="-52" y="-58" width="104" height="130" rx="12" fill="${BRANCO}" ${S}/><circle cy="-14" r="20" fill="${CINZA}" ${S}/><path d="M-30 30h60M-22 48h44" fill="none" ${S}/>`,
  like: `<path d="M-60 -6h22v66h-22z" fill="${BRANCO}" ${S}/><path d="M-38 -6L-10 -58q16 -8 20 8l-6 32h44q18 0 14 18l-10 46q-4 14 -18 14h-82z" fill="${BRANCO}" ${S}/>`,
  sino: `<path d="M-46 30q10 -12 10 -40q0 -40 36 -40q36 0 36 40q0 28 10 40z" fill="${AMAR}" ${S}/><path d="M-14 42q14 18 28 0" fill="none" ${S}/>`,
  xicara: `<path d="M34 -6q26 0 24 20q-2 18 -28 14" fill="none" ${S}/><path d="M-40 -18h76l-8 56q-2 14 -16 14h-28q-14 0 -16 -14z" fill="${BRANCO}" ${S}/><path d="M-12 -38q-8 -10 0 -20M8 -38q-8 -10 0 -20" fill="none" ${S}/>`,
  bolo: `<path d="M-56 40L40 -36L56 40Z" fill="#f3d9a8" ${S}/><path d="M-56 40L40 -36" fill="none" stroke="#f0a7b4" stroke-width="14"/><circle cx="40" cy="-46" r="12" fill="${VERM}" ${S}/>`,
  suco: `<path d="M-34 -50h68l-10 104h-48z" fill="${AMBAR}" ${S}/><path d="M10 -50l18 -30h18" fill="none" ${S}/>`,
  conta: `<path d="M-46 -64h92v128l-15 -10l-15 10l-16 -10l-15 10l-16 -10l-15 10z" fill="${BRANCO}" ${S}/><path d="M-26 -36h52M-26 -14h52M-26 8h30" fill="none" ${S}/>`,
  papel: `<rect x="-90" y="-120" width="180" height="240" rx="8" fill="${BRANCO}" ${S}/>`,
  caneta: `<path d="M-8 -70h16v110l-8 18l-8 -18z" fill="${AZUL}" ${S}/>`,
  bandeira: `<path d="M-30 80V-80" fill="none" ${S}/><path d="M-30 -80h80l-16 26l16 26h-80z" fill="${TURQ}" ${S}/>`,
};
export const icone = (n, x, y, s = 1, extra = {}) => g(ICON[n], { x, y, s, ...extra });
export const bateria = (k, cor) => `<rect x="-90" y="-46" width="168" height="92" rx="16" fill="${BRANCO}" ${S}/><rect x="80" y="-18" width="18" height="36" rx="5" fill="${TINTA}"/>` +
  (k > .01 ? `<rect x="-76" y="-32" width="${140 * k}" height="64" rx="8" fill="${cor || (k < .25 ? VERM : k < .5 ? AMBAR : TURQ)}"/>` : '');
export const nuvem = (w, h, cauda = [-1, 1]) => {
  const n = 9, b = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; b.push(`<circle cx="${Math.cos(a) * w * .42}" cy="${Math.sin(a) * h * .38}" r="${Math.min(w, h) * .22}"/>`); }
  const [cx, cy] = cauda, tail = [[.55, .5, .07], [.7, .68, .045]].map(([u, v, r]) => `<circle cx="${cx * w * u}" cy="${cy * h * v}" r="${Math.min(w, h) * r}" fill="${BRANCO}" ${S}/>`).join('');
  return tail + `<g fill="${BRANCO}" ${S}>${b.join('')}</g><g fill="${BRANCO}">${b.join('').replace(/r="([\d.]+)"/g, (m, r) => `r="${r - 3}"`)}<ellipse rx="${w * .44}" ry="${h * .4}"/></g>`;
};
export const fala = (w, h, lado = 1) => `<path d="M${-w / 2 + 20} ${-h / 2}h${w - 40}q20 0 20 20v${h - 40}q0 20 -20 20h${-w / 2 + 40 - 40 * lado}l${-26 * lado} 30l${4 * lado} -30h${-w / 2 + 40 * lado - 40 + 22 * lado}q-20 0 -20 -20v${-h + 40}q0 -20 20 -20z" fill="${BRANCO}" ${S}/>`;
export const aba = (label, w = 260, cor = BRANCO, k = 1) => `<path d="M${-w / 2} 30v-34q0 -26 26 -26h${w - 52}q26 0 26 26v34" fill="${cor}" ${S}/>` + txt(label, -w / 2 + 28, 14, { tam: 30, peso: 600, anc: 'start', op: k }) + `<path d="M${w / 2 - 44} -6l16 16M${w / 2 - 28} -6l-16 16" fill="none" stroke="${TINTA}" stroke-width="4" stroke-linecap="round"/>`;
export const fonte = (autores, ano, titulo, revista, t, t0) => {
  const k = ent(t, t0, .7), lines = []; let L = '';
  for (const w of titulo.split(' ')) { if ((L + ' ' + w).length > 46) { lines.push(L); L = w; } else L = L ? L + ' ' + w : w; } lines.push(L);
  const body = cartao(1180, 280 + lines.length * 54, { r: 10 }) + txt(autores + ' (' + ano + ')', -540, -60 - lines.length * 27 + 10, { tam: 40, peso: 400, anc: 'start', cor: '#555' }) +
    lines.map((l, i) => txt(l, -540, 4 - lines.length * 27 + 10 + i * 54 + 40, { tam: 46, peso: 700, anc: 'start' })).join('') + txt(revista, -540, 70 + lines.length * 27 + 10, { tam: 34, peso: 400, anc: 'start', cor: '#555' });
  return g(body, { x: 960, y: 540 + (1 - k) * 40, s: 1 + .03 * clamp((t - t0) / 6), op: k });
};
export const PE = { pos: [960, 700], s: .5, cab: 0, perna: { E: [3, -3], D: [-3, 3] }, braco: { E: [7, 2], D: [-9, -3] }, rosto: {} };
export const boneco = (f, o) => personagem(t => { const q = f(t); return { ...PE, ...q, rosto: { ...PE.rosto, ...(q.rosto || {}) } }; }, o);
