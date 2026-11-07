import { Proj, personagem, rig, camPose, cam, shapeL, G, Gs, rr, ell, poly, quad, tr, io, out, inn, sm, piscar, add, frame, video, HERE, OUT, C, LW } from './kit.mjs';
import { quartoMesa, mesaFrente, cadernoMesa, caneta, mesaCima, maoCima, trim, fim, rabisco, dk, sombra, mochila } from './mesa.mjs';

const CF = { a: [960, 590], p: [960, 540], s: 1.45 };
const ORD = (mesa, ...depois) => ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', ...mesa, ...depois];

const LIN = .55;
const ponta = t => { const k = (t % LIN) / LIN, j = Math.floor(t / LIN) % 4; return dk(985 + 120 * Math.min(1, k / .8) - 120 * sm((k - .8) / .2), .32 + .08 * j + .08 * sm((k - .8) / .2)); };
const escreve = t => { const p = ponta(t);
  return { pos: [960, 880], s: .56, cab: 2 * Math.sin(t * 9), resp: 1,
    punho: { E: dk(860, .5), D: add(p, [26, -52]) }, polo: { E: [420, 1100], D: [964, 1100] }, encurta: { D: [1, .7] },
    mao: { E: 'apoio', D: 'pega' }, giroMao: { E: 10, D: 30 },
    rosto: { gx: 4 + 6 * ((t % LIN) / LIN), gy: 18, open: piscar(t, [1.4, 3.0]), brow: 4, browIn: -.3, smile: .6, mo: .15 + .1 * Math.sin(t * 6) } };
};
const p1 = () => { const q = camPose(escreve, CF), P = rig(q);
  const pen = cam([shapeL('Caneta', caneta(), { pos: ponta, rot: 28 })], CF);
  return [...quartoMesa(CF), personagem(q, { P, nome: 'P1', ordem: ORD([...mesaFrente(CF, { luminaria: true }), ...cadernoMesa(960, .5, {}, CF), ...pen], 'mãoE', 'braçoE', 'mãoD', 'braçoD') })]; };

const caixa = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
const seta = (a, b) => { const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...d), u = [d[0] / l, d[1] / l], n = [-u[1], u[0]];
  return [a, b, add(b, [-u[0] * 22 + n[0] * 14, -u[1] * 22 + n[1] * 14]), b, add(b, [-u[0] * 22 - n[0] * 14, -u[1] * 22 - n[1] * 14])]; };
const ITENS = [caixa(660, 150, 360, 90), rabisco(690, 195, 290, 1), seta([840, 250], [840, 330]),
  caixa(620, 340, 160, 160), caixa(860, 340, 180, 160), rabisco(640, 400, 120, 2), rabisco(880, 400, 140, 3), seta([780, 420], [858, 420]),
  ...[0, 1, 2, 3].flatMap(j => [caixa(640, 560 + j * 70, 34, 34), rabisco(700, 577 + j * 70, 380 - j * 60, 4 + j)]),
  seta([1120, 600], [1180, 780]), caixa(1140, 790, 140, 110), rabisco(1160, 845, 100, 9)];
const N0 = 9, T1 = 1.8;
const prog = (i, t) => i < N0 ? 1 : sm(((t - .05) / T1) * (ITENS.length - N0) - (i - N0));
const p2 = () => {
  const tip = t => { const i = ITENS.findIndex((_, k) => prog(k, t) < 1); return i < 0 ? fim(ITENS.at(-1), 1) : fim(ITENS[i], prog(i, t)); };
  return [...mesaCima(), sombra('Sombra da página', rr(574, 70, 800, 1000, 10), 22, 14),
    shapeL('Página', [Gs('pauta', Array.from({ length: 15 }, (_, j) => poly([[600, 140 + j * 64], [1340, 140 + j * 64]])), null, ['#c9d3e3', 3]),
      G('página', rr(560, 60, 800, 1000, 8), '#f6f3ea', [C.ink, LW])]),
    shapeL('Rabiscos', ITENS.map((p, i) => G('traço ' + i, t => poly(trim(p, prog(i, t))), null, ['#2b4c8c', 7], { op: t => prog(i, t) > .002 ? 100 : 0 }))),
    shapeL('Caneta', caneta('#2b4c8c', 160), { pos: tip, rot: 30 }),
    shapeL('Mão', maoCima(true), { pos: t => add(tip(t), [60, 70]), rot: -30 })];
};

