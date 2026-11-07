import { Proj, personagem, rig, camPose, shapeL, G, rr, ell, quad, tr, io, out, inn, sm, piscar, add, sub, mul, rot, corpo, NECK, frame, video, HERE, OUT, C, LW } from './kit.mjs';
import { sala, almofada } from './cenarios.mjs';
import { mochila } from './mesa.mjs';

const X = 1120, SEN = 760, S0 = .45, PE = 697;
const cena = c => [...sala(false, c), almofada(452, 604, -10, c)];
const cab = (q, p) => add(corpo(q, add(NECK, [0, q.desce ?? 0])), mul(rot(sub(p, NECK), (q.rot ?? 0) + (q.cab ?? 0)), q.s * (q.hs ?? 1)));

const anda = tr([[0, 2350], [1.3, 1250, out], [1.6, 1250], [2.0, X, io]]);
const senta = tr([[0, 0], [2.05, 0], [2.85, 1, out]]), inclina = tr([[0, 0], [1.95, 0], [2.3, 1], [2.9, 0]]), SOLTA = 1.45;
const chega = t => { const x = anda(t), v = Math.abs(anda(t + .02) - x) > .8 ? 1 : 0, ph = x / 90, w = Math.sin(ph) * v, k = senta(t), i = inclina(t);
  const ar = Math.max(0, 1 - Math.abs(t - 3.0) / .35);
  return { pos: [x, PE + (SEN - PE) * k - 6 * Math.abs(Math.cos(ph)) * v + 14 * i], s: S0, hs: 1 + .04 * i, desce: 18 * (1 - k) + 10 * k, cab: -3 * w + 4 * k, resp: 1 + ar,
    perna: { E: [8 * w + 4 * k, -3 * w - 4 * k], D: [8 * w - 4 * k, 3 * w + 4 * k] }, coxa: { E: 1 - .75 * k - .1 * Math.max(0, w), D: 1 - .75 * k - .1 * Math.max(0, -w) },
    braco: { E: [8 + 8 * w, 6], D: [-8 + 8 * w, -6] }, punho: { E: k > 0 ? [x - 150, SEN - 20] : null, D: k > 0 ? [x + 150, SEN - 20] : null }, polo: { E: [300, 1100], D: [1100, 1100] },
    mao: { E: k > .3 ? 'apoio' : 'aberta', D: t < SOLTA ? 'pega' : k > .3 ? 'apoio' : 'aberta' },
    rosto: { gx: x > 1300 ? -6 : 0, gy: 10 - 6 * k, lid: .45, open: piscar(t, [.8, 1.9]), brow: -2, browIn: .5, mo: .35 * ar, mw: .8, smile: -.05 } };
};
const p1 = () => { const q = camPose(chega, null), P = rig(q);
  const queda = t => Math.min(1, Math.max(0, (t - SOLTA) / .14));
  const bolsa = { ...mochila('Mochila'), pos: t => { const h = t < SOLTA ? P(t).wrist.D : P(SOLTA).wrist.D, m = add(h, [0, 215 * S0]); return t < SOLTA ? m : [m[0], m[1] + (905 - 120 * S0 - m[1]) * inn(queda(t))]; },
    rot: t => 14 * sm((t - SOLTA - .12) / .2), scale: S0 * 100 };
  return [...cena(null), personagem(q, { P, nome: 'P1', ordem: ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'mãoE', 'braçoE', 'tronco', 'joelhoE', 'joelhoD', 'cabeça', 'rosto', 'mãoD', 'braçoD'] }), bolsa]; };

const sentado = (t, extra = {}) => ({ pos: [X, SEN], s: S0, desce: 10, cab: 4, perna: { E: [10, -12], D: [-10, 12] }, coxa: { E: .3, D: .3 }, resp: 1,
  punho: { E: [X - 100, SEN + 10], D: [X + 100, SEN + 10] }, polo: { E: [300, 1100], D: [1100, 1100] }, mao: { E: 'apoio', D: 'apoio' }, ...extra });
