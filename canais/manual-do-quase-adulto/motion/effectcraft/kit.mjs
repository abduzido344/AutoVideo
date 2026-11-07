import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process'; import { fileURLToPath } from 'url'; import { Resvg } from '@resvg/resvg-js'; import { Worker } from 'worker_threads'; import os from 'os';
export const HERE = path.dirname(fileURLToPath(import.meta.url)).replace(/\\/g, '/');
export const OUT = `${HERE}/../../videos/003_por_que_voce_sonha_grande_e_nao_faz_nada/midia/effectcraft`;
const CH = JSON.parse(fs.readFileSync(`${HERE}/personagem.json`, 'utf8'));
export const FONT = { fontFiles: ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/segoeuisl.ttf'], loadSystemFonts: false, defaultFontFamily: 'Segoe UI' };
export const W = +(process.env.MW || 1920), H = +(process.env.MH || 1080), FPS = 24, LW = 6;
export const C = { ink: '#0a0a0a', pele: '#a5a5a5', mao: '#767674', moletom: '#62b68e', moletomS: '#438e79', calca: '#2e2f2e', calcaS: '#232423',
  listra: '#d8d6c8', branco: '#eeeee8' };

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const io = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const out = x => 1 - (1 - clamp(x)) ** 3;
export const inn = x => clamp(x) ** 3;
export const back = x => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
export const hold = () => 0;
const mix = (a, b, u) => Array.isArray(a) ? a.map((x, i) => mix(x, b[i], u)) : a + (b - a) * u;
export const tr = keys => t => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let k = 1; k < keys.length; k++) { const [t1, v1, f = io] = keys[k], [t0, v0] = keys[k - 1]; if (t <= t1) return mix(v0, v1, f((t - t0) / (t1 - t0))); }
  return keys.at(-1)[1];
};
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
export const len = a => Math.hypot(a[0], a[1]);
export const rot = (a, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]; };
export const ang = a => Math.atan2(a[1], a[0]) * 180 / Math.PI;

const K4 = .5523;
export const poly = (pts, c = false) => ({ v: pts, i: pts.map(() => [0, 0]), o: pts.map(() => [0, 0]), c });
export const ell = (cx, cy, rx, ry = rx) => ({ v: [[cx + rx, cy], [cx, cy + ry], [cx - rx, cy], [cx, cy - ry]],
  o: [[0, ry * K4], [-rx * K4, 0], [0, -ry * K4], [rx * K4, 0]], i: [[0, -ry * K4], [rx * K4, 0], [0, ry * K4], [-rx * K4, 0]], c: true });
export const rr = (x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); const k = r * K4;
  return { v: [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]],
    i: [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]], o: [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]], c: true }; };
export const spline = (pts, c = true, k = 1) => { const n = pts.length, T = [];
  for (let j = 0; j < n; j++) { const a = pts[c ? (j - 1 + n) % n : Math.max(0, j - 1)], b = pts[c ? (j + 1) % n : Math.min(n - 1, j + 1)]; T.push(mul(sub(b, a), k / 6)); }
  return { v: pts, i: T.map(t => mul(t, -1)), o: T, c }; };
export const quad = (p0, q, p1) => ({ v: [p0, p1], o: [mul(sub(q, p0), 2 / 3), [0, 0]], i: [[0, 0], mul(sub(q, p1), 2 / 3)], c: false });
export const xf = (P, f, lin) => ({ v: P.v.map(f), i: P.i.map(lin), o: P.o.map(lin), c: P.c });
export const M = (pos, deg = 0, s = 1, piv = [0, 0]) => ({ f: p => add(pos, mul(rot(sub(p, piv), deg), s)), l: d => mul(rot(d, deg), s) });
export const mp = (P, m) => xf(P, m.f, m.l);
export const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const col = c => typeof c === 'string' ? hex(c) : c.map(x => x / 255);

