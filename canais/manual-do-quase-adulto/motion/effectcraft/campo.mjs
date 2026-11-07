import { shapeL, G, Gs, rr, ell, poly, spline, quad, cam, M, mp, rot, add, C, LW, W, H } from './kit.mjs';
const PELO = '#8f867b', PELOS = '#756d63', CLARO = '#d9d2c6', ESC = '#3b3631', FENO = '#d6b04c', FENOS = '#b38a2c', FENOC = '#e8cd7c';
const S = (name, groups, o = {}) => shapeL(name, groups, o);
const sombra = (name, path, o = {}) => ({ ...S(name, [G('s', path, '#000000')]), op: 28, fx: [['ADBE Gaussian Blur 2', { Blurriness: 14 }]], ...o });

export const campo = c => cam([
  S('Céu', [G('céu', rr(-600, -600, 3120, 1180, 0), '#c9d5da')]),
  S('Morros', [G('morro 2', spline([[-600, 560], [-200, 470], [300, 520], [800, 455], [1300, 515], [1800, 470], [2500, 540], [2500, 600], [-600, 600]], false), '#a8b78c', [C.ink, 4])]),
  S('Pasto', [Gs('tufos', [[180, 760], [520, 980], [760, 690], [1180, 700], [1420, 990], [1760, 760], [90, 1010], [1880, 1020], [960, 1030]].map(([x, y]) => poly([[x - 16, y], [x - 8, y - 18], [x, y], [x + 8, y - 22], [x + 16, y]])), null, ['#7d9158', 5]),
    G('pasto', rr(-600, 560, 3120, 1200, 0), '#9cae73', [C.ink, 4])]),
], c);

export const feno = (x, y, k = 1, c) => cam([sombra('Sombra do feno', ell(x, y + 6, 240 * k, 22 * k)),
  S('Feno', [Gs('fios claros', [[-120, -150, -60, -210], [10, -230, 80, -170], [-170, -60, -110, -120], [120, -90, 170, -40], [-40, -110, 30, -60]].map(([a, b, d, e]) => quad([a, b], [(a + d) / 2, b - 20], [d, e])), null, [FENOC, 6]),
    Gs('fios', [[-180, -30, -100, -150], [-60, -40, 0, -200], [60, -30, 120, -170], [150, -20, 190, -80], [-10, -120, 70, -230]].map(([a, b, d, e]) => quad([a, b], [(a + d) / 2 + 20, (b + e) / 2], [d, e])), null, [FENOS, 6]),
    G('monte', spline([[-225, 0], [-205, -95], [-150, -200], [-50, -262], [60, -258], [155, -195], [210, -92], [228, 0], [0, 8]]), FENO, [C.ink, LW])], { pos: [x, y], scale: 100 * k })], c);

const cabeca = (vira, olho) => {
  const u = t => vira(t), o = t => olho(t);
  const eye = sx => t => { const x = sx * 64 + 20 * u(t), op = o(t), w = 13 * (1 - .45 * Math.max(0, sx * -u(t)));
    return ell(x, -36, w, Math.max(1.5, 17 * op)); };
  return [G('narina E', t => ell(-26 + 38 * u(t), 122, 9, 12), ESC), G('narina D', t => ell(26 + 38 * u(t), 122, 9, 12), ESC),
    G('boca', t => quad([-30 + 38 * u(t), 160], [38 * u(t), 168], [30 + 38 * u(t), 160]), null, [C.ink, 5]),
    G('focinho', t => ell(36 * u(t), 118, 74 - 6 * Math.abs(u(t)), 58), CLARO, [C.ink, LW]),
    G('olho E', eye(-1), ESC), G('olho D', eye(1), ESC),
    G('topete', t => poly([[-34 + 8 * u(t), -128], [-20, -168], [-4 + 8 * u(t), -132], [10, -172], [24 + 8 * u(t), -128], [0, -110]], true), ESC, [C.ink, 4]),
    G('cara', t => spline([[0 + 10 * u(t), -140], [76 + 6 * u(t), -110], [92, -20], [78, 80], [64, 160], [12 * u(t), 176], [-64, 160], [-78, 80], [-92, -20], [-76 + 6 * u(t), -110]]), PELO, [C.ink, LW])];
};
const orelha = (sx, vira, mexe) => [G('orelha dentro', t => mp(ell(0, -95, 18, 62), M([sx * 52, -112], sx * (20 + 8 * vira(t) * sx) + mexe(t) * sx)), '#5f574e'),
  G('orelha', t => mp(ell(0, -100, 34, 92), M([sx * 52, -112], sx * (20 + 8 * vira(t) * sx) + mexe(t) * sx)), PELO, [C.ink, LW])];

