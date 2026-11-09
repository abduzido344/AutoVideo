import fs from 'fs';
import { Proj, frame, HERE } from './kit.mjs';
import { prota } from './vetor.mjs';
import { TINTA, AMBAR, VERM, AZUL, AMAR, TURQ, BRANCO, raw, g } from './mg.mjs';

const DIR = `${HERE}/../../videos/006_por_que_voce_sente_saudade_de_2016/midia/thumbs`;
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const CREME = '#fbf3e0';
const T = (partes, x, y, tam, w = 22) => { const sp = f => partes.map(([s, c]) => `<tspan${f ? ` fill="${c}"` : ''}>${s}</tspan>`).join('');
  return `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle" fill="none" stroke="${TINTA}" stroke-width="${w}" stroke-linejoin="round">${sp(false)}</text>` +
  `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle">${sp(true)}</text>`; };
const tracos = (x, y, d) => [-1, 1].map(s => `<path d="M${x + s * d} ${y - 30}l${s * 40} -14M${x + s * d} ${y}l${s * 50} 0M${x + s * d} ${y + 30}l${s * 40} 14" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/>`).join('');
const rotulo = (s, x, y) => { const w = s.length * 25 + 50; return `<rect x="${x - w / 2}" y="${y - 32}" width="${w}" height="56" rx="14" fill="${BRANCO}" ${S6}/>` + `<text x="${x}" y="${y + 11}" font-family="Segoe UI" font-weight="800" font-size="36" text-anchor="middle" fill="${TINTA}">${s}</text>`; };
const foto = i => `data:image/png;base64,${fs.readFileSync(`${DIR}/quadros/${i}.png`).toString('base64')}`;
const M = [['Garrafa', 1, '#f2cf63'], ['Pokémon Go', 2, '#8fb8e6'], ['Manequim', 3, '#ef8f7c'], ['Bambam', 4, '#9fd68e'], ['Olha ela!', 5, '#c5a3e0'], ['Tá tranquilo', 6, '#f5b971'], ['Infiel', 7, '#b9a6e8']];
const W = 440, H = 330;
const painel = ([nome, i, cor], x, y) => `<clipPath id="p${i}"><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="22"/></clipPath>` +
  `<rect x="${x + 12}" y="${y + 14}" width="${W}" height="${H}" rx="22" fill="${cor}" ${S6}/>` +
  `<image href="${foto(i)}" x="${x}" y="${y}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#p${i})"/>` +
  `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="22" fill="none" stroke="${TINTA}" stroke-width="8"/>` + rotulo(nome, x + W / 2, y + H - 30);
const circulo = ([nome, i, cor], cx, cy, R = 172) => `<clipPath id="c${i}"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>` +
  `<circle cx="${cx}" cy="${cy}" r="${R + 16}" fill="${cor}" ${S6}/>` +
  `<image href="${foto(i)}" x="${cx - R * 1.78}" y="${cy - R}" width="${R * 3.56}" height="${R * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#c${i})"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${TINTA}" stroke-width="9"/>` + rotulo(nome, cx, cy + R + 4);
const coracao = `<path d="M0 60L-60 0q-30 -34 0 -58q30 -20 60 12q30 -32 60 -12q30 24 0 58z" fill="${VERM}" stroke="${TINTA}" stroke-width="8" stroke-linejoin="round"/>`;
const ROW = ['cabeloTras', 'tronco', 'cabeca', 'cabelo', 'sobrancelhas', 'maoE', 'bracoE', 'maoD', 'bracoD'];
const V = {
  A_grade: () => `<rect width="1920" height="1080" fill="#f7efd9"/>` +
    tracos(960, 92, 800) + T([['SAUDADE DE ', CREME], ['2016', AMBAR]], 960, 134, 122) +
    M.slice(0, 4).map((p, i) => painel(p, 28 + i * 470, 186)).join('') +
    tracos(960, 588, 500) + T([['LEMBRA ', CREME], ['DISSO', VERM], ['?', CREME]], 960, 626, 104, 20) +
    M.slice(4).map((p, i) => painel(p, 263 + i * 470, 700)).join(''),
  B_circulos: () => `<rect width="1920" height="1080" fill="#fbf8f2"/>` +
    T([['O ', CREME], ['PIOR ANO', VERM], [' QUE VOCÊ AMA', CREME]], 960, 140, 112) +
    M.slice(0, 4).map((p, i) => circulo(p, 255 + i * 470, 400)).join('') +
    M.slice(4).map((p, i) => circulo(p, 490 + i * 470, 810)).join('') +
    g(coracao, { x: 395, y: 260, s: .9, r: 12 }),
  C_contraste: () => { const q = prota(() => ({ pos: [1430, 1350], s: 1.45, ordem: ROW, cab: -6, tronco: 2, br: { E: [12, -4, 0], D: [-12, 4, 0] }, rosto: { pisca: .45, sobr: 3, sobrIn: .7, sorriso: .45, gx: -10, gy: 14 } }));
    return `<defs><radialGradient id="rg" cx=".72" cy=".55" r=".8"><stop offset="0" stop-color="#34405e"/><stop offset="1" stop-color="#151a28"/></radialGradient>` +
      `<radialGradient id="luz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9fd0ff" stop-opacity=".35"/><stop offset="1" stop-color="#9fd0ff" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="1920" height="1080" fill="url(#rg)"/><ellipse cx="1400" cy="560" rx="560" ry="480" fill="url(#luz)"/>` + q.raw(0) +
      g(`<rect x="-80" y="-150" width="160" height="300" rx="24" fill="#22252b" ${S6}/><rect x="-64" y="-128" width="128" height="250" rx="8" fill="#dff0ff"/>` +
        [0, 1, 2].map(k => [0, 1].map(j => `<rect x="${-54 + j * 58}" y="${-116 + k * 80}" width="50" height="70" rx="6" fill="${[AMAR, AZUL, VERM, TURQ, AMBAR, '#c5a3e0'][k * 2 + j]}"/>`).join('')).join(''), { x: 1150, y: 830, s: 1.1, r: -14 }) +
      T([['SAUDADE', CREME]], 520, 300, 170) + T([['DE ', CREME], ['2016', AMBAR], ['?', CREME]], 520, 500, 170) + T([['OU DE TER 15?', VERM]], 520, 740, 132);
  },
};
const pr = new Proj();
for (const [k, f] of Object.entries(V)) pr.layers(pr.comp(k, 1), [raw(k, f)]);
await pr.run(Object.keys(V).map(k => frame(k, 0, `${DIR}/${k}.png`)));