const N = x => Math.round(x * 100) / 100;
const val = (v, t) => typeof v === 'function' ? v(t) : v;
const CAP = { 1: 'butt', 2: 'round', 3: 'square' }, JOIN = { 1: 'miter', 2: 'round', 3: 'bevel' };
const dd = P => { const n = P.v.length; if (!n) return ''; let s = `M${N(P.v[0][0])} ${N(P.v[0][1])}`;
  const seg = (a, b) => { const A = P.v[a], B = P.v[b], o = P.o[a], i = P.i[b];
    s += `C${N(A[0] + o[0])} ${N(A[1] + o[1])} ${N(B[0] + i[0])} ${N(B[1] + i[1])} ${N(B[0])} ${N(B[1])}`; };
  for (let k = 1; k < n; k++) seg(k - 1, k); if (P.c) { seg(n - 1, 0); s += 'Z'; } return s; };
const wrap = (body, at) => body && at ? `<g ${at}>${body}</g>` : body;
const gsvg = (G, t) => {
  const op = G.op != null ? val(G.op, t) : 100; if (op <= 0) return '';
  let body = '';
  if (G.sub) body = G.sub.slice().reverse().map(S => gsvg(S, t)).join('');
  else { const ds = (G.paths || [G.path]).filter(Boolean).map(P => dd(val(P, t))).join('');
    const sw = G.stroke ? val(G.stroke[1], t) : 0;
    if (ds && (G.fill || sw > 0)) body = `<path d="${ds}" fill="${G.fill ? val(G.fill, t) : 'none'}" fill-rule="evenodd"` +
      (sw > 0 ? ` stroke="${G.stroke[0]}" stroke-width="${N(sw)}" stroke-linecap="${CAP[G.cap || 2]}" stroke-linejoin="${JOIN[G.join || 2]}"` : '') + '/>'; }
  const gp = G.gpos && val(G.gpos, t);
  return wrap(body, [gp && `transform="translate(${N(gp[0])} ${N(gp[1])})"`, op < 100 && `opacity="${N(op / 100)}"`].filter(Boolean).join(' '));
};

const tf = (L, t, body) => { const a = L.anchor ? val(L.anchor, t) : [0, 0], p = L.pos ? val(L.pos, t) : [0, 0], r = L.rot ? val(L.rot, t) : 0, s0 = L.scale != null ? val(L.scale, t) : 100, s = Array.isArray(s0) ? s0 : [s0, s0];
  return `<g transform="translate(${N(p[0])} ${N(p[1])}) rotate(${N(r)}) scale(${N(s[0] / 100 * 1e4) / 1e4} ${N(s[1] / 100 * 1e4) / 1e4}) translate(${N(-a[0])} ${N(-a[1])})">${body}</g>`; };

