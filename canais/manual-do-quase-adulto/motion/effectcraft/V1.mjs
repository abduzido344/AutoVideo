import { Proj, tr, back, frame, video, HERE } from './kit.mjs';
import { prota, fala, piscar } from './vetor.mjs';

const resp = t => Math.sin(t / 3.2 * Math.PI * 2);
const acena = t => t > 1.4 && t < 3.4 ? 15 * Math.sin((t - 1.4) * Math.PI * 3.2) * Math.min(1, (t - 1.4) / .3, (3.4 - t) / .3) : 0;
const ombroD = tr([[0, -18], [.9, -18], [1.4, -105, back], [3.4, -105], [3.9, -88], [5.6, -88], [6.1, -18]]);
const cotovD = tr([[0, 9], [.9, 9], [1.4, -58, back], [3.4, -58], [3.9, -4], [5.6, -4], [6.1, 9]]);
const ombroE = tr([[0, 19], [5.6, 19], [6.0, 22, back], [7.6, 22], [8, 19]]);
const cotovE = tr([[0, -7], [5.6, -7], [6.0, 140, back], [7.6, 140], [8, -7]]);
const cab = tr([[0, 0], [1.2, 0], [1.6, 7], [3.4, 7], [3.9, -4], [5.6, -4], [6.0, 5], [7.6, 5], [8, 0]]);
const gx = tr([[0, 0], [3.5, 0], [3.8, 9], [5.5, 9], [5.8, 0]]);
const sobr = tr([[0, 0], [1.3, 0], [1.5, 7], [3.2, 7], [3.6, 0], [3.9, 3], [5.4, 3], [5.8, 9], [7.4, 9], [8, 0]]);
const sorr = tr([[0, .6], [5.8, .6], [6.0, 1], [7.6, 1], [8, .6]]);
const FALA = [[1.6, 3.2], [4.0, 5.3], [6.2, 7.2]];

const pose = t => ({
  pos: [960, 600 + 3 * resp(t)], s: .62, tronco: .6 * resp(t), cab: cab(t),
  br: { E: [ombroE(t) + 1.5 * resp(t), cotovE(t) + 2 * resp(t), 0], D: [ombroD(t), cotovD(t) + acena(t), acena(t) * .4] },
  pe: { E: [3, -1, -2], D: [-3, 1, 2] },
  mao: { E: t > 5.75 && t < 7.85 ? 'joinha' : 'costas', D: t > 1.2 && t < 3.6 ? 'aberta' : t > 3.6 && t < 5.8 ? 'aponta' : 'costas' },
  rosto: { pisca: piscar(t, [.6, 3.7, 5.9, 7.8]), gx: gx(t), sobr: sobr(t), sorriso: sorr(t), ...fala(t, FALA) },
});

const pr = new Proj(), c = pr.comp('V1', 8);
pr.layers(c, [{ name: 'fundo', solid: '#f2f1ec' }, prota(pose)]);
const arg = process.argv[2];
await pr.run(arg ? arg.split(',').map(s => frame('V1', +s, `${HERE}/prev_${s}.png`)) : [video('V1', `${HERE}/V1.mp4`)]);
