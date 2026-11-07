import { shapeL, G, Gs, rr, ell, poly, spline, quad, cam, add, sub, mul, clamp, C, LW } from './kit.mjs';
export const MAD = '#b08a62', MADF = '#8e6c4a', MADB = '#c19b72', PAR = '#cbc5ba', POST = '#f2d64b', POSTS = '#d9bc35';
const S = (name, groups, o = {}) => shapeL(name, groups, o);
export const sombra = (name, path, op = 25, b = 12) => ({ ...S(name, [G('s', path, '#000000')]), op, fx: [['ADBE Gaussian Blur 2', { Blurriness: b }]] });
const val = (v, t) => typeof v === 'function' ? v(t) : v;

export const TOPO = [680, 800];
export const dk = (x, z) => [960 + (x - 960) * (.9 + .1 * z), TOPO[0] + (TOPO[1] - TOPO[0]) * z];
export const quadDk = (x, z, w, d) => poly([dk(x - w / 2, z - d / 2), dk(x + w / 2, z - d / 2), dk(x + w / 2, z + d / 2), dk(x - w / 2, z + d / 2)], true);

export const quartoMesa = (c, { cadeira = true } = {}) => cam([
  S('Parede', [G('rodapé', rr(-600, 980, 3120, 30, 0), '#e2ddd5', [C.ink, 4]), G('parede', rr(-600, -600, 3120, 1700, 0), PAR)]),
  ...(cadeira ? [S('Cadeira', [G('encosto', rr(762, 540, 396, 400, 56), '#4a4d52', [C.ink, LW])])] : []),
], c);
export const mesaFrente = (c, { luminaria = false } = {}) => cam([
  S('Mesa', [G('frente', rr(250, 812, 1420, 400, 0), MADF, [C.ink, LW]), G('borda', poly([dk(250, 1), dk(1670, 1), [dk(1670, 1)[0], 822], [dk(250, 1)[0], 822]], true), MADB, [C.ink, LW]),
    G('tampo', poly([dk(250, 0), dk(1670, 0), dk(1670, 1), dk(250, 1)], true), MAD, [C.ink, LW])]),
  ...(luminaria ? [S('Luminária', [G('cúpula', poly([[384, 470], [480, 470], [510, 560], [354, 560]], true), '#e9e6df', [C.ink, LW]),
    G('haste', poly([[432, 720], [400, 600], [432, 560]]), null, ['#5b5e63', 14]), G('haste c', poly([[432, 720], [400, 600], [432, 560]]), null, [C.ink, 14 + 2 * LW]),
    G('base', ell(432, 726, 70, 18), '#5b5e63', [C.ink, LW])])] : []),
], c);

export const cadernoMesa = (x, z, { aberto = 1, desloca = [0, 0], cor = '#34507a', nome = 'Caderno na mesa' } = {}, c) => {
  const k = t => val(aberto, t), d = t => val(desloca, t);
  return cam([S(nome, [
    Gs('linhas', [0, 1, 2, 3].map(j => t => { const o = d(t), a = k(t); return a > .5 ? poly([dk(x + o[0] - 140, z + o[1] - .12 + j * .07), dk(x + o[0] - 30, z + o[1] - .12 + j * .07)]) : poly([[0, 0], [0, 0]]); }), null, ['#9aa3b5', 3]),
    G('folhas', t => { const o = d(t), w = 170 + 170 * k(t); return quadDk(x + o[0] - 85 * (1 - k(t)), z + o[1], w - 18, .4); }, t => k(t) > .5 ? '#f3efe2' : cor, [C.ink, 4]),
    G('capa', t => { const o = d(t), w = 170 + 170 * k(t); return quadDk(x + o[0] - 85 * (1 - k(t)), z + o[1] + .02, w, .48); }, cor, [C.ink, LW])])], c);
};

export const caneta = (cor = '#2b4c8c', L = 120) => [G('ponta', poly([[0, 0], [0, -14]]), null, [C.ink, 6]), G('caneta', poly([[0, -12], [0, -L]]), null, [cor, 14], { cap: 1 }), G('caneta c', poly([[0, -10], [0, -L - 2]]), null, [C.ink, 14 + 2 * LW], { cap: 1 })];

export const trim = (pts, k) => { k = clamp(k); if (k <= 0) return [pts[0], pts[0]]; const L = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(...sub(pts[i], pts[i - 1])); L.push(d); tot += d; }
  let rest = tot * k; const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { if (rest >= L[i - 1]) { out.push(pts[i]); rest -= L[i - 1]; } else { out.push(add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), rest / L[i - 1]))); break; } }
  return out.length > 1 ? out : [pts[0], pts[0]]; };
export const fim = (pts, k) => trim(pts, k).at(-1);
export const rabisco = (x, y, w, seed = 1) => Array.from({ length: Math.max(3, Math.round(w / 9)) }, (_, j) => [x + j * 9, y + Math.sin(j * 1.9 + seed) * 6 + Math.sin(j * .7 + seed * 3) * 3]);

export const mesaCima = c => cam([S('Tampo', [Gs('veios', [120, 330, 610, 870, 1010].map(y => spline([[-600, y], [400, y + 14], [1200, y - 10], [2500, y + 8]], false)), null, ['#a07d57', 4]),
  G('tampo', rr(-600, -600, 3120, 2280, 0), MAD)])], c);