export class Proj {
  constructor() { this.C = {}; }
  comp(name, dur) { return this.C[name] = { name, n: Math.round(dur * FPS), dur, L: [] }; }
  layers(cp, Ls) { cp.L.push(...Ls.flat(9).filter(Boolean)); }
  layer(L, t, id) {
    if (L.t0 != null && (t < L.t0 || t >= L.t1)) return '';
    const op = L.op != null ? val(L.op, t) : 100; if (op <= 0) return '';
    let body = L.raw ? L.raw(t) : L.solid ? `<rect width="${W}" height="${H}" fill="${L.solid}"/>` : L.comp ? this.svg(L.comp, t - (L.t0 || 0), id) : L.groups.slice().reverse().map(G => gsvg(G, t)).join('');
    if (!body) return '';
    if (L.mask) { const k = id.n++; body = `<clipPath id="m${k}"><path d="${dd({ ...L.mask, c: true })}"/></clipPath><g clip-path="url(#m${k})">${body}</g>`; }
    if (L.pre) body = tf(L.pre, t, body);
    body = tf(L, t, body);
    const bl = (L.fx || []).find(([k]) => k === 'ADBE Gaussian Blur 2');
    let pre = '';
    if (bl) { const k = id.n++; pre = `<filter id="b${k}" filterUnits="userSpaceOnUse" x="-200" y="-200" width="${W + 400}" height="${H + 400}"><feGaussianBlur stdDeviation="${val(bl[1].Blurriness, t) / 2}"/></filter>`; body = `<g filter="url(#b${k})">${body}</g>`; }
    return pre + wrap(body, op < 100 && `opacity="${N(op / 100)}"`);
  }
  svg(cp, t, id = { n: 0 }) { return cp.L.map(L => this.layer(L, t, id)).join(''); }
  doc(cp, t) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#000"/>${this.svg(cp, t)}</svg>`; }
  img(cp, t) { return new Resvg(this.doc(cp, t), { font: FONT }).render(); }
  async run(renders) {
    for (const r of renders) {
      const cp = this.C[r.comp], t0 = Date.now();
      if (r.png) fs.writeFileSync(r.png, this.img(cp, r.t).asPng());
      else {
        fs.mkdirSync(path.dirname(r.mp4), { recursive: true });
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
          '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', r.mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
        const done = new Promise((ok, no) => ff.on('close', c => c ? no(new Error('ffmpeg ' + c)) : ok()));
        const ws = Array.from({ length: Math.max(1, os.cpus().length - 2) }, () => new Worker(new URL('./raster.mjs', import.meta.url))), got = new Map();
        let next = 0, sent = 0, wake;
        for (const w of ws) w.on('message', ({ k, p }) => { got.set(k, p); wake?.(); });
        const feed = w => { if (sent < cp.n) w.postMessage({ k: sent, svg: this.doc(cp, sent++ / FPS) }); };
        ws.forEach(feed); ws.forEach(feed);
        while (next < cp.n) {
          if (!got.has(next)) { await new Promise(ok => wake = ok); continue; }
          const p = got.get(next); got.delete(next); next++; feed(ws[next % ws.length]);
          if (!ff.stdin.write(p)) await new Promise(ok => ff.stdin.once('drain', ok));
        }
        ws.forEach(w => w.terminate());
        ff.stdin.end(); await done;
      }
      console.log(r.png || r.mp4, (Date.now() - t0) / 1000, 's');
    }
  }
}
export const frame = (comp, t, png) => ({ comp, t, png });
export const video = (comp, mp4) => ({ comp, mp4 });

export const shapeL = (name, groups, extra = {}) => ({ name, groups, ...extra });
export const G = (name, path, fill, stroke, extra = {}) => ({ name, path, fill, stroke, ...extra });
export const Gs = (name, paths, fill, stroke, extra = {}) => ({ name, paths, fill, stroke, ...extra });
export const regs = rs => rs.slice().reverse().map(r => Gs(r.name, r.paths.map(p => ({ ...p, c: true })), '#' + r.color.map(x => Math.round(x).toString(16).padStart(2, '0')).join('')));

export const NECK = [692, 530], PELVE = [692, 1150];
const SH = { E: [564, 668], D: [820, 668] }, HIP = { E: [622, 1132], D: [762, 1132] };
export const BR = { a: 238, b: 218, w0: 108, w1: 98 }, PE = { a: 160, b: 236, w0: 146, w1: 128 };
export const ik = (S, T, a, b, bend) => {
  const d = sub(T, S), L = Math.min(len(d), a + b - .01), u = mul(d, 1 / (len(d) || 1));
  const x = (a * a - b * b + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a * a - x * x));
  const E = add(add(S, mul(u, x)), mul([-u[1], u[0]], h * bend));
  return [E, add(S, mul(u, L))];
};

