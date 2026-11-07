import { Proj, personagem, rig, camPose, corpo, shapeL, tr, io, sm, out, back, piscar, add, mul, frame, video, HERE, OUT } from './kit.mjs';
import { quartoCima, quartoLado, caderno } from './cenarios.mjs';

const comCaderno = (q, P, nome, ordem, fechar, centro) => {
  const cad = shapeL(nome + ' · caderno', caderno(fechar), { pos: t => corpo(P(t), centro(t)), rot: t => P(t).rot, scale: t => P(t).s * 110 * (1 + .012 * Math.sin(t / 3.4 * Math.PI * 2)) });
  return personagem(q, { P, nome, ordem: ordem.map(k => k === 'caderno' ? cad : k) });
};
const ORD = ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', 'caderno', 'mãoE', 'braçoE', 'mãoD', 'braçoD'];

const deitado = t => ({ pos: [960, 655], rot: 0, s: .52, cab: Math.sin(t * .9) * .8,
  punhoL: { E: [600, 1060], D: [784, 1060] }, mao: { E: 'apoio', D: 'apoio' }, giroMao: { E: -15, D: 15 },
  perna: { E: [3, 0], D: [-3, 0] }, giroPe: { E: 10, D: -10 + 6 * sm((t - 2.1) / .3) * (1 - sm((t - 3.1) / .4)) },
  rosto: { gx: 2 * Math.sin(t * .8), gy: -5, open: piscar(t, [1.25, 3.35]), brow: 2 + tr([[0, 0], [1.8, 0], [2.4, 2.5], [3.4, 0]])(t), browIn: .35, smile: .05 } });
const c1 = { a: [960, 500], p: [960, 540], s: 1.1, r: -28 };
const p1 = () => { const q = camPose(deitado, c1), P = rig(q);
  return [...quartoCima(c1), comCaderno(q, P, 'P1', ORD, () => 0, () => [692, 980])]; };

const c2 = { a: [960, 196], p: [960, 560], s: 2.45, r: -16 };
const olhos = tr([[0, 0], [.15, 0], [.42, 13], [.7, 13], [.98, -13], [1.18, -13], [1.42, 0]]);
const solta = tr([[0, 0], [1.3, 0], [1.5, -.4], [1.8, 1, out], [2, 1]]);
const p2 = () => { const pose = t => { const d = deitado(t + 4), a = solta(t);
    return { ...d, pos: add(d.pos, [0, 2 * Math.max(0, a)]), resp: 0,
      rosto: { gx: olhos(t), gy: -5 + 3 * Math.max(0, a), open: piscar(t, [1.3]), lid: .28 * Math.max(0, a), brow: 2 - 4 * a, browIn: .35 + .3 * Math.max(0, a), mo: .38 * Math.max(0, a), mw: .8, smile: -.1 * Math.max(0, a) } }; };
  const q = camPose(pose, c2), P = rig(q);
  return [...quartoCima(c2), comCaderno(q, P, 'P2', ORD, () => 0, () => [692, 980])]; };

const ergue = tr([[0, 0], [.25, 0], [.75, 1, out]]), fecha = tr([[0, 0], [.15, 0], [.55, 1]]), leva = tr([[0, 0], [.55, 0], [.85, 1]]);
const inclina = tr([[0, 0], [1.0, 0], [1.35, 1], [1.75, 0]]), sobe = tr([[0, 0], [1.25, 0], [1.75, 1, out]]), assenta = tr([[0, 0], [1.75, 0], [1.87, 1], [2.0, 0]]), peso = tr([[0, 0], [1.7, 0], [2.05, 1]]);
const deitadoLado = t => { const k = ergue(t), R = -90 + 28 * k;
  return { pos: [980, 671], rot: R, s: .56, cab: 35 + 8 * sm(t / .25) - 6 * k, coxa: { E: 1, D: .8 }, perna: { E: [-28 * k, 0], D: [-28 * k - 4, 3] },
    punho: { E: [600 + 30 * k, 762] }, punhoL: { D: [842, 905] }, polo: { E: [200, 800] }, mao: { E: 'apoio', D: 'apoio' }, giroMao: { E: 10, D: -10 },
    rosto: { gx: -4, gy: 6 + 8 * k, open: piscar(t, [.5]), brow: 1, smile: 0 }, nb: [692, 820], fechar: 0 }; };
const sentado = t => { const f = fecha(t), c = leva(t), i = inclina(t), u = sobe(t), w = peso(t);
  const ex = 692 - 150 * Math.cos(Math.PI * f), maoD = [784 + 58 * c, 1110], s0 = .56;
  const solta = tr([[0, 0], [1.5, 0], [1.8, 1]])(t - 3 / 24);
  return { pos: [960 + 20 * s0 * w, 745 + 20 * s0 * i - 67 * u - 4 * s0 * assenta(t)], rot: 2 * w, s: s0, hs: 1 + .05 * i, cab: -2 * w + 3 * i,
    coxa: { E: .25 + .75 * u, D: .25 + .75 * u }, perna: { E: [5 - 2 * u - 2 * w - 3 * w, -5 + 2 * u], D: [-5 + 2 * u - 2 * w - 3 * w, 5 - 2 * u] },
    punhoL: { E: c < 1 ? [ex, 1110 - 30 * Math.sin(Math.PI * f)] : [mix(442, 470, solta), mix(1170, 1130, solta)], D: maoD },
    punho: undefined, mao: { E: c > .5 && solta < .5 ? 'apoio' : f > 0 && f < 1 ? 'pega' : 'apoio', D: c > .3 ? 'pega' : 'apoio' }, giroMao: { E: 10, D: -10 },
    ...(c > 0 && c < 1 ? { punhoL: { E: [mix(ex, 442, c), mix(1110, 1170, c)], D: maoD } } : {}),
    maoEsc: { E: 1 + .12 * Math.sin(Math.PI * f) },
    rosto: { gx: -4 * (1 - u), gy: 18 * (1 - u) + 12 * i, lid: .3 * (1 - u), open: piscar(t, [1.15]), brow: -1 + 3 * u, browIn: 0, smile: .1 + .45 * sm((t - 1.7) / .4) },
    nb: c > 0 ? add(maoD, [-84 * c, 30 * c]).map((v, k) => mix([692, 1120][k], v, c)) : [692, 1120], fechar: f };
};
const mix = (a, b, u) => a + (b - a) * u;
const p3pose = t => t < .75 ? deitadoLado(t) : sentado(t - .75);
const c3 = { a: [960, 556], p: [960, 540], s: .98 };
const p3 = () => { const q = camPose(p3pose, c3), P = rig(q);
  return [...quartoLado(c3), comCaderno(q, P, 'P3', ORD.flatMap(k => k === 'tronco' ? [k, 'joelhoE', 'joelhoD'] : [k]), t => p3pose(t).fechar, t => p3pose(t).nb)]; };

const SH = [['P1 · geral de cima', 4, p1], ['P2 · close no rosto', 2, p2], ['P3 · ação frontal', 3, p3]];
const pr = new Proj(); let t0 = 0; const cs = [];
for (const [n, d, f] of SH) { const c = pr.comp('C2 ' + n, d); pr.layers(c, f()); cs.push([c, t0, t0 + d]); t0 += d; }
const main = pr.comp('C2', t0);
pr.layers(main, cs.map(([c, a, b], k) => ({ name: SH[k][0], comp: c, t0: a, t1: b })));
const arg = process.argv[2];
await pr.run(arg ? arg.split(',').map(s => frame('C2', +s, `${HERE}/prev_${s}.png`)) : [video('C2', `${OUT}/C2.mp4`)]);
