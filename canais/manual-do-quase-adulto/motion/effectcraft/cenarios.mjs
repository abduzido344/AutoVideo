import { shapeL, G, Gs, rr, ell, poly, spline, quad, cam, M, mp, clamp, add, sub, mul, rot, C, LW, W, H } from './kit.mjs';
const box = c => { if (!c) return [-40, -40, W + 40, H + 40]; if (typeof c === 'function') return [-600, -600, W + 600, H + 600]; const P = [[0, 0], [W, 0], [W, H], [0, H]].map(f => add(c.a, rot(mul(sub(f, c.p), 1 / c.s), -(c.r || 0))));
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]); return [Math.min(...xs) - 40, Math.min(...ys) - 40, Math.max(...xs) + 40, Math.max(...ys) + 40]; };
const R = (B, x, y, w, h, r = 0) => { const x0 = Math.max(x, B[0]), y0 = Math.max(y, B[1]), x1 = Math.min(x + w, B[2]), y1 = Math.min(y + h, B[3]); return rr(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0), r); };
const hl = (B, y) => poly([[B[0], y], [B[2], y]]), vl = (B, x) => poly([[x, B[1]], [x, B[3]]]);
const S = (name, ...groups) => shapeL(name, groups);
export const sala = (noite = true, c, B = box(c)) => cam([
  S('Parede', G('parede', R(B, -600, -600, 3120, 1470), noite ? '#5f656d' : '#bdb8ae')),
  S('Chão', Gs('tábuas', [920, 985, 1060].filter(y => y < B[3]).map(y => hl(B, y)), null, [noite ? '#403b37' : '#9c8468', 4]), G('chão', R(B, -600, 866, 3120, 900), noite ? '#48433e' : '#ab9474')),
  S('Rodapé', G('rodapé', R(B, -600, 846, 3120, 22), noite ? '#55514c' : '#d8d3ca', [C.ink, 4])),
  { ...S('Sombra do sofá', G('s', ell(960, 874, 740, 30), '#000000')), op: noite ? 45 : 30, fx: [['ADBE Gaussian Blur 2', { Blurriness: 18 }]] },
  S('Sofá', ...[[386, 846], [1508, 846]].map(([x, y]) => G('pé', rr(x, y, 26, 34, 6), '#2c2a28', [C.ink, 4])),
    G('braço D', rr(1458, 540, 164, 312, 52), '#868b92', [C.ink, LW]), G('braço E', rr(298, 540, 164, 312, 52), '#868b92', [C.ink, LW]),
    G('brilho assento', null, '#a0a5ac', null, { paths: [rr(440, 656, 504, 22, 11), rr(976, 656, 504, 22, 11)] }),
    G('assento', null, '#959aa1', [C.ink, LW], { paths: [rr(420, 650, 544, 118, 30), rr(956, 650, 544, 118, 30)] }),
    G('base', rr(400, 742, 1120, 110, 14), '#72777e', [C.ink, LW]),
    G('sombra encosto', null, '#7b8087', null, { paths: [rr(430, 640, 514, 70, 30), rr(976, 640, 514, 70, 30)] }),
    G('almofadas do encosto', null, '#8b9097', [C.ink, 5], { paths: [rr(420, 418, 536, 300, 42), rr(964, 418, 536, 300, 42)] }),
    G('encosto', rr(372, 390, 1176, 400, 48), '#7d828a', [C.ink, LW])),
], c);
export const almofada = (cx, cy, r = -12, c, cor = '#b48c50') => { const m = M([cx, cy], r);
  return cam([shapeL('Almofada', [G('costura', mp(spline([[-70, -6], [0, 4], [70, -4]], false), m), null, ['#8f6c39', 5]),
    G('almofada', mp(spline([[-118, -78], [0, -66], [118, -84], [106, 0], [122, 82], [0, 70], [-120, 86], [-104, 0]]), m), cor, [C.ink, LW])])], c); };
