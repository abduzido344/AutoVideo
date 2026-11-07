import { Proj, frame, HERE } from './kit.mjs';
import { prota } from './vetor.mjs';
import { raw, fundo, txt } from './mg.mjs';
const P = JSON.parse(process.argv[2]);
const pr = new Proj(), c = pr.comp('T', 1);
pr.layers(c, [fundo('#e9e4da'), ...P.map(([nome, q], i) => { const x = 160 + (i % 6) * 320, y = 380 + Math.floor(i / 6) * 520;
  return [prota(() => ({ pos: [x, y], s: .3, ...q })), raw('l' + i, () => txt(nome, x, y + 200, { tam: 26 }))]; })]);
await pr.run([frame('T', 0, `${HERE}/prev/poses.png`)]);
