import { Proj, personagem, rig, camPose, cam, shapeL, G, Gs, rr, ell, poly, tr, io, out, sm, piscar, add, frame, video, HERE, OUT, C, LW } from './kit.mjs';
import { quartoMesa, mesaFrente, caneta, mesaCima, maoCima, trim, fim, rabisco, dk, quadDk, sombra } from './mesa.mjs';

const CF = { a: [960, 590], p: [960, 540], s: 1.45 }, TINTA = '#2b2f36';
const LINHAS = [0, 1, 2, 3, 4, 5].map(j => [rabisco(760, 250 + j * 110, 420 - (j * 53) % 160, j + 1), j]);
const ITENS = LINHAS.flatMap(([p, j]) => [[[700, 240 + j * 110], [722, 252 + j * 110], [700, 262 + j * 110]], p]);
const CIRC = Array.from({ length: 40 }, (_, k) => { const a = -2.6 + k / 39 * Math.PI * 2.15; return [960 + 260 * Math.cos(a), 470 + 52 * Math.sin(a)]; });
const folha = (desenho, circ) => [sombra('Sombra da folha', rr(624, 120, 700, 900, 6), 22, 14),
  shapeL('Folha', [G('folha', rr(610, 100, 700, 900, 6), '#fbfbf8', [C.ink, LW])]),
  shapeL('Lista', ITENS.map((p, i) => G('traço ' + i, t => poly(trim(p, desenho(i, t))), null, [TINTA, 7], { op: t => desenho(i, t) > .002 ? 100 : 0 }))),
  shapeL('Círculo', [G('círculo', t => poly(trim(CIRC, circ(t))), null, ['#2b4c8c', 8], { op: t => circ(t) > .002 ? 100 : 0 })])];
const maoCaneta = tip => [shapeL('Caneta', caneta('#2b4c8c', 160), { pos: tip, rot: 30 }), shapeL('Mão', maoCima(true), { pos: t => add(tip(t), [60, 70]), rot: -30 })];

const N = ITENS.length;
const p1 = () => { const d = (i, t) => i < N - 1 ? 1 : sm((t - .3) / 2.2), sobe = tr([[0, 0], [2.6, 0], [3.3, 1, io]]);
  const tip = t => add(fim(ITENS[N - 1], d(N - 1, t)), [40 * sobe(t), -60 * sobe(t)]);
  return [...mesaCima(), ...folha(d, () => 0), ...maoCaneta(tip)]; };
const p2 = () => { const c = { a: [960, 520], p: [960, 540], s: 1.9 }, k = tr([[0, 0], [.25, 0], [1.75, 1, io]]);
  return cam([...mesaCima(), ...folha(() => 1, k), ...maoCaneta(t => fim(CIRC, k(t)))], c); };

const encosta = tr([[0, 0], [.5, 0], [1.6, 1, io]]), ar = tr([[0, 0], [.9, 0], [1.3, 1], [2.1, 1], [2.6, 0]]);
const relaxa = t => { const e = encosta(t), a = ar(t);
  return { pos: [960, 880 - 10 * e], s: .56 * (1 - .05 * e), hs: 1 - .02 * e, cab: -3 * e, resp: 1 + 1.5 * a, desce: -8 * e,
    punho: { E: dk(840 + 40 * e, .55 - .4 * e), D: dk(1080 - 40 * e, .55 - .4 * e) }, polo: { E: [420, 1100], D: [964, 1100] },
    mao: { E: 'apoio', D: 'apoio' }, giroMao: { E: 10, D: -10 },
    rosto: { gy: 10 - 18 * e, open: e > .3 && t < 2.3 ? .06 : piscar(t, [.2]), brow: 1 + 2 * e, browIn: -.2, mo: .45 * a, mw: .7, smile: .1 + .35 * sm((t - 2.2) / .5) } };
};
const p3 = () => { const q = camPose(relaxa, CF), P = rig(q);
  const papel = cam([shapeL('Folha na mesa', [G('caneta', poly([dk(1050, .42), dk(1120, .5)]), null, ['#2b4c8c', 8]), G('folha', quadDk(960, .48, 230, .5), '#fbfbf8', [C.ink, 4])])], CF);
  return [...quartoMesa(CF), personagem(q, { P, nome: 'P3', ordem: ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', ...mesaFrente(CF), ...papel, 'mãoE', 'braçoE', 'mãoD', 'braçoD'] })]; };

const SH = [['P1 · insert de cima', 3.5, p1], ['P2 · close no círculo', 2.5, p2], ['P3 · geral frontal', 3, p3]];
const pr = new Proj(); let t0 = 0; const cs = [];
for (const [n, d, f] of SH) { const c = pr.comp('C7 ' + n, d); pr.layers(c, f()); cs.push([c, t0, t0 + d]); t0 += d; }
pr.layers(pr.comp('C7', t0), cs.map(([c, a, b], k) => ({ name: SH[k][0], comp: c, t0: a, t1: b })));
const arg = process.argv[2];
await pr.run(arg ? arg.split(',').map(s => frame('C7', +s, `${HERE}/prev_${s}.png`)) : [video('C7', `${OUT}/C7.mp4`)]);