export const quartoCima = (c, B = box(c)) => cam([
  S('Chão', Gs('tábuas', Array.from({ length: 30 }, (_, k) => -1590 + k * 170).filter(x => x > B[0] && x < B[2]).map(x => vl(B, x)), null, ['#957b5f', 4]), G('chão', R(B, -1600, -1600, 5000, 5000), '#ac9273')),
  { ...S('Sombra da cama', G('s', rr(690, 40, 560, 1050, 30), '#000000')), op: 30, fx: [['ADBE Gaussian Blur 2', { Blurriness: 22 }]] },
  S('Cama', G('dobras', null, null, ['#8f949c', 5], { paths: [quad([760, 640], [900, 610], [1000, 660]), quad([1080, 820], [1120, 900], [1160, 960]), quad([740, 900], [780, 960], [770, 1010])] }),
    G('lençol', rr(712, 50, 496, 1000, 26), '#a6abb3', [C.ink, LW]), G('cabeceira', rr(690, 18, 540, 46, 14), '#8a6d52', [C.ink, LW]), G('estrado', rr(696, 30, 528, 1036, 30), '#8a6d52', [C.ink, LW])),
  S('Travesseiro', G('vinco', quad([800, 170], [960, 196], [1120, 168]), null, ['#c9cbd0', 5]),
    G('travesseiro', spline([[752, 92], [960, 80], [1168, 92], [1180, 180], [1166, 268], [960, 282], [754, 268], [740, 180]]), '#e8e9ec', [C.ink, LW])),
], c);
export const quartoLado = (c, B = box(c)) => cam([
  S('Parede', G('parede', R(B, -600, -600, 3120, 1560), '#c3bdb3')),
  S('Chão', Gs('tábuas', [1000, 1040, 1090].filter(y => y < B[3]).map(y => hl(B, y)), null, ['#8c7357', 4]), G('chão', R(B, -600, 960, 3120, 900), '#9e8466')),
  S('Rodapé', G('rodapé', R(B, -600, 944, 3120, 20), '#e2ddd5', [C.ink, 4])),
  { ...S('Sombra da cama', G('s', ell(980, 968, 760, 22), '#000000')), op: 30, fx: [['ADBE Gaussian Blur 2', { Blurriness: 16 }]] },
  S('Cama', ...[[300, 900], [1620, 900]].map(([x, y]) => G('pé', rr(x, y, 34, 66, 6), '#6f5641', [C.ink, 4])),
    G('lençol', poly([[268, 760], [1690, 760], [1690, 880], [1500, 892], [1200, 884], [900, 894], [600, 884], [268, 892]], true), '#a6abb3', [C.ink, LW]),
    G('estrado', rr(276, 860, 1406, 56, 10), '#8a6d52', [C.ink, LW]), G('cabeceira', rr(236, 470, 64, 470, 16), '#8a6d52', [C.ink, LW]), G('peseira', rr(1660, 640, 56, 300, 14), '#8a6d52', [C.ink, LW])),
  S('Travesseiro', G('travesseiro', spline([[310, 700], [460, 676], [600, 700], [610, 748], [460, 768], [312, 752]]), '#e8e9ec', [C.ink, LW])),
], c);
export const caderno = (fechar = () => 0) => {
  const half = (sg, kind) => t => { const c = sg < 0 ? Math.cos(Math.PI * clamp(fechar(t))) : 1, X = x => x * c;
    const r = kind === 'capa' ? [0, -102, 152, 204] : [0, -94, 140, 188];
    const [x, y, w, h] = r, a = X(sg * x), b = X(sg * (x + w)), l = Math.min(a, b), wd = Math.abs(b - a);
    return rr(l, y, Math.max(wd, .1), h, kind === 'capa' ? 10 : 6); };
  const linhas = sg => t => { const c = sg < 0 ? Math.cos(Math.PI * clamp(fechar(t))) : 1; return Array.from({ length: 7 }, (_, k) => k).map(k => poly(Array.from({ length: 12 }, (_, j) => [sg * (18 + j * 9 - (k % 3) * 6) * c, -70 + k * 22 + Math.sin(j * 1.7 + k) * 2.5]))); };
  const vis = (sg, face) => t => { const c = sg < 0 ? Math.cos(Math.PI * clamp(fechar(t))) : 1; return (face === 'pagina') === (c > 0) ? 100 : 0; };
  return [G('capa E fora', half(-1, 'capa'), '#34507a', [C.ink, 5], { op: vis(-1, 'capa') }),
    { name: 'linhas E', paths: Array.from({ length: 7 }, (_, k) => t => linhas(-1)(t)[k]), stroke: ['#7f8daa', 3], op: vis(-1, 'pagina') },
    G('página E', half(-1, 'pagina'), '#f3efe2', [C.ink, 4], { op: vis(-1, 'pagina') }), G('capa E', half(-1, 'capa'), '#34507a', [C.ink, 5], { op: vis(-1, 'pagina') }),
    { name: 'linhas D', paths: Array.from({ length: 7 }, (_, k) => t => linhas(1)(t)[k]), stroke: ['#7f8daa', 3] },
    G('lombada', poly([[0, -96], [0, 96]]), null, ['#c9c2ad', 3]), G('página D', half(1, 'pagina'), '#f3efe2', [C.ink, 4]), G('capa D', half(1, 'capa'), '#34507a', [C.ink, 5])];
};