const HANDS = {
  aberta: { s: [[[0, 14], [0, 52], 76], [[-26, 56], [-27, 100], 21], [[-9, 60], [-9, 110], 21], [[9, 60], [9, 108], 21], [[26, 56], [25, 96], 21], [[-30, 26], [-50, 66], 23]],
    l: [[[-18, 72], [-18, 96]], [[0, 76], [0, 104]], [[18, 72], [17, 98]]] },
  pega: { s: [[[0, 14], [0, 50], 78], [[-26, 52], [-26, 68], 23], [[-9, 55], [-9, 72], 23], [[9, 55], [9, 72], 23], [[26, 52], [26, 66], 23], [[-34, 24], [-14, 60], 24]],
    l: [[[-18, 58], [-18, 74]], [[0, 60], [0, 78]], [[18, 58], [18, 74]]] },
  apoio: { s: [[[0, 14], [0, 50], 78], [[-27, 54], [-30, 92], 21], [[-9, 58], [-10, 100], 21], [[9, 58], [10, 98], 21], [[27, 54], [29, 88], 21], [[34, 22], [54, 56], 23]],
    l: [[[-19, 70], [-20, 92]], [[0, 74], [0, 98]], [[19, 70], [20, 92]]] },
};
export const handGroups = (kind, flip = 1) => {
  const H = HANDS[kind], F = p => [p[0] * flip, p[1]];
  return [Gs('vincos', H.l.map(([a, b]) => poly([F(a), F(b)])), null, [C.ink, 4]),
    ...H.s.map(([a, b, w], k) => G('mao ' + k, poly([F(a), F(b)]), null, [C.mao, w])),
    ...H.s.map(([a, b, w], k) => G('contorno ' + k, poly([F(a), F(b)]), null, [C.ink, w + 2 * LW]))];
};

const cord = x => [G('ponta', poly([[x, 808], [x + 1, 832]]), null, [C.branco, 12], { cap: 1 }), G('ponta c', poly([[x, 806], [x + 1, 834]]), null, [C.ink, 22], { cap: 1 }),
  G('cordão', poly([[x - 2, 636], [x, 812]]), null, [C.branco, 9]), G('cordão c', poly([[x - 2, 636], [x, 812]]), null, [C.ink, 18])];
const TORSO_TOP = [G('medalha', ell(699, 722, 11), '#e0ba4c', [C.ink, 4]), G('corrente', quad([663, 582], [672, 690], [697, 716]), null, ['#e0ba4c', 4.5]),
  G('corrente 2', quad([729, 582], [722, 690], [701, 716]), null, ['#e0ba4c', 4.5]), ...cord(646), ...cord(757),
  G('pescoço frente', { v: [[654, 540], [730, 540], [730, 594], [654, 594]], i: [[0, 0], [0, 0], [0, 0], [24, 10]], o: [[0, 0], [0, 0], [-24, 10], [0, 0]], c: true }, C.pele, [C.ink, 5]),
  G('gola', poly([[640, 584], [744, 584], [692, 684]], true), C.branco, [C.ink, 5])];
const TORSO_BASE = [G('bolsos', null, null, [C.ink, 4.5], { paths: [quad([560, 1090], [575, 1120], [606, 1128]), quad([824, 1090], [809, 1120], [778, 1128]), quad([692, 1080], [698, 1120], [694, 1150])] }),
  G('quadril', poly([[548, 1050], [548, 1190], [836, 1190], [836, 1050]], true), C.calca), G('quadril c', null, null, [C.ink, LW], { paths: [poly([[545, 1050], [545, 1190]]), poly([[839, 1050], [839, 1190]])] }),
  G('pescoço', rr(652, 440, 80, 140, 30), C.pele, [C.ink, LW])];
export const rig = pose => { const cache = new Map(); return t => { const k = Math.round(t * FPS); if (!cache.has(k)) cache.set(k, solve(pose(t))); return cache.get(k); }; };
export const cam = (Ls, c) => c ? Ls.map(L => ({ ...L, pre: L.pos || L.scale || L.rot || L.anchor ? { anchor: L.anchor, pos: L.pos, scale: L.scale, rot: L.rot } : undefined, ...(typeof c === 'function' ? { anchor: t => c(t).a, pos: t => c(t).p, scale: t => c(t).s * 100, rot: t => c(t).r || 0 } : { anchor: c.a, pos: c.p, scale: c.s * 100, rot: c.r || 0 }) })) : Ls;
export const camPt = (c, v) => c ? add(c.p, rot(mul(sub(v, c.a), c.s), c.r || 0)) : v;
export const camPose = (pose, c0) => c0 ? t => { const q = pose(t), c = typeof c0 === 'function' ? c0(t) : c0; return { ...q, pos: camPt(c, q.pos), s: (q.s ?? 1) * c.s, rot: (q.rot ?? 0) + (c.r || 0),
  punho: q.punho && Object.fromEntries(Object.entries(q.punho).map(([k, v]) => [k, v && camPt(c, v)])) }; } : pose;
