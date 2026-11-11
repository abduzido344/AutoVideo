import fs from 'fs';
import { Resvg } from '@resvg/resvg-js';
import { prota } from './vetor.mjs';
const poses = [
  { br: { D: [10, 165, 0] }, mao: { D: 'punho' }, cab: -8 },
  { br: { D: [20, 160, 0] }, mao: { D: 'punho' }, cab: -8 },
  { br: { D: [30, 150, 0] }, mao: { D: 'punho' }, cab: -10 },
  { br: { D: [20, 150, 0] }, mao: { D: 'costas' }, cab: -10 },
  { br: { D: [5, 170, 0] }, mao: { D: 'aberta' }, cab: -10 },
  { br: { D: [-10, -120, 0] }, mao: { D: 'celular' }, rosto: { gy: 16, gx: 8 }, cab: 6 },
  { br: { D: [-5, -135, 0] }, mao: { D: 'celular' }, rosto: { gy: 16, gx: 8 }, cab: 6 },
  { br: { D: [0, -145, 0] }, mao: { D: 'celular' }, rosto: { gy: 16, gx: 4 }, cab: 6 },
];
let s = '';
poses.forEach((q, i) => { s += prota(() => ({ pos: [150 + i * 240, 420], s: .3, ...q }), {}).raw(0); });
s += prota(() => ({ pos: [150, 900], s: .3, br: { D: [-20, -125, 0] }, mao: { D: 'celular' } }), { pers: 'feminina', variante: { cabelo: '#c98a4b', roupa: '#7B4FB5' } }).raw(0);
s += prota(() => ({ pos: [400, 900], s: .3, br: { D: [-45, -125, 0] }, mao: { D: 'aponta' } }), { pers: 'feminina' }).raw(0);
s += prota(() => ({ pos: [650, 900], s: .3, br: { E: [22, 140, 0] }, mao: { E: 'joinha' } }), { pers: 'vetor', variante: { pele: '#9a9893', cabelo: '#4d4f54', roupa: '#7c8088', calca: '#4a4d52', tenis: '#5d6066', mao: '#77797e', detalhe: '#8d9096' } }).raw(0);
s += prota(() => ({ pos: [900, 900], s: .3, br: { D: [-35, -95, 0] }, mao: { D: 'aberta' } }), { pers: 'vetor', variante: { pele: '#9a9893', cabelo: '#4d4f54', roupa: '#7c8088', calca: '#4a4d52', tenis: '#5d6066', mao: '#77797e', detalhe: '#8d9096' } }).raw(0);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="#ece8e1"/>${s}</svg>`;
fs.writeFileSync(process.argv[2], new Resvg(svg).render().asPng());