const poe = tr([[0, 0], [.15, 0], [.95, 1, io]]), largaE = tr([[0, 0], [1.1, 0], [1.6, 1, io]]), celD = tr([[0, 0], [1.1, 0], [1.5, 1, inn], [1.75, 1], [2.3, 2, out]]);
const fonesY = t => -150 * (1 - poe(t));
const CEL = [700, 760];
const p2pose = t => { const a = largaE(t), cd = celD(t), base = sentado(t), oy = fonesY(t);
  const q0 = { ...base, rot: 0, hs: 1 };
  const cupE = cab(q0, [452, 380 + oy]), cupD = cab(q0, [932, 380 + oy]);
  const segE = add(cupE, [-6, 40]), segD = add(cupD, [6, 40]);
  const E = a > 0 ? [segE[0] + (base.punho.E[0] - segE[0]) * a, segE[1] + (base.punho.E[1] - segE[1]) * a] : segE;
  const baixo = [X + 120, SEN + 200], cel = corpo(q0, CEL);
  const D = cd <= 0 ? segD : cd <= 1 ? [segD[0] + (baixo[0] - segD[0]) * cd, segD[1] + (baixo[1] - segD[1]) * cd] : [baixo[0] + (cel[0] - baixo[0]) * (cd - 1), baixo[1] + (cel[1] - baixo[1]) * (cd - 1)];
  return { ...base, punho: { E, D }, polo: { E: [300, 1100], D: cd > 1 ? [692, 1100] : [1100, 1100] }, encurta: { D: cd > 1 ? [.78, .85] : [1, 1] },
    mao: { E: a > .5 ? 'apoio' : 'pega', D: 'pega' }, giroMao: { E: a > .5 ? 0 : 160, D: cd > 1 ? 0 : -160 }, cab: 4 - 3 * poe(t),
    rosto: { gx: cd > 1.5 ? -4 : 0, gy: cd > 1.5 ? 16 : -4, lid: .3, open: piscar(t, [.2, 1.9]), brow: 0, browIn: .2, smile: .05 }, fy: oy, cel: cd > 1 };
};
const fones = (P, nm, fy) => shapeL(nm, [G('concha E', rr(392, 300, 92, 170, 40), '#3b3f46', [C.ink, LW]), G('concha D', rr(900, 300, 92, 170, 40), '#3b3f46', [C.ink, LW]),
  G('arco', t => quad([438, 330 + fy(t)], [692, -160 + fy(t)], [946, 330 + fy(t)]), null, ['#3b3f46', 22]), G('arco c', t => quad([438, 330 + fy(t)], [692, -160 + fy(t)], [946, 330 + fy(t)]), null, [C.ink, 22 + 2 * LW])]
  .map((g, k) => k < 2 ? { ...g, gpos: t => [0, fy(t)] } : g), { anchor: NECK, pos: t => P(t).neck, rot: t => P(t).headRot, scale: t => P(t).s * P(t).hs * 100 });
const celular = (P, nm, on) => shapeL(nm, [G('câmera', rr(-40, -78, 32, 52, 11), '#25282d', [C.ink, 4]), G('celular', rr(-50, -94, 100, 188, 20), '#3a3f47', [C.ink, 5])],
  { pos: t => add(P(t).wrist.D, [-8 * P(t).s, -50 * P(t).s]), rot: -8, scale: t => P(t).s * 125, op: t => on(t) ? 100 : 0 });
const plano = (pose, c) => () => { const q = camPose(pose, c), P = rig(q);
  return [...cena(c), personagem(q, { P, nome: 'P', ordem: ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'joelhoE', 'joelhoD', 'cabeça', 'rosto', fones(P, 'Fones', t => pose(t).fy), 'mãoE', 'braçoE', celular(P, 'Celular', t => pose(t).cel), 'mãoD', 'braçoD'] })]; };

const p3pose = t => { const q = p2pose(2.5); return { ...q, cab: 1 + 2.5 * Math.sin(t * Math.PI * 2 * .8), resp: 1,
  rosto: { gx: -4, gy: 16, lid: .32, open: piscar(t, [1.1, 2.6]), brow: .5, browIn: .25, smile: .1 + .3 * sm((t - .6) / .8) } }; };

const SH = [['P1 · geral frontal', 3.5, p1], ['P2 · close fones', 2.5, plano(p2pose, { a: [X, 460], p: [960, 540], s: 2.3 })],
  ['P3 · reação', 3, plano(p3pose, t => ({ a: [X, 440], p: [960, 540], s: 2.5 + .4 * sm(t / 3) }))]];
const pr = new Proj(); let t0 = 0; const cs = [];
for (const [n, d, f] of SH) { const c = pr.comp('C8 ' + n, d); pr.layers(c, f()); cs.push([c, t0, t0 + d]); t0 += d; }
pr.layers(pr.comp('C8', t0), cs.map(([c, a, b], k) => ({ name: SH[k][0], comp: c, t0: a, t1: b })));
const arg = process.argv[2];
await pr.run(arg ? arg.split(',').map(s => frame('C8', +s, `${HERE}/prev_${s}.png`)) : [video('C8', `${OUT}/C8.mp4`)]);