export const corpo = (q, p) => add(q.pos, mul(rot(sub(p, PELVE), q.rot ?? 0), q.s ?? 1));
export function personagem(pose, o = {}) {
  const P = o.P || rig(pose);
  const nm = (o.nome || 'Personagem') + ' · ';
  const at = (f, k) => t => f(P(t))[k];
  const limb = (side, isArm) => {
    const D = isArm ? BR : PE, key = (isArm ? 'br' : 'pe') + side, ws = [D.w0, D.w1], cols = isArm ? [C.moletom, C.moletomS] : [C.calca, C.calcaS];
    const g = fn => t => { const q = P(t); return fn(q[key], q.s, q.rot); };
    const nrm = (a, b, dir, R) => { const d = sub(b, a), l = len(d) || 1, n = [-d[1] / l, d[0] / l], L = rot(dir, R); return n[0] * L[0] + n[1] * L[1] >= 0 ? n : mul(n, -1); };
    const off = (k, dir, f) => g((p, s, R) => { const o = mul(nrm(p[k], p[k + 1], dir, R), ws[k] * f * s); return poly([add(p[k], o), add(p[k + 1], o)]); });
    const out = side === 'E' ? [-1, 0] : [1, 0];
    const det = [G('junta', g((p, s) => ell(p[1][0], p[1][1], (isArm ? 24 : 30) * s)), null, [C.ink, t => 5 * P(t).s])];
    det.push(G('punho', g((p, s) => { const d = sub(p[2], p[1]), u = mul(d, 1 / (len(d) || 1)), c = add(p[2], mul(u, -34 * s)), n = [-u[1], u[0]], w = D.w1 / 2 * s;
      return poly([add(c, mul(n, w)), add(c, mul(n, -w))]); }), null, [C.ink, t => 5 * P(t).s], { cap: 1 }));
    if (!isArm) det.push(G('listra', g((p, s, R) => { const n0 = nrm(p[0], p[1], out, R), n1 = nrm(p[1], p[2], out, R), u = mul(sub(p[2], p[1]), 1 / (len(sub(p[2], p[1])) || 1));
      return poly([add(p[0], mul(n0, D.w0 * .37 * s)), add(p[1], mul(add(n0, n1), D.w0 * .185 * s)), add(add(p[2], mul(u, -36 * s)), mul(n1, D.w1 * .37 * s))]); }), null, [C.listra, t => 10 * P(t).s], { cap: 1 }));
    return shapeL(nm + (isArm ? 'braço ' : 'perna ') + side, [...det,
      ...[0, 1].map(k => G('sombra ' + k, off(k, [-1, .35], .27), null, [cols[1], t => ws[k] * .42 * P(t).s], { cap: 1 })),
      ...[0, 1].map(k => G('cor ' + k, g(p => poly([p[k], p[k + 1]])), null, [cols[0], t => ws[k] * P(t).s])),
      ...[0, 1].map(k => G('contorno ' + k, g(p => poly([p[k], p[k + 1]])), null, [C.ink, t => (ws[k] + 2 * LW) * P(t).s]))]);
  };
  const hand = side => {
    const kinds = Object.keys(HANDS), flip = side === 'E' ? 1 : -1;
    return shapeL(nm + 'mão ' + side, kinds.flatMap(k => handGroups(k, flip).map(g => ({ ...g, name: k + ' ' + g.name, op: t => P(t).mao[side] === k ? 100 : 0 }))),
      { pos: at(p => p.wrist, side), rot: at(p => p.handRot, side), scale: t => P(t).s * 115 * (pose(t).maoEsc?.[side] || 1) });
  };
  const knee = side => { const k = t => P(t)['pe' + side], w = t => PE.w0 * P(t).s;
    return shapeL(nm + 'joelho ' + side, [G('junta', t => ell(k(t)[1][0], k(t)[1][1] + .12 * w(t), 30 * P(t).s), null, [C.ink, t => 5 * P(t).s]),
      G('sombra', t => ell(k(t)[1][0] + (side === 'E' ? -.2 : .2) * w(t), k(t)[1][1] + .1 * w(t), .3 * w(t), .38 * w(t)), C.calcaS),
      G('coxa', t => { const a = k(t)[0], b = k(t)[1], h = Math.abs(b[1] - a[1]) / 2; return ell(b[0], (a[1] + b[1]) / 2 + .12 * w(t), .52 * w(t), h + .44 * w(t)); }, C.calca, [C.ink, t => LW * P(t).s])],
      { op: t => 100 * clamp((.8 - P(t).coxa[side]) / .3) }); };
  const shoe = side => shapeL(nm + 'tênis ' + side, regs(CH.tenis[side]), { pos: at(p => p.ankle, side), rot: at(p => p.shoeRot, side), scale: t => P(t).s * 100 });
  const face = shapeL(nm + 'rosto', faceGroups(t => P(t).face), { anchor: NECK, pos: t => P(t).neck, rot: t => P(t).headRot, scale: t => P(t).s * P(t).hs * 100 });
  const head = shapeL(nm + 'cabeça', regs(CH.cabeca), { anchor: NECK, pos: t => P(t).neck, rot: t => P(t).headRot, scale: t => P(t).s * P(t).hs * 100 });
  const torso = shapeL(nm + 'tronco', [...TORSO_TOP, ...regs(CH.tronco), ...TORSO_BASE],
    { anchor: PELVE, pos: t => P(t).pos, rot: t => P(t).rot, scale: t => [P(t).s * 100, P(t).s * 100 * (1 + .006 * Math.sin(t / 3.4 * Math.PI * 2) * (pose(t).resp ?? 1))] });
  const parts = { braçoE: limb('E', 1), braçoD: limb('D', 1), pernaE: limb('E', 0), pernaD: limb('D', 0), mãoE: hand('E'), mãoD: hand('D'), tênisE: shoe('E'), tênisD: shoe('D'), joelhoE: knee('E'), joelhoD: knee('D'), tronco: torso, cabeça: head, rosto: face };
  const order = o.ordem || ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', 'mãoE', 'braçoE', 'mãoD', 'braçoD'];
  return order.map(k => typeof k === 'string' ? parts[k] : k);
}

