import fs from 'fs'; import path from 'path'; import { HERE, add, sub, rot, ang } from './kit.mjs';
const ler = (d, a) => fs.existsSync(`${d}/${a}.json`) ? JSON.parse(fs.readFileSync(`${d}/${a}.json`, 'utf8')) : {};
const PERS = {}, carrega = (pers = 'vetor') => PERS[pers] ??= (() => {
  const d = path.resolve(`${HERE}/../../personagem`, pers), V = ler(d, 'pecas'), R = V.rig, O = R.osso;
  O.cabeca[1].cabeloTras ??= O.cabeca[1].cabelo; O.cabeloTras ??= O.cabelo;
  const dir = n => { const [p, f, a] = O[n]; const c = a || (f && Object.values(f)[0]); return c ? ang(sub(c, p)) - (a ? -90 : 90) : 0; };
  return { V, R, O, ART: R.braco && articula(d, V, R.braco, O), MAOS: ler(d, 'maos'), VAR: ler(d, 'variantes'), BASE: Object.fromEntries(Object.keys(O).map(n => [n, dir(n)])) };
})();
const giro = v => Math.atan2(-v[0], v[1]) * 180 / Math.PI, dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const articula = (d, V, B, O) => {
  const [x0, y0, x1, y1] = B.area, dentro = e => { const n = e.match(/ d="([^"]*)"/)[1].match(/-?[\d.]+/g).map(Number), xs = n.filter((_, i) => !(i % 2)), ys = n.filter((_, i) => i % 2);
    return Math.min(...xs) < x1 && Math.max(...xs) > x0 && Math.min(...ys) < y1 && Math.max(...ys) > y0; };
  const arte = [...fs.readFileSync(`${d}/${B.fonte}.svg`, 'utf8').matchAll(/<path [^>]*\/>/g)].map(m => m[0]).slice(1)
    .filter((e, i) => !B.tira.includes(i) && !(B.tiraCor || []).some(c => e.includes(`fill="${c}"`)) && dentro(e)).join('').replace(/fill="(#\w{6})"/g, (m, h) => B.cores[h] ? `fill="{${B.cores[h]}${h}}"` : m) + (B.remendo || "");
  const ART = { k: dist(O.tronco[1].bracoE, O.tronco[1].bracoD) / dist(B.E.ombro, B.D.ombro), B };
  for (const s of ['E', 'D']) { const L = B[s];
    ART[s] = { S: L.ombro, E: L.cotovelo, W: L.punho, a1: giro(sub(L.cotovelo, L.ombro)), a2: giro(sub(L.punho, L.cotovelo)) };
    for (const p of ['braco', 'ante', 'mao']) { const id = `art${p}${s}`, o = p === 'ante' ? L.cotovelo : p === 'braco' && L.ombro, capa = o && B.capa ? `<circle cx="${o[0]}" cy="${o[1]}" r="${B.capa}"/>` : '';
      V.defs += `<clipPath id="${id}"><path d="M${L[p].map(q => q.join(' ')).join('L')}Z"/>${capa}</clipPath>`;
      V.pecas[`_${p}${s}`] = { svg: `<g clip-path="url(#${id})">${arte}</g>` }; } }
  return ART; };
const arti = (c, s, { J, TH }) => { const A = c.ART[s], k = c.ART.k, r1 = TH['braco' + s] - A.a1, r2 = TH['antebraco' + s] - A.a2, r3 = TH['mao' + s] - A.a2;
  const E = add(J['braco' + s], rot(sub(A.E, A.S).map(v => v * k), r1)), W = add(E, rot(sub(A.W, A.E).map(v => v * k), r2));
  const g = (P, r, O, n) => `<g transform="translate(${N(P[0])} ${N(P[1])}) rotate(${N(r)}) scale(${N(k)}) translate(${-O[0]} ${-O[1]})">${c.P[n + s].svg}</g>`;
  return { A, k, E, W, g, r1, r2, r3 }; };
const ORDEM = ['cabeloTras', 'tenisE', 'tenisD', 'pernaE', 'pernaD', 'virilha', 'tronco', 'cabeca', 'cabelo', 'sobrancelhas', 'maoE', 'bracoE', 'maoD', 'bracoD'];
export const fala = (t, trechos, ritmo = 5.5) => { for (const [a, b] of trechos) if (t > a && t < b) {
  const e = Math.min(1, (t - a) / .08, (b - t) / .08), v = Math.abs(Math.sin((t - a) * Math.PI * ritmo)) * (.55 + .45 * Math.sin(t * 17.3) ** 2);
  return { abre: e * v, larg: 1 - .35 * Math.sin(t * 9.1) ** 2 }; } return { abre: 0, larg: 1 }; };