const anda = tr([[0, 2260], [.8, 1000, out], [1.45, 1000], [2.5, -380, inn]]);
const sobe = tr([[0, 0], [.75, 0], [1.1, 1, io], [1.15, 1], [1.45, 0, io]]);
const SOLTA = 1.15, MOCH = [1000, 712];
const entra = t => { const x = anda(t), ph = x / 95, v = Math.abs(anda(t + .02) - x) > 1 ? 1 : 0, w = Math.sin(ph) * v, b = sobe(t);
  return { pos: [x, 814 - 8 * Math.abs(Math.cos(ph)) * v], s: .56, cab: -2 * w, resp: 1,
    perna: { E: [8 * w, -3 * w], D: [8 * w, 3 * w] }, coxa: { E: 1 - .12 * Math.max(0, w), D: 1 - .12 * Math.max(0, -w) },
    braco: { E: [8 + 12 * w, 4] }, punho: { D: b > 0 ? [x + 64 - 20 * b, 900 - 300 * b] : null }, polo: { D: [1200, 1100] },
    mao: { E: 'aberta', D: t < SOLTA ? 'pega' : 'aberta' },
    rosto: { gx: x > 1100 ? -8 : x < 900 ? -10 : 2, gy: 6 + 10 * b, open: piscar(t, [.5, 2.0]), lid: .3, brow: -1, smile: 0 } };
};
const p3 = () => { const q = camPose(entra, CF), P = rig(q);
  const queda = t => Math.min(1, Math.max(0, (t - SOLTA) / .12));
  const naMao = t => { const p = P(t).wrist.D; return [p[0], p[1] + 215 * CF.s * .56]; };
  const carregada = { ...mochila('Mochila na mão'), pos: naMao, scale: CF.s * 56, op: t => t < SOLTA ? 100 : 0 };
  const solta = t => { const a = q(SOLTA).pos, h = P(SOLTA).wrist.D, k = inn(queda(t)), m = [CF.p[0] + (MOCH[0] - CF.a[0]) * CF.s, CF.p[1] + (MOCH[1] - 120 * .56 - CF.a[1]) * CF.s]; return [h[0] + (m[0] - h[0]) * k, h[1] + 215 * CF.s * .56 + (m[1] - h[1] - 215 * CF.s * .56) * k]; };
  const pousada = { ...mochila('Mochila na mesa'), pos: solta, rot: t => 4 * queda(t), scale: t => [CF.s * 56 * (1 + .05 * Math.max(0, 1 - Math.abs(t - SOLTA - .14) / .06)), CF.s * 56 * (1 - .06 * Math.max(0, 1 - Math.abs(t - SOLTA - .14) / .06))], op: t => t < SOLTA ? 0 : 100 };
  return [...quartoMesa(CF), personagem(q, { P, nome: 'P3', ordem: ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', 'mãoE', 'braçoE', carregada, 'mãoD', 'braçoD',
    ...mesaFrente(CF, { luminaria: true }), ...cadernoMesa(1000, .3, { aberto: 0 }, CF), pousada] })]; };

const SH = [['P1 · escreve frontal', 3.5, p1], ['P2 · insert de cima', 2, p2], ['P3 · geral frontal', 2.5, p3]];
const pr = new Proj(); let t0 = 0; const cs = [];
for (const [n, d, f] of SH) { const c = pr.comp('C5 ' + n, d); pr.layers(c, f()); cs.push([c, t0, t0 + d]); t0 += d; }
pr.layers(pr.comp('C5', t0), cs.map(([c, a, b], k) => ({ name: SH[k][0], comp: c, t0: a, t1: b })));
const arg = process.argv[2];
await pr.run(arg ? arg.split(',').map(s => frame('C5', +s, `${HERE}/prev_${s}.png`)) : [video('C5', `${OUT}/C5.mp4`)]);
