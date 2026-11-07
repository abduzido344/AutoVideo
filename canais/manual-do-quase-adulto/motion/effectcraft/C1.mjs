import { Proj, tr, io, piscar, frame, video, HERE, OUT } from './kit.mjs';
import { campo, feno, burro, campoCima, fenoCima, burroCima } from './campo.mjs';

const orelhada = (t, ts) => ts.reduce((a, b) => a + 14 * Math.max(0, 1 - Math.abs(t - b) / .18), 0);
const geral = c => (vira, olho, mexe) => [...campo(c), ...feno(330, 900, 1, c), ...feno(1590, 900, 1, c), ...burro({ vira, olho, mexe, c })];
const p1 = () => geral(null)(() => 0, t => piscar(t, [1.6, 3.3]), t => orelhada(t, [2.4]));
const p2 = () => geral({ a: [960, 390], p: [960, 540], s: 2.1 })(tr([[0, 0], [.35, 0], [1.05, -1], [1.35, -1], [2.15, 1]]), t => piscar(t, [1.2]), t => orelhada(t, [.2]));
const p3 = () => [...campoCima(), ...fenoCima(380, 560), ...fenoCima(1540, 560), ...burroCima(960, 470, .95, t => orelhada(t, [1.4]))];

const SH = [['P1 · geral frontal', 4, p1], ['P2 · close na cabeça', 2.5, p2], ['P3 · geral de cima', 2.5, p3]];
const pr = new Proj(); let t0 = 0; const cs = [];
for (const [n, d, f] of SH) { const c = pr.comp('C1 ' + n, d); pr.layers(c, f()); cs.push([c, t0, t0 + d]); t0 += d; }
pr.layers(pr.comp('C1', t0), cs.map(([c, a, b], k) => ({ name: SH[k][0], comp: c, t0: a, t1: b })));
const arg = process.argv[2];
await pr.run(arg ? arg.split(',').map(s => frame('C1', +s, `${HERE}/prev_${s}.png`)) : [video('C1', `${OUT}/C1.mp4`)]);
