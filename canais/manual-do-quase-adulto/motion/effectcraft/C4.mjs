import { Proj, personagem, rig, camPose, cam, shapeL, G, Gs, rr, ell, poly, quad, spline, tr, io, sm, out, inn, piscar, add, sub, mul, rot, ang, ik, frame, video, HERE, OUT, C, LW } from './kit.mjs';
import { sala, almofada } from './cenarios.mjs';

const flicks = [.3, .9, 1.5, 2.15, 2.8];
const bump = (t, ts, d = .1) => ts.reduce((a, f) => a + Math.max(0, 1 - Math.abs(t - f) / d) ** 2, 0);
const deitado = (t, extra = {}) => {
  const fl = bump(t, flicks.filter(f => f < (extra.ate ?? 9)));
  return { pos: [1030, 548], rot: -90, s: .6, cab: 26 + Math.sin(t * 1.4) * .6, resp: 1,
    punhoL: { D: add([680, 650], [fl * -6, fl * -4]), E: [540, 300] }, polo: { D: [692, 1000], E: [300, 120] }, encurta: { E: [.85, .85], D: [.72, .85] }, mao: { D: 'pega', E: 'apoio' }, giroMao: { D: 0, E: 0 },
    perna: { D: [-6, 4], E: [3, -1] }, coxa: { D: .75 }, giroPe: { D: 8, E: -8 },
    rosto: { gx: 7 + fl * 2, gy: 14, lid: .4, open: piscar(t, [1.2, 3.05]), brow: -2, smile: .12 }, ...extra };
};
const celular = (P, nome, off, ro) => shapeL(nome, [
  G('lente 2', ell(-26, -42, 8), '#0e0f11', ['#5a616b', 3]), G('lente 1', ell(-26, -64, 8), '#0e0f11', ['#5a616b', 3]),
  G('câmera', rr(-40, -78, 32, 52, 11), '#25282d', [C.ink, 4]), G('brilho', rr(-44, -88, 8, 150, 4), '#4a505a'),
  G('celular', rr(-50, -94, 100, 188, 20), '#3a3f47', [C.ink, 5])],
  { pos: t => add(P(t).wrist.D, rot(mul(off(t), P(t).s * 1.15), P(t).handRot.D)), rot: t => P(t).handRot.D + ro(t), scale: t => P(t).s * 125 });
const sofaPlano = (pose, c, nome, phoneOff, phoneRot) => {
  const q = camPose(pose, c), P = rig(q);
  const ph = celular(P, nome + ' · celular', phoneOff, phoneRot);
  return [...sala(true, c), almofada(452, 604, -10, c),
    personagem(q, { P, nome, ordem: ['mãoE', 'braçoE', 'pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', ph, 'mãoD', 'braçoD'] })];
};

const p1 = () => sofaPlano(t => deitado(t), null, 'P1', () => [0, 70], () => 0);

const feedY = t => -330 * out((t - .12) / .7) - 330 * out((t - 1.02) / .7);
const swipe = t => { const a = (t - .02) / .26, b = (t - .92) / .26; const s = x => x < 0 ? 0 : x < 1 ? io(x) : Math.max(0, 1 - io((x - 1.15) / 1.3)); return Math.max(s(a), s(b)); };
const tela = { p: t => [1010 + Math.sin(t * 2.1) * 4, 560 + Math.sin(t * 1.7 + 1) * 5], r: t => -7 + Math.sin(t * 1.3) * .5 };
const CORES = [['#e8845c', '#f3b38f'], ['#5aa9e6', '#9fd0f5'], ['#f2c14e', '#f9dc93'], ['#7bc67b', '#b3e3b2'], ['#b07de8', '#d6b8f5'], ['#ff8fa3', '#ffc2cd']];
const card = (k, y) => { const [a, b] = CORES[k % 6];
  return [G('barra', rr(-130, y + 246, 150, 14, 7), '#cfd2d7'), G('avatar', ell(-164, y + 252, 20), b, ['#9aa0a8', 3]),
    G('morro', poly([[-186, y + 212], [-90, y + 110], [-20, y + 170], [40, y + 120], [186, y + 212]], true), b),
    G('sol', ell(110, y + 70, 30), '#fff6dc'), G('foto', rr(-186, y + 16, 372, 196, 18), a), G('cartão', rr(-202, y, 404, 290, 26), '#fbfbfa', ['#c9ccd2', 3])]; };
