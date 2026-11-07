import { Proj, personagem, shapeL, G, ell, frame, HERE, OUT } from './kit.mjs';
import { campo, feno } from './campo.mjs';
const pose = () => ({ pos: [960, 676], s: .5, cab: -3, perna: { E: [3, -3], D: [-3, 3] }, braco: { E: [6, 2], D: [-8, -2] },
  rosto: { gx: -13, gy: 2, brow: 1, browIn: .6, smile: -.15 } });
const pr = new Proj(), c = pr.comp('I1', 1);
pr.layers(c, [...campo(), ...feno(330, 900), ...feno(1590, 900), { ...shapeL('Sombra', [G('s', ell(960, 904, 120, 14), '#000000')]), op: 28, fx: [['ADBE Gaussian Blur 2', { Blurriness: 10 }]] }, personagem(pose)]);
await pr.run([frame('I1', 0, process.argv[2] ? `${HERE}/prev_I1.png` : `${OUT}/I1.png`)]);
