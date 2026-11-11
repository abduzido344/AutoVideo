import { Proj, frame, HERE } from './kit.mjs';
import { prota } from './vetor.mjs';
import { TINTA, AMBAR, VERM, AZUL, AMAR, TURQ, BRANCO, raw, g } from './mg.mjs';

const DIR = `${HERE}/../../videos/007_por_que_algumas_pessoas_tem_mais_sorte/midia/thumbs`;
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const CREME = '#fbf3e0';
const T = (partes, x, y, tam, w = 24) => { const sp = f => partes.map(([s, c]) => `<tspan${f ? ` fill="${c}"` : ''}>${s}</tspan>`).join('');
  return `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle" fill="none" stroke="${TINTA}" stroke-width="${w}" stroke-linejoin="round">${sp(false)}</text>` +
  `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle">${sp(true)}</text>`; };
const ROW = ['cabeloTras', 'tronco', 'cabeca', 'cabelo', 'sobrancelhas', 'maoE', 'bracoE', 'maoD', 'bracoD'];
const cena = (pos, s, rosto, extra = {}) => prota(() => ({ pos, s, ordem: ROW, cab: -6, tronco: 2, br: { E: [12, -4, 0], D: [-12, 4, 0] }, rosto, ...extra }));
const jornal = `<path d="M-230 -170l230 -26l230 26v330l-230 -26l-230 26z" fill="#f4efe2" ${S6}/><path d="M0 -196v330" stroke="${TINTA}" stroke-width="5"/>` +
  [0, 1, 2, 3].map(i => `<rect x="-200" y="${-140 + i * 22}" width="170" height="9" rx="4" fill="#9a968c"/>`).join('') +
  `<rect x="25" y="-150" width="180" height="170" rx="6" fill="${AMAR}" ${S6}/><path d="M60 -90h110M60 -50h110" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>` +
  [0, 1].map(i => `<rect x="${-200 + i * 0}" y="${-30 + i * 24}" width="170" height="9" rx="4" fill="#9a968c"/>`).join('');
const veleiro = `<path d="M-170 0h340l-60 70h-220z" fill="${VERM}" ${S6}/><path d="M0 0v-330" ${S6}/><path d="M12 -320q150 130 130 300h-130z" fill="${BRANCO}" ${S6}/><path d="M-12 -280v260l-110 0q10 -150 110 -260z" fill="${AMAR}" ${S6}/>`;
const vento = (x, y, w) => `<path d="M${x} ${y}h${w}q40 0 40 -34t-44 -30M${x + 40} ${y + 36}h${w - 60}q36 0 36 30t-40 28" fill="none" stroke="${BRANCO}" stroke-width="12" stroke-linecap="round"/>`;
const catavento = `<path d="M-120 200L0 -60l120 260z" fill="#b9754a" ${S6}/><path d="M0 -60v-110" ${S6}/><path d="M-90 -170h180l36 -26v52l-36 -26z" fill="${AZUL}" ${S6}/><circle cx="0" cy="-170" r="14" fill="${TINTA}"/>`;
const V = {
  A_contraste: () => `<defs><radialGradient id="rg" cx=".3" cy=".5" r=".9"><stop offset="0" stop-color="#34405e"/><stop offset="1" stop-color="#121624"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#rg)"/>` +
    cena([1380, 1330], 1.5, { pisca: 0, sobr: 4, sobrIn: .8, sorriso: .3, gx: 10, gy: 22 }).raw(0) +
    g(jornal, { x: 1400, y: 1040, s: 1.25, r: -4 }) +
    T([['SORTE', AMAR]], 520, 330, 210) + T([['SE CRIA', CREME]], 520, 540, 190) + T([['NÃO É ', CREME], ['ACASO', VERM]], 480, 800, 118),
  B_vento: () => `<rect width="1920" height="1080" fill="#8fc8ee"/><rect y="800" width="1920" height="280" fill="${AZUL}"/><path d="M0 800q120 -26 240 0t240 0t240 0t240 0t240 0t240 0t240 0t240 0v30h-1920z" fill="#a9d6f2"/>` +
    g(catavento, { x: 330, y: 650, s: 1.4 }) + vento(560, 380, 360) + vento(780, 560, 300) +
    g(veleiro, { x: 1400, y: 800, s: 1.45 }) +
    cena([1420, 1010], .6, { pisca: 0, sobr: 2, sobrIn: 0, sorriso: .8, gx: 12, gy: 4 }).raw(0) +
    T([['VIRE O ', CREME], ['VELEIRO', AMAR]], 960, 190, 150),
  C_dois_lados: () => `<rect width="960" height="1080" fill="#6f7686"/><rect x="960" width="960" height="1080" fill="#f6b64b"/>` +
    `<path d="M0 0h960v400h-960z" fill="#555c6b"/><circle cx="1700" cy="480" r="110" fill="#fff3b8"/>` +
    cena([480, 1280], 1.2, { pisca: .5, sobr: -3, sobrIn: -.5, sorriso: 0, gx: -10, gy: 20 }, { br: { E: [0, 0, 0], D: [0, 0, 0] } }).raw(0) +
    g(veleiro, { x: 1500, y: 900, s: 1.2 }) +
    cena([1470, 1190], .7, { pisca: 0, sobr: 3, sobrIn: .3, sorriso: 1, gx: 10, gy: 2 }).raw(0) +
    `<rect x="935" width="50" height="1080" fill="${TINTA}"/>` +
    T([['ACASO', CREME]], 480, 190, 150) + T([['SORTE', TINTA]], 1440, 190, 150, 0) + T([["QUAL É O SEU?", AMAR]], 960, 360, 100, 24),
};
const pr = new Proj();
for (const [k, f] of Object.entries(V)) pr.layers(pr.comp(k, 1), [raw(k, f)]);
await pr.run(Object.keys(V).map(k => frame(k, 0, `${DIR}/${k}.png`)));
