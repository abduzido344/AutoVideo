import fs from 'fs';
import { Resvg } from '@resvg/resvg-js';
import { Proj, HERE, FONT } from './kit.mjs';
import { TINTA, AMBAR, VERM, BRANCO, raw } from './mg.mjs';

const DIR = `${HERE}/../../shorts/001_memes_de_2016/midia/motion`;
fs.mkdirSync(DIR, { recursive: true });
const CREME = '#fbf3e0';
const T = (partes, x, y, tam, w = 20) => { const sp = f => partes.map(([s, c]) => `<tspan${f ? ` fill="${c}"` : ''}>${s}</tspan>`).join('');
  return `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle" fill="none" stroke="${TINTA}" stroke-width="${w}" stroke-linejoin="round">${sp(false)}</text>` +
  `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle">${sp(true)}</text>`; };
const selo = (s, cor, y) => { const w = s.length * 34 + 80; return `<rect x="${540 - w / 2}" y="${y - 48}" width="${w}" height="84" rx="20" fill="${cor}" stroke="${TINTA}" stroke-width="7"/>` +
  `<text x="540" y="${y + 14}" font-family="Segoe UI" font-weight="800" font-size="50" text-anchor="middle" fill="${TINTA}">${s}</text>`; };
const quadro = `<rect x="-6" y="464" width="1092" height="832" fill="none" stroke="${TINTA}" stroke-width="12"/>`;
const M = [['A garrafa em pé', '#f2cf63'], ['Pokémon Go', '#8fb8e6'], ['Desafio do manequim', '#ef8f7c'], ['Bambam', '#9fd68e'], ['Olha ela!', '#c5a3e0'], ['Tá tranquilo, tá favorável', '#f5b971'], ['Infiel', '#b9a6e8']];
const V = Object.fromEntries(M.map(([nome, cor], i) => [`O${i + 1}`, () => quadro +
  T([['VOCÊ LEMBRA', CREME]], 540, 170, 104) + T([['DE ', CREME], ['2016', AMBAR], ['?', CREME]], 540, 290, 104) + selo(`${i + 1}/7 · ${nome}`, cor, 400)]));
const thumb = `data:image/png;base64,${fs.readFileSync(`${HERE}/../../videos/006_por_que_voce_sente_saudade_de_2016/midia/thumbs/A_grade.png`).toString('base64')}`;
V.CTA = () => `<rect width="1080" height="1920" fill="#f7efd9"/>` +
  T([['POR QUE DÁ', CREME]], 540, 300, 104) + T([['TANTA ', CREME], ['SAUDADE', VERM], ['?', CREME]], 540, 430, 104) +
  `<rect x="76" y="586" width="940" height="529" rx="28" fill="${AMBAR}" stroke="${TINTA}" stroke-width="8"/>` +
  `<clipPath id="t"><rect x="60" y="566" width="940" height="529" rx="28"/></clipPath>` +
  `<image href="${thumb}" x="60" y="566" width="940" height="529" clip-path="url(#t)"/>` +
  `<rect x="60" y="566" width="940" height="529" rx="28" fill="none" stroke="${TINTA}" stroke-width="10"/>` +
  selo('VÍDEO COMPLETO NO LINK', BRANCO, 1230) +
  `<path d="M540 1290v40m-34 -22l34 34l34 -34" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;
const pr = new Proj();
for (const [k, f] of Object.entries(V)) pr.layers(pr.comp(k, 1), [raw(k, f)]);
for (const k of Object.keys(V)) fs.writeFileSync(`${DIR}/${k}.png`, new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${pr.svg(pr.C[k], 0)}</svg>`, { font: FONT }).render().asPng());