function solve(q) {
  const s = q.s ?? 1, R = q.rot ?? 0, pos = q.pos;
  const B = p => add(pos, mul(rot(sub(p, PELVE), R), s));
  const neck = B(add(NECK, [0, q.desce ?? 0])), r = { s, pos, rot: R, neck, headRot: R + (q.cab ?? 0), hs: q.hs ?? 1, face: q.rosto || {}, mao: q.mao || { E: 'aberta', D: 'aberta' },
    wrist: {}, handRot: {}, ankle: {}, shoeRot: {}, coxa: {} };
  for (const side of ['E', 'D']) {
    const S = B(SH[side]), [ku, kf] = q.encurta?.[side] ?? [1, 1], a = BR.a * s * ku, b = BR.b * s * kf;
    let E, Wr;
    const T = q.punhoL?.[side] ? B(q.punhoL[side]) : q.punho?.[side];
    const Pl = q.polo?.[side] && B(q.polo[side]);
    if (T) [E, Wr] = ik(S, T, a, b, Pl ? Math.sign((S[1] - T[1]) * (Pl[0] - S[0]) + (T[0] - S[0]) * (Pl[1] - S[1])) || 1 : q.dobra?.[side] ?? (side === 'E' ? 1 : -1));
    else { const [u, f] = q.braco?.[side] || [side === 'E' ? 8 : -8, 0]; E = add(S, mul(rot([0, 1], R + u), a)); Wr = add(E, mul(rot([0, 1], R + u + f), b)); }
    r['br' + side] = [S, E, Wr]; r.wrist[side] = Wr; r.handRot[side] = ang(sub(Wr, E)) - 90 + (q.giroMao?.[side] ?? 0);
    const Hp = B(HIP[side]), [th, sh] = q.perna?.[side] || [0, 0], la = (q.coxa?.[side] ?? 1) * PE.a * s;
    const K = add(Hp, mul(rot([0, 1], R + th), la)), A = add(K, mul(rot([0, 1], R + th + sh), PE.b * s));
    r['pe' + side] = [Hp, K, A]; r.coxa[side] = q.coxa?.[side] ?? 1; r.ankle[side] = A; r.shoeRot[side] = R + th + sh + (q.giroPe?.[side] ?? 0);
  }
  return r;
}