export const piscar = (t, ts, d = .12) => { for (const b of ts) { const u = Math.abs(t - b) / d; if (u < 1) return 1 - u; } return 0; };
const N = x => Math.round(x * 100) / 100, LW = 6;

const rgb = c => c.slice(1).match(/../g).map(h => parseInt(h, 16)), HEX = /^#[\dA-F]{6}$/i;
const desloca = (o, b, v) => '#' + rgb(o).map((x, i) => { const c = rgb(b)[i], w = rgb(v)[i];
  return Math.max(0, Math.min(255, Math.round(x <= c ? w * (x + 1) / (c + 1) : w + (255 - w) * (x - c) / (255 - c)))).toString(16).padStart(2, '0'); }).join('').toUpperCase();
const tinta = (pal, vr) => (t, o = pal[t]) => { const r = t in vr ? t : t.split('_')[0];
  if (!(r in vr) || !(r in pal)) return o; const b = pal[r], v = vr[r];
  return o === b || !HEX.test(o) || !HEX.test(b) || !HEX.test(v) ? (o === b ? v : o) : desloca(o, b, v); };
let nInst = 0;
const pinta = (pers = 'vetor', variante) => { const c = carrega(pers), k = typeof variante === 'object' ? null : variante || '';
  if (k !== null && c.pint?.[k]) return c.pint[k];
  const vr = typeof variante === 'string' ? c.VAR[variante] || (() => { throw new Error(`variante ${variante}?`); })() : variante || {};
  const cor = tinta(c.V.paleta, vr), suf = pers === 'vetor' && !variante ? '' : `_v${++nInst}`, ids = [...c.V.defs.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  const res = s => ids.reduce((s, i) => s.split(`id="${i}"`).join(`id="${i}${suf}"`).split(`url(#${i})`).join(`url(#${i}${suf})`), s.replace(/\{(\w+)(#\w{6})?\}/g, (_, t, h) => cor(t, h)));
  const map = o => Object.fromEntries(Object.entries(o || {}).map(([n, p]) => [n, { ...p, svg: res(p.svg) }]));
  const r = { ...c, cor, suf, P: map(c.V.pecas), MAOS: map(c.MAOS.pecas), defs: res(c.V.defs), troca: vr.pecas || {} };
  if (k !== null) (c.pint ??= {})[k] = r; return r; };

const un = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const tubo = (c, tipo, lado, A, B, C) => {
  const [tc, ts, w0, w1, b0, b1, tf] = c.R.tubo[tipo], cor = c.cor(tc), som = c.cor(ts), u = un(sub(C, B)), X = add(C, [-u[0] * b0, -u[1] * b0]), Y = add(C, [-u[0] * b1, -u[1] * b1]);
  const pl = (ps, c, w, cap = 'round') => `<path d="M${ps.map(p => `${N(p[0])} ${N(p[1])}`).join('L')}" fill="none" stroke="${c}" stroke-width="${N(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
  const nrm = (p, q, s) => { const d = un(sub(q, p)); let n = [-d[1], d[0]]; if (n[0] * s < 0) n = [-n[0], -n[1]]; return n; };
  const lado1 = (s, f, w) => { const n0 = nrm(A, B, s), n1 = nrm(B, X, s), nm = un(add(n0, n1)); return [add(A, [n0[0] * w0 * f, n0[1] * w0 * f]), add(B, [nm[0] * (w0 + w1) / 2 * f, nm[1] * (w0 + w1) / 2 * f]), add(X, [n1[0] * w1 * f, n1[1] * w1 * f])]; };
  const fora = lado === 'E' ? -1 : 1, corte = p => { const n = [-u[1], u[0]], h = w1 / 2 + LW; return pl([add(p, [n[0] * h, n[1] * h]), add(p, [-n[0] * h, -n[1] * h])], '#000', LW, 'butt'); };
  const bola = (c, r) => `<circle cx="${N(A[0])}" cy="${N(A[1])}" r="${N(r)}" fill="${c}"/>`;
  return bola('#000', w0 / 2 + LW) + pl([A, B, X], '#000', w0 + 2 * LW, 'butt') + pl([X, Y], '#000', w1 + 2 * LW, 'butt') + bola(cor, w0 / 2) + pl([A, B, X], cor, w0, 'butt') +
    pl(lado1(-1, .3), som, w0 * .38) + (tf ? pl(lado1(fora, .36), c.cor(tf), 10) : '') +
    pl([X, Y], tipo === 'perna' ? som : cor, w1, 'butt') + corte(X) + corte(Y);
};

const ANG = (q, c) => ({
  tronco: q.tronco ?? 0, cabeca: q.cab ?? 0,
  ...Object.fromEntries(['E', 'D'].flatMap(s => { const b = q.br?.[s] || [], p = q.pe?.[s] || [], o = s === 'E' ? 1 : -1, A = c.ART?.[s];
    return [['braco' + s, b[0] ?? (A ? A.a1 : 8 * o)], ['antebraco' + s, b[1] ?? (A ? A.a2 - A.a1 : 0)], ['mao' + s, b[2] ?? 0], ['coxa' + s, p[0] ?? 0], ['canela' + s, p[1] ?? 0], ['tenis' + s, p[2] ?? 0]]; })),
});

export function pose(q, c = carrega()) {
  const A = ANG(q, c), M = {}, J = {}, TH = {}, RT = {};
  const vai = (n, W, th) => { const [p, filhos = {}] = c.O[n], r = th - c.BASE[n];
    J[n] = W; TH[n] = th; RT[n] = r; M[n] = `translate(${N(W[0])} ${N(W[1])}) rotate(${N(r)}) translate(${-p[0]} ${-p[1]})`;
    for (const [f, cp] of Object.entries(filhos)) vai(f, add(W, rot(sub(cp, p), r)), th + (A[f] ?? 0)); };
  vai('tronco', [0, 0], A.tronco);
  return { M, J, TH, RT };
}

const mao = (c, s, q, J, TH) => {
  const { esc, y, punho, polegar, giro = {} } = c.R.mao, f = q.mao?.[s] || 'costas', W = J['mao' + s], r = TH['mao' + s] - 180, cab = sub(J.cabeca, W), th = rot([polegar[f] ?? -1, 0], r);
  const dentro = th[0] * cab[0] + th[1] * cab[1] > 0, m = (q.polegar?.[s] === 'fora') === dentro ? -1 : 1;
  return `<g transform="translate(${N(W[0])} ${N(W[1])}) rotate(${N(r)}) scale(${N(m * esc)} ${esc}) rotate(${giro[f] || 0}) translate(${-punho[f]} ${-y})">${c.MAOS[f].svg}</g>`;
};

const pq = (a, c, b) => `M${N(a[0])} ${N(a[1])}Q${N(c[0])} ${N(c[1])} ${N(b[0])} ${N(b[1])}`;
const tr5 = (d, w = 5) => `<path d="${d}" fill="none" stroke="#000" stroke-width="${w}" stroke-linecap="round"/>`;
export const ROSTO0 = { gx: 0, gy: 0, pisca: 0, sobr: 0, sobrIn: 0, sorriso: .6, abre: 0, larg: 1 };
const rosto = (c, r) => {
  const R = c.R.rosto, [rx, ry0] = R.olho, q = { ...ROSTO0, cilios: R.cilios, ...r }, olhos = R.olhos.map(([x, y], k) => {
    const cx = x + q.gx, cy = y + q.gy, ry = ry0 * (1 - q.pisca), s = k ? 1 : -1;
    const cil = !q.cilios ? '' : q.pisca > .8 ? [[15, 2, 7, 5], [10, 6, 3, 8]].map(([a, b, e, f]) => tr5(`M${N(cx + s * a)} ${N(cy + b)}L${N(cx + s * (a + e))} ${N(cy + b + f)}`, 4)).join('')
      : [1.05, .6].map(a => { const p = [cx + s * rx * Math.sin(a), cy + ry0 * q.pisca * .6 - ry * Math.cos(a)], d = un([s * Math.sin(a), -Math.cos(a) - .4]);
        return tr5(`M${N(p[0])} ${N(p[1])}L${N(p[0] + d[0] * 10)} ${N(p[1] + d[1] * 10)}`, 4); }).join('');
    if (q.pisca > .8) return tr5(pq([cx - 15, cy + 2], [cx, cy + 9], [cx + 15, cy + 2]), 5) + cil;
    return `<ellipse cx="${N(cx)}" cy="${N(cy + ry0 * q.pisca * .6)}" rx="${rx}" ry="${N(ry)}" fill="#000"/>` + cil; });
  return olhos.join('') + boca(R.boca, q);
};
const sobrancelhas = (c, r) => { const q = { ...ROSTO0, ...r };
  return c.R.rosto.sobr.map(([x0, y0, x1, y1], i) => {
    const k = i ? 1 : -1, up = q.sobr, inn = q.sobrIn * 9, yi = k < 0 ? y1 : y0, yo = k < 0 ? y0 : y1;
    const A = k < 0 ? [x0, yo - up + inn * .2] : [x0, yi - up - inn], B = k < 0 ? [x1, yi - up - inn] : [x1, yo - up + inn * .2];
    return tr5(pq(A, [(x0 + x1) / 2, Math.min(A[1], B[1]) - 13 + inn * .3], B), 5.5); }).join(''); };
const boca = ([bx, by, bw, bh], q) => {
  const w = bw * q.larg * (1 - .3 * q.abre), mx = bx + q.gx * .3, my = by, sm = q.sorriso * 10, h = bh * q.abre;
  const b = q.abre < .05 ? tr5(pq([mx - w, my - sm * .4], [mx, my + sm * 1.2], [mx + w, my - sm * .4]), 5)
    : `<path d="M${N(mx - w)} ${N(my - sm * .3)}Q${N(mx)} ${N(my - 4 + sm * .5)} ${N(mx + w)} ${N(my - sm * .3)}Q${N(mx)} ${N(my + h + sm)} ${N(mx - w)} ${N(my - sm * .3)}Z" fill="#3a1414" stroke="#000" stroke-width="5" stroke-linejoin="round"/>` +
      (q.abre > .45 ? `<ellipse cx="${N(mx)}" cy="${N(my + h * .62 + sm * .4)}" rx="${N(w * .45)}" ry="${N(h * .16)}" fill="#c96a6a"/>` : '');
  return b;
};

const peca = (c, n, { M, J, TH, RT }, q) => { const m = n.match(/^(braco|perna)([ED])$/), tr = { ...c.troca, ...q.pecas }, k = n in tr ? tr[n] : n;
  if (c.ART && /^(mao|braco)[ED]$/.test(n)) { const s = n.slice(-1), X = arti(c, s, { J, TH }), B = c.ART.B;
    if (n[0] === 'm') return (q.mao?.[s] || 'costas') === 'costas' ? X.g(X.W, X.r3, X.A.W, '_mao') : mao(c, s, q, { ...J, ['mao' + s]: X.W }, TH);
    const bola = (P, r) => `<circle cx="${N(P[0])}" cy="${N(P[1])}" r="${N(r * X.k)}" fill="${c.cor('roupa')}" stroke="#1A191A" stroke-width="${N(2.6 * X.k)}"/>`;
    return bola(J[n], B.ombroR) + bola(X.E, B.cotoveloR) + X.g(X.E, X.r2, X.A.E, '_ante') + X.g(J[n], X.r1, X.A.S, '_braco') + bola(X.E, B.junta); }
  if (/^mao/.test(n)) return mao(c, n.slice(3), q, J, TH);
  if (n === 'sobrancelhas') return `<g transform="${M.cabeca}">${sobrancelhas(c, q.rosto)}</g>`;
  if (n === 'virilha') { const a = J.coxaE, b = J.coxaD, v = add(rot([0, c.R.virilha], q.tronco ?? 0), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    return `<path d="M${N(a[0])} ${N(a[1])}L${N(b[0])} ${N(b[1])}L${N(v[0])} ${N(v[1])}Z" fill="${c.cor(c.R.tubo.perna[0])}"/>`; }
  if (m) { const [, tipo, s] = m; return tubo(c, tipo, s, ...(tipo === 'braco' ? ['braco', 'antebraco', 'mao'] : ['coxa', 'canela', 'tenis']).map(x => J[x + s])); }
  if (!k || !c.P[k]) return '';
  const p = c.O[k]?.[0] || c.O[n][0], T = k === n ? M[n] : `translate(${N(J[n][0])} ${N(J[n][1])}) rotate(${N(RT[n])}) translate(${-p[0]} ${-p[1]})`;
  if (n === 'tronco') { const [x, y, w, h] = c.R.tronco; return `<g transform="${T}"><clipPath id="ct${c.suf}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#ct${c.suf})">${c.P[k].svg}</g></g>`; }
  if (n === 'cabeca') return `<g transform="${T}">${c.P[k].svg}${rosto(c, q.rosto)}</g>`;
  return `<g transform="${T}">${c.P[k].svg}</g>`; };

export const prota = (fq, o = {}) => { const { nome = 'Protagonista', pers, variante } = typeof o === 'string' ? { nome: o } : o, c = pinta(pers, variante);
  return { name: nome, raw: t => {
    const q = fq(t), P = pose(q, c), s = q.s ?? .5;
    return `${c.defs}<g transform="translate(${N(q.pos[0])} ${N(q.pos[1])}) scale(${s})">${(q.ordem || ORDEM).map(n => peca(c, n, P, q)).join('')}</g>`;
  } }; };