export const burro = ({ x = 960, y = 900, k = 1, vira = () => 0, olho = () => 1, mexe = () => 0, c } = {}) => {
  const resp = t => 100 * k * (1 + .008 * Math.sin(t * 2.2));
  return cam([sombra('Sombra do burro', ell(x, y + 4, 230 * k, 24 * k)),
    S('Burro · patas de trás', [G('cascos', null, ESC, [C.ink, 4], { paths: [rr(-80, -20, 54, 22, 6), rr(26, -20, 54, 22, 6)] }), G('patas', null, PELOS, [C.ink, LW], { paths: [rr(-74, -180, 42, 166, 18), rr(32, -180, 42, 166, 18)] })], { pos: [x, y], scale: 100 * k }),
    S('Burro · corpo', [G('barriga', ell(0, -190, 112, 52), CLARO), G('corpo', ell(0, -236, 176, 124), PELO, [C.ink, LW])], { pos: [x, y], scale: t => [100 * k, resp(t)] }),
    S('Burro · patas', [G('cascos', null, ESC, [C.ink, 4], { paths: [rr(-142, -22, 66, 28, 8), rr(76, -22, 66, 28, 8)] }),
      G('joelhos', null, null, [PELOS, 5], { paths: [quad([-130, -90], [-110, -84], [-90, -90]), quad([90, -90], [110, -84], [130, -90])] }),
      G('patas', null, PELO, [C.ink, LW], { paths: [rr(-136, -200, 54, 184, 22), rr(82, -200, 54, 184, 22)] })], { pos: [x, y], scale: 100 * k }),
    S('Burro · pescoço', [G('crina', rr(-26, -470, 52, 120, 20), ESC), G('pescoço', rr(-58, -470, 116, 200, 44), PELO, [C.ink, LW])], { pos: [x, y], scale: 100 * k }),
    S('Burro · orelhas', [...orelha(-1, vira, mexe), ...orelha(1, vira, mexe)], { pos: [x, y - 470 * k], scale: 100 * k, rot: t => 4 * vira(t) }),
    S('Burro · cabeça', cabeca(vira, olho), { pos: [x, y - 470 * k], scale: 100 * k, rot: t => 4 * vira(t) }),
  ], c);
};

export const campoCima = c => cam([
  S('Pasto', [Gs('tufos', Array.from({ length: 40 }, (_, k) => [(k * 397) % 2000 - 40, (k * 251) % 1140 - 30]).map(([x, y]) => poly([[x - 14, y + 8], [x, y - 10], [x + 14, y + 8]])), null, ['#7d9158', 5]),
    G('pasto', rr(-600, -600, 3120, 2280, 0), '#9cae73')]),
], c);
export const fenoCima = (x, y, k = 1, c) => cam([sombra('Sombra do feno', ell(x + 26, y + 30, 200 * k, 190 * k)),
  S('Feno', [Gs('fios', Array.from({ length: 14 }, (_, j) => { const a = j / 14 * Math.PI * 2, r0 = 40 + (j % 3) * 20; return quad([Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a + .3) * 110, Math.sin(a + .3) * 110], [Math.cos(a + .2) * 170, Math.sin(a + .2) * 170]); }), null, [FENOS, 6]),
    G('brilho', ell(-40, -50, 70, 60), FENOC), G('monte', spline(Array.from({ length: 18 }, (_, j) => { const a = j / 18 * Math.PI * 2, r = 190 + 6 * Math.sin(j * 2.3); return [Math.cos(a) * r, Math.sin(a) * r]; })), FENO, [C.ink, LW])], { pos: [x, y], scale: 100 * k })], c);
export const burroCima = (x, y, k = 1, mexe = () => 0, c) => cam([sombra('Sombra do burro', rr(x - 70 * k, y - 160 * k, 180 * k, 420 * k, 80 * k)),
  S('Burro de cima', [G('rabo', quad([0, -170], [14, -230], [-4, -270]), null, [ESC, 14]),
    ...[-1, 1].map(sx => G('orelha ' + sx, t => mp(ell(0, 0, 20, 58), M([sx * 40, 190], sx * (-28 + mexe(t)))), PELO, [C.ink, LW])),
    G('crina', rr(-12, 120, 24, 110, 10), ESC), G('focinho', ell(0, 336, 44, 34), CLARO, [C.ink, LW]), G('cabeça', ell(0, 270, 58, 96), PELO, [C.ink, LW]),
    G('lombo', ell(0, 0, 40, 150), PELOS), G('corpo', ell(0, 0, 104, 190), PELO, [C.ink, LW])], { pos: [x, y], scale: 100 * k })], c);