const EYES = [[634.5, 342.5], [786.5, 341.5]];
export const faceDefaults = { gx: 0, gy: 0, open: 1, lid: 0, brow: 0, browIn: 0, smile: 0, mo: 0, mw: 1 };
export function faceGroups(F) {
  const f = t => ({ ...faceDefaults, ...F(t) });
  const eye = (n, t) => { const q = f(t), [cx0, cy0] = EYES[n], cx = cx0 + q.gx, cy = cy0 + q.gy, rx = 16.5 * (1 - Math.abs(q.gx) / 90), ry = 30.5;
    const cut = cy - ry + 2 * ry * clamp(Math.max(q.lid, 1 - q.open), 0, .93);
    const pts = []; for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; pts.push([cx + rx * Math.cos(a), Math.max(cut, cy + ry * Math.sin(a))]); }
    return poly(pts, true); };
  const lidLine = (n, t) => { const q = f(t), [cx0, cy0] = EYES[n], cx = cx0 + q.gx, cy = cy0 + q.gy, ry = 30.5, k = clamp(Math.max(q.lid, 1 - q.open), 0, .93);
    const y = cy - ry + 2 * ry * k, hw = 16.5 * Math.sqrt(Math.max(0, 1 - (1 - 2 * k) ** 2)) + 4; return quad([cx - hw, y + 2], [cx, y - 3], [cx + hw, y + 2]); };
  const brow = (n, t) => { const q = f(t), by = -q.brow, bi = q.browIn;
    return n ? quad([761, 289 + by - bi * 8], [794, 276 + by - bi * 2], [821, 292 + by + bi * 2]) : quad([597, 296 + by + bi * 2], [627, 278 + by - bi * 2], [660, 289 + by - bi * 8]); };
  const mouth = t => { const q = f(t), w = 24 * q.mw * (1 - .35 * q.mo), dep = 13 * q.smile, mx = 705 + q.gx * .25, my = 433;
    return quad([mx - w, my - 2 * Math.max(0, q.smile)], [mx, my + dep * 1.6], [mx + w, my - 2 * Math.max(0, q.smile)]); };
  const mOpen = t => { const q = f(t), w = 24 * q.mw * (1 - .35 * q.mo), h = 26 * q.mo, mx = 705 + q.gx * .25, my = 433 + 4 * q.mo; return ell(mx, my, Math.max(.1, w * .55), Math.max(.1, h / 2)); };
  const lidW = (n) => t => { const q = f(t); return 4.5 * clamp(q.lid * 6) * clamp((q.open - .2) * 5); };
  return [G('boca aberta', mOpen, C.ink), G('boca', mouth, null, [C.ink, 5]),
    G('sobrancelha E', t => brow(0, t), null, [C.ink, 5.5]), G('sobrancelha D', t => brow(1, t), null, [C.ink, 5.5]),
    G('pálpebra E', t => lidLine(0, t), null, [C.ink, lidW(0)]), G('pálpebra D', t => lidLine(1, t), null, [C.ink, lidW(1)]),
    G('olho E', t => eye(0, t), C.ink), G('olho D', t => eye(1, t), C.ink)];
}
export const piscar = (t, ts, d = .09) => { for (const b of ts) { const u = Math.abs(t - b) / d; if (u < 1) return u ** .8; } return 1; };
