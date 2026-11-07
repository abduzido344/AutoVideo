import fs from 'fs'; import path from 'path'; import { Resvg } from '@resvg/resvg-js'; import { HERE } from './kit.mjs';
const [ALVO, ...NOMES] = process.argv.slice(2), ARQ = path.basename(ALVO), DIR = path.resolve(`${HERE}/../../personagem`, ALVO.includes('/') ? path.dirname(ALVO) : 'vetor');
const src = fs.readFileSync(`${DIR}/${ARQ}.svg`, 'utf8'), ler = a => fs.existsSync(`${DIR}/${a}.json`) ? JSON.parse(fs.readFileSync(`${DIR}/${a}.json`, 'utf8')) : {};
const defs = src.match(/<defs>.*?<\/defs>/gs)?.join('') || '';
const els = [...src.matchAll(/<path [^>]*\/>/g)].map(m => m[0]).slice(1);
const box = e => { const n = e.match(/ d="([^"]*)"/)[1].match(/-?[\d.]+/g).map(Number), xs = n.filter((_, i) => !(i % 2)), ys = n.filter((_, i) => i % 2);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const B = els.map(box), par = els.map((_, i) => i), f = i => par[i] === i ? i : par[i] = f(par[i]);
const hit = (a, b, m = 3) => a[0] - m < b[2] && b[0] - m < a[2] && a[1] - m < b[3] && b[1] - m < a[3];
for (let i = 0; i < els.length; i++) for (let j = 0; j < i; j++) if (hit(B[i], B[j])) par[f(i)] = f(j);
const G = new Map(); els.forEach((e, i) => { const r = f(i); if (!G.has(r)) G.set(r, []); G.get(r).push(i); });
const parts = [...G.values()].map(ix => ({ paths: ix.map(i => els[i]).join(''), box: ix.map(i => B[i]).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]) }))
  .sort((a, b) => Math.round(a.box[1] / 250) - Math.round(b.box[1] / 250) || a.box[0] - b.box[0]);
if (NOMES.length) {
  const base = ler('pecas'), { troca = {}, corta = {}, limpa = {}, zona = {}, escopo = {}, tol = 40 } = base.rig?.recorte || {}, PAL = base.paleta || {};
  const dentro = (e, [x0, y0, x1, y1]) => { const b = box(e); return b[0] >= x0 && b[1] >= y0 && b[2] <= x1 && b[3] <= y1; };
  const casa = (o, n) => Object.entries(o).filter(([r]) => new RegExp(r).test(n)).map(([, v]) => v);
  const tinge = (n, svg) => {
    for (const t of casa(troca, n)) for (const [a, b] of Object.entries(t)) svg = svg.split(`fill="${a}"`).join(`fill="${b}"`);
    for (const y of casa(corta, n)) svg = svg.replace(/<path [^>]*\/>/g, e => box(e)[1] > y ? '' : e);
    for (const r of casa(limpa, n)) svg = svg.replace(/<path [^>]*\/>/g, e => (r[4] ? e.includes(`fill="${r[4]}"`) : !/fill=/.test(e)) && dentro(e, r) ? '' : e);
    return svg; };
  const rgb = c => c.slice(1).match(/../g).map(h => parseInt(h, 16)), soltos = {};
  const token = (n, c) => { const id = `${ARQ}:${n}`, ks = Object.keys(PAL).filter(k => /^#[\dA-F]{6}$/i.test(PAL[k]) && (!escopo[k] || new RegExp(escopo[k]).test(id)));
    let m = null, dm = tol + 1e-9; for (const k of [...ks.filter(k => escopo[k]), ...ks.filter(k => !escopo[k])]) { const d = Math.hypot(...rgb(c).map((x, i) => x - rgb(PAL[k])[i])); if (d < dm) [m, dm] = [k, d]; }
    if (!m) soltos[c] = 1; return m ? `{${m}${PAL[m] === c ? '' : c}}` : c; };
  const marca = (n, svg, z = casa(zona, n).flat()) => svg.replace(/<(path|stop) [^>]*\/>/g, e => { const b = e[1] === 'p' && z.find(b => dentro(e, b));
    return e.replace(/(fill|stop-color)="(#[\dA-Fa-f]{6})"/g, (_, a, c) => `${a}="${!b ? token(n, c) : b[4] ? `{${b[4]}${c}}` : c}"`); });
  const out = Object.fromEntries(parts.map((p, i) => [NOMES[i], { box: p.box.map(Math.round), svg: marca(NOMES[i], tinge(NOMES[i], p.paths)) }]));
  const dfs = defs.replace(/<(linear|radial)Gradient id="([^"]+)".*?<\/\1Gradient>/gs, (g, _, id) => marca(Object.keys(out).find(n => out[n].svg.includes(`url(#${id})`)) || '', g));
  const fmt = (v, k) => k && v && typeof v === 'object' && !Array.isArray(v) ? `{\n${Object.entries(v).map(([a, x]) => `${JSON.stringify(a)}: ${fmt(x, k - 1)}`).join(',\n')}\n}` : JSON.stringify(v);
  fs.writeFileSync(`${DIR}/${ARQ}.json`, fmt({ ...ler(ARQ), defs: dfs, pecas: out }, 3));
  console.log(Object.keys(out).length, 'peças', Object.keys(soltos).length ? `· sem token: ${Object.keys(soltos).join(' ')}` : '');
} else {
  const lab = parts.map((p, i) => `<rect x="${p.box[0]}" y="${p.box[1]}" width="${p.box[2] - p.box[0]}" height="${p.box[3] - p.box[1]}" fill="none" stroke="red" stroke-width="3"/><text x="${p.box[0]}" y="${p.box[1] + 30}" font-size="40" fill="red">${i}</text>`).join('');
  fs.writeFileSync(`${HERE}/prev_recorte.png`, new Resvg(src.replace('</svg>', lab + '</svg>'), { font: { loadSystemFonts: true } }).render().asPng());
  console.log(parts.length, 'grupos', parts.map(p => p.box.map(Math.round).join(',')).join(' | '));
}
