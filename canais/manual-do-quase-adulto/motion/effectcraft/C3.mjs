import { Proj, personagem, rig, camPose, cam, shapeL, rr, tr, io, out, sm, piscar, frame, video, HERE, OUT, C, LW, G } from './kit.mjs';
import { quartoMesa, mesaFrente, paredePostits, postits, costas, maoCima, MADF, MAD } from './mesa.mjs';

const ITS = postits({ n: [11, 4], x0: 180, y0: 90, d: 140 });
const p1 = () => {
  const olha = tr([[0, 0], [.6, 0], [2.6, 1, io]]);
  return [...paredePostits(null, { its: ITS }),
    shapeL('Mesa', [G('frente', rr(220, 742, 1480, 400, 0), '#8e6c4a', [C.ink, LW]), G('tampo', rr(200, 690, 1520, 56, 8), MAD, [C.ink, LW])]),
    ...costas({ x: 960, y: 640, k: .86, cab: t => 3 * Math.sin(t * .9) - 2 * olha(t), olhaCima: olha }),
    shapeL('Cadeira', [G('encosto', rr(790, 760, 340, 420, 56), '#4a4d52', [C.ink, LW])])];
};

const ALVO = [460, 230];
const p2 = () => {
  const vai = tr([[0, 0], [.1, 0], [.75, 1, out]]), sai = tr([[0, 0], [1.15, 0], [1.75, 1, io]]), aperta = t => Math.max(0, 1 - Math.abs(t - .85) / .12);
  const pos = t => { const v = vai(t); return [ALVO[0] + 300 * (1 - v) + 2 * aperta(t), ALVO[1] + 520 * (1 - v)]; };
  const mao = t => { const p = pos(t), s = sai(t); return [p[0] + 30 + 260 * s, p[1] + 40 + 560 * s]; };
  const c = { a: [560, 290], p: [960, 540], s: 2.3 };
  return [...paredePostits(c, { its: ITS, cai: { k: 25, t0: 1.25 }, novo: { pos: pos, rot: t => -14 * (1 - vai(t)) + 3 } }),
    ...cam([shapeL('Mão', maoCima(false), { pos: mao, rot: t => -18 + 6 * vai(t), scale: t => 100 * (1 - .03 * aperta(t)) })], c)];
};

const apoia = tr([[0, 0], [.3, 0], [1.9, 1, io]]);
const reacao = t => { const a = apoia(t);
  return { pos: [960, 880 + 34 * a], s: .56, hs: 1 + .04 * a, desce: 200 * a, cab: -2 * a, resp: 1 - .5 * a,
    punho: { E: [880 - 6 * a, 700 - 140 * a], D: [1040 + 6 * a, 700 - 140 * a] }, polo: { E: [400, 1100], D: [984, 1100] }, encurta: { E: [1, 1], D: [1, 1] },
    mao: { E: a > .4 ? 'apoio' : 'aberta', D: a > .4 ? 'apoio' : 'aberta' }, giroMao: { E: 6 * a, D: -6 * a }, maoEsc: { E: 1 + .35 * a, D: 1 + .35 * a },
    rosto: { gy: 6 + 10 * a, open: a > .8 ? .05 : piscar(t, [.2]), lid: .5 * a, brow: -2, browIn: .9, smile: -.25, mo: 0 } };
};
const p3 = () => { const c = t => ({ a: [960, 590], p: [960, 540], s: 1.45 + .15 * sm(t / 3) }), q = camPose(reacao, c), P = rig(q);
  return [...quartoMesa(c), personagem(q, { P, nome: 'P3', ordem: ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', ...mesaFrente(c), 'mãoE', 'braçoE', 'mãoD', 'braçoD'] })]; };

const SH = [['P1 · geral de costas', 3.5, p1], ['P2 · close na mão', 2.5, p2], ['P3 · reação frontal', 3, p3]];
const pr = new Proj(); let t0 = 0; const cs = [];
for (const [n, d, f] of SH) { const c = pr.comp('C3 ' + n, d); pr.layers(c, f()); cs.push([c, t0, t0 + d]); t0 += d; }
pr.layers(pr.comp('C3', t0), cs.map(([c, a, b], k) => ({ name: SH[k][0], comp: c, t0: a, t1: b })));
const arg = process.argv[2];
await pr.run(arg ? arg.split(',').map(s => frame('C3', +s, `${HERE}/prev_${s}.png`)) : [video('C3', `${OUT}/C3.mp4`)]);