export const maoCima = (pega = true) => [G('polegar', poly([[-30, 10], [-62, -26]]), null, ['#767674', 30]), G('polegar c', poly([[-30, 10], [-62, -26]]), null, [C.ink, 30 + 2 * LW]),
  ...(pega ? [] : [G('dedos', null, null, [C.ink, 4], { paths: [poly([[-14, -56], [-14, -80]]), poly([[10, -58], [10, -84]])] })]),
  G('mão', spline([[-44, -30], [-20, pega ? -66 : -96], [26, pega ? -64 : -94], [48, -20], [36, 40], [-30, 44]]), '#767674', [C.ink, LW]),
  G('punho', rr(-56, 34, 112, 30, 10), '#4f9e7c', [C.ink, LW]), G('manga', rr(-62, 50, 124, 520, 40), '#62b68e', [C.ink, LW])];

const postit = (x, y, r, nm, extra = {}) => S(nm, [G('dobra', poly([[30, 56], [56, 56], [56, 30]], true), POSTS, [C.ink, 3]),
  G('papel', poly([[-56, -56], [56, -56], [56, 30], [30, 56], [-56, 56]], true), POST, [C.ink, 4])], { pos: [x, y], rot: r, ...extra });
export const postits = ({ n = [9, 6], x0 = 300, y0 = 70, d = 150 } = {}) => {
  const its = [];
  for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) { const k = j * n[0] + i; if ((k * 7) % 11 === 3) continue; its.push([x0 + i * d + ((k * 37) % 23) - 11, y0 + j * d + ((k * 53) % 19) - 9, ((k * 29) % 13) - 6, k]); }
  return its;
};
export const paredePostits = (c, { its = postits(), cai = null, novo = null } = {}) => {
  const q = cai && its.find(p => p[3] === cai.k), u = t => Math.max(0, t - cai.t0);
  return cam([S('Parede', [G('parede', rr(-600, -600, 3120, 2280, 0), PAR)]),
    ...its.filter(p => p !== q).map(([x, y, r, k]) => postit(x, y, r, 'post-it ' + k)),
    ...(q ? [postit(0, 0, 0, 'post-it caindo', { pos: t => [q[0] + 40 * Math.sin(u(t) * 7) * Math.min(1, u(t) * 3), q[1] + 900 * u(t) * u(t) + 30 * u(t)],
      rot: t => q[2] + 30 * Math.sin(u(t) * 7) * Math.min(1, u(t) * 3) + 60 * u(t) })] : []),
    ...(novo ? [postit(0, 0, 0, 'post-it novo', novo)] : []),
  ], c);
};

export const costas = ({ x = 960, y = 560, k = 1, cab = () => 0, olhaCima = () => 0 } = {}) => [
  S('Costas', [G('capuz', spline([[-120, -20], [0, 30], [120, -20], [90, 50], [0, 80], [-90, 50]]), '#4f9e7c', [C.ink, LW]),
    G('dobra', quad([-150, 120], [-120, 160], [-140, 230]), null, ['#4f9e7c', 6]), G('dobra 2', quad([150, 120], [120, 160], [140, 230]), null, ['#4f9e7c', 6]),
    G('moletom', spline([[-60, -40], [60, -40], [170, 10], [215, 120], [222, 400], [-222, 400], [-215, 120], [-170, 10]]), '#62b68e', [C.ink, LW])], { pos: [x, y], scale: 100 * k }),
  S('Nuca', [G('nuca', rr(-40, -120, 80, 110, 30), '#a5a5a5', [C.ink, LW])], { pos: [x, y], scale: 100 * k }),
  S('Cabeça de costas', [G('mecha', quad([-60, -40], [-10, -10], [30, -44]), null, ['#3a3a3a', 6]), G('mecha 2', quad([20, -150], [60, -100], [90, -130]), null, ['#3a3a3a', 6]),
    G('cabelo', spline([[0, -268], [96, -250], [160, -170], [178, -60], [150, 40], [70, 92], [0, 100], [-70, 92], [-150, 40], [-178, -60], [-160, -170], [-96, -250]]), '#1d1d1d', [C.ink, LW]),
    G('orelha E', ell(-176, -20, 26, 40), '#a5a5a5', [C.ink, LW]), G('orelha D', ell(176, -20, 26, 40), '#a5a5a5', [C.ink, LW])],
    { anchor: [0, 80], pos: t => [x, y - 60 * k - 10 * k * olhaCima(t)], rot: cab, scale: t => [100 * k, 100 * k * (1 - .04 * olhaCima(t))] }),
];
export const mochila = (nm) => shapeL(nm, [G('alça', quad([-34, -128], [0, -168], [34, -128]), null, ['#3b3f46', 12]), G('alça c', quad([-34, -128], [0, -168], [34, -128]), null, [C.ink, 12 + 2 * LW]),
  G('zíper', quad([-70, -40], [0, -54], [70, -40]), null, [C.ink, 4]), G('bolso', rr(-62, -10, 124, 90, 22), '#5d6470', [C.ink, LW]),
  G('mochila', rr(-92, -130, 184, 250, 52), '#4a515c', [C.ink, LW])]);