const DEDOS = [[[292, 96], [236, 104]], [[294, 190], [240, 194]], [[290, 280], [242, 282]], [[200, 528], [150, 500]]];
const p2 = () => {
  const L = (name, groups, extra = {}) => shapeL(name, groups, { pos: tela.p, rot: tela.r, ...extra });
  const B = [-250, 470];
  const joints = t => { const k = swipe(t), T = add([0, 290], [-40 * k, -250 * k]), [K1, T2] = ik(B, T, 175, 150, -1); return [B, K1, T2]; };
  const tip = t => joints(t)[2];
  const thumb = t => spline(joints(t), false, .6);
  return [
    shapeL('Fundo', [G('peito', ell(1500, 1180, 700, 420), '#4a8f74'), G('sofá', rr(-200, -200, 2400, 1500, 0), '#6f747b')], { fx: [['ADBE Gaussian Blur 2', { Blurriness: 40 }]] }),
    L('Palma', [G('manga', ell(-400, 660, 150, 130), '#55a383', [C.ink, LW]), G('palma', ell(-215, 440, 110, 96), '#6c6c6a', [C.ink, LW])]),
    L('Celular', [G('notch', rr(-56, -458, 112, 22, 11), '#0b0c0e'), G('tela', rr(-226, -470, 452, 940, 44), '#e6e8ec'), G('celular', rr(-250, -500, 500, 1000, 64), '#17191c', [C.ink, LW]),
      G('botão', rr(246, -280, 14, 110, 6), '#17191c', [C.ink, 4])]),
    L('Feed', [{ name: 'feed', sub: Array.from({ length: 9 }, (_, k) => card(k, -440 + k * 316)).flat(), gpos: t => [0, feedY(t)] }], { mask: rr(-226, -470, 452, 940, 44) }),
    L('Dedos', [...DEDOS.map((p, k) => G('dedo ' + k, poly(p), null, ['#6c6c6a', 50 - 3 * k])), ...DEDOS.map((p, k) => G('dedo c ' + k, poly(p), null, [C.ink, 50 - 3 * k + 2 * LW]))]),
    L('Polegar', [G('unha', t => { const j = joints(t), d = sub(j[2], j[1]), u = mul(d, 1 / Math.hypot(...d)); return ell(...add(j[2], mul(u, -14)), 15, 15); }, '#8d8d8b'),
      G('polegar', thumb, null, ['#6c6c6a', 70]), G('polegar c', thumb, null, [C.ink, 70 + 2 * LW])]),
    shapeL('Ombro e cabelo', [G('cabelo', ell(-120, 40, 300, 240), '#1d1d1d'), G('ombro', ell(80, 1180, 520, 360), '#58a586')], { fx: [['ADBE Gaussian Blur 2', { Blurriness: 36 }]] }),
  ];
};

const c3 = { a: [690, 470], p: [820, 560], s: 1.75 };
const p3 = () => {
  const baixa = tr([[0, 0], [.55, 0], [1.25, 1, io]]), olha = tr([[0, 0], [1.0, 0], [1.6, 1, io]]);
  const pose = t => { const b = baixa(t), o = olha(t);
    return deitado(t, { ate: .6, cab: 26 + 3 * o + Math.sin(t * 1.4) * .6,
      punhoL: { D: tr([[0, [680, 650]], [.55, [680, 650]], [.85, [690, 755]], [1.13, [700, 860]]])(t), E: [540, 300] }, giroMao: { D: -20 * baixa(t - 2 / 24), E: 0 },
      rosto: { gx: 7 + 5 * o, gy: 14 - 22 * o - 6 * b, lid: .4 - .3 * o, open: piscar(t, [1.95]), brow: -2 + 4 * o, browIn: .9 * o, smile: .12 - .55 * o, mw: 1 - .2 * o } }); };
  return sofaPlano(pose, c3, 'P3', () => [0, 70], () => 0);
};
const mix2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

const SH = [['P1 · geral frontal', 3.5, p1], ['P2 · close sobre o ombro', 2, p2], ['P3 · reação frontal', 2.5, p3]];
const pr = new Proj(); let t0 = 0; const cs = [];
for (const [n, d, f] of SH) { const c = pr.comp('C4 ' + n, d); pr.layers(c, f()); cs.push([c, t0, t0 + d]); t0 += d; }
const main = pr.comp('C4', t0);
pr.layers(main, cs.map(([c, a, b], k) => ({ name: SH[k][0], comp: c, t0: a, t1: b })));
const arg = process.argv[2];
await pr.run(arg ? arg.split(',').map(s => frame('C4', +s, `${HERE}/prev_${s}.png`)) : [video('C4', `${OUT}/C4.mp4`)]);
