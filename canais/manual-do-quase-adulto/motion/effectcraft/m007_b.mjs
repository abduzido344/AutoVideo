import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';
import { Proj, video, frame, HERE, clamp, io, out } from './kit.mjs';
import { prota, piscar, pose, fala } from './vetor.mjs';
import { rabisco as rab, trim, fim } from './mesa.mjs';
import { PAPEL, TINTA, TURQ, AMBAR, CINZA, VERM, AZUL, AMAR, BRANCO, ent, sai, vis, lerp, raw, fundo, txt, g, cartao } from './mg.mjs';
import { figurante } from './m007_fig.mjs';
import { LIMPO, V, SB, pw, S6, CINZA2, QUENTE, VERDE, ESC, pico, sw, I, pop, leg, selo, SEELIG, trad, pessoa, veleiro, linha, portas } from './m007.mjs';

const CN = `${V}/midia/cenas`, K = 1.5;
const URI = {}, uri = f => URI[f] ??= `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
const MAPA = {}, mapa = id => MAPA[id] ??= JSON.parse(fs.readFileSync(`${CN}/${id}.mapa.json`, 'utf8'));
const img = (f, o = '') => `<image href="${uri(f)}" x="0" y="0" width="1920" height="1080" ${o}/>`;
const bg = id => img(`${CN}/${mapa(id).imagem}`), frente = id => img(`${CN}/${mapa(id).frente_png}`);
const recorte = (f, pts, id) => `<clipPath id="${id}"><path d="M${pts.map(p => `${p[0] * K} ${p[1] * K}`).join('L')}Z"/></clipPath><g clip-path="url(#${id})">${img(f)}</g>`;
const altura = (id, y) => { const E = mapa(id).escala_personagem; let i = 0; while (i < E.length - 2 && y > E[i + 1].pes_y) i++;
  const a = E[i], b = E[i + 1]; return a.altura_px + (b.altura_px - a.altura_px) * (y - a.pes_y) / (b.pes_y - a.pes_y); };
const ALT = { vetor: [1150, 494], feminina: [981, 472] };
const no = (id, x, y, pers = 'vetor', f = 1) => { const [h, pe] = ALT[pers], s = altura(id, y) * K * f / h; return { pos: [x * K, y * K - pe * s], s }; };
const sombra = (x, y, w, op = .28) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * .16}" fill="url(#somb)" opacity="${Math.min(1, op / .3)}"/>`;
const NOITE = `<filter id="nt" filterUnits="userSpaceOnUse" x="-200" y="-200" width="2400" height="1500"><feColorMatrix type="matrix" values=".62 0 0 0 .01  0 .64 0 0 .02  0 0 .74 0 .05  0 0 0 1 0"/></filter>`;
const DEFS = `<defs><radialGradient id="somb"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".7" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="tunel" cx=".5" cy=".5" r=".5"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".94"/></radialGradient>` +
  `<linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fcbe8"/><stop offset="1" stop-color="#f6d7a6"/></linearGradient>${NOITE}</defs>`;
const noite = s => `<g filter="url(#nt)">${s}</g>`;
const tinta = (cor, op) => op <= 0 ? '' : `<rect x="-100" y="-100" width="2120" height="1280" fill="${cor}" opacity="${op}"/>`;
const camera = (c, body) => { const hx = 960 / c.z, hy = 540 / c.z, x = c.livre ? c.x : clamp(c.x, hx, 1920 - hx), y = c.livre ? c.y : clamp(c.y, hy, 1080 - hy);
  return `<g transform="translate(960 540) scale(${c.z}) translate(${-x} ${-y})">${body}</g>`; };
const desloc = (c, c0, k) => `<g transform="translate(${(c.x - c0.x) * k} ${(c.y - c0.y) * k})">`;
const tunel = k => k <= 0 ? '' : `<g transform="translate(960 540) scale(${lerp(3.2, 1.05, k)})"><rect x="-960" y="-540" width="1920" height="1080" fill="url(#tunel)"/></g>` + (k > .6 ? `<rect width="1920" height="1080" fill="none" stroke="#000" stroke-width="${(k - .6) * 600}"/>` : '');
const P = (f, o = {}) => prota(t => { const q = f(t);
  return { tronco: .6 * sw(t), cab: 0, ...q, rosto: { pisca: piscar(t, [1.1, 3.4, 5.9, 8.2]), ...(q.rosto || {}) } }; }, o);
const mao = (q, lado = 'D', f = 1) => { const J = pose(q).J['mao' + lado]; return [q.pos[0] + J[0] * q.s * f, q.pos[1] + J[1] * q.s * f]; };
const SEM_PERNAS = ['cabeloTras', 'tronco', 'cabeca', 'cabelo', 'sobrancelhas', 'maoE', 'bracoE', 'maoD', 'bracoD'];
const FIG = { pele: '#9a9893', cabelo: '#4d4f54', roupa: '#7c8088', calca: '#4a4d52', tenis: '#5d6066', mao: '#77797e', detalhe: '#8d9096' };
const TINA = { cabelo: '#c98a4b', roupa: '#7B4FB5' };
const W = a => (frag, rel) => pw(frag, a + rel) - a;
const traco = (p, k, cor = '#2b4c8c') => k <= .002 ? '' : `<path d="M${trim(p, k).map(q => q.join(' ')).join('L')}" fill="none" stroke="${cor}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
const rp = ([x, y], d, cx, cy) => { const r = d * Math.PI / 180, dx = x - cx, dy = y - cy; return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)]; };
const lp = (A, B, k) => A.map((x, i) => x + (B[i] - x) * k);
const contador = (n, t, t0 = 0, rot = 'fotos', x = 1700) => LIMPO ? '' : g(`<rect x="-170" y="-60" width="340" height="120" rx="24" fill="${BRANCO}" ${S6}/>` + txt(String(n), -50, 30, { tam: 84 }) + txt(rot, 40, 22, { tam: 34, cor: '#666', anc: 'start' }), { x, y: 120, op: ent(t, t0, .4) });
const LAY = new Proj(), lay = (Ls, t) => Ls.map(L => LAY.layer(L, t, { n: 0 })).join('');

const FOTOS = [[-700, -330, 300, 200], [-360, -330, 260, 200], [-700, 60, 200, 150], [-460, 60, 360, 260], [110, 160, 260, 180], [420, 160, 280, 180], [110, 380, 300, 90], [-700, 250, 200, 110]];
const foto = ([x, y, w, h], on = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${on ? '#9cc3e0' : '#b9c3cc'}" stroke="#555" stroke-width="3"/><path d="M${x + 10} ${y + h - 10}L${x + w * .35} ${y + h * .45}L${x + w * .55} ${y + h * .7}L${x + w * .75} ${y + h * .4}L${x + w - 10} ${y + h - 10}Z" fill="${on ? '#6e9fc2' : '#98a3ad'}"/><circle cx="${x + w * .78}" cy="${y + h * .28}" r="${Math.min(w, h) * .1}" fill="${on ? AMAR : '#cfd5da'}"/>`;
const linhas = (x, y, w, n, gap = 26) => Array.from({ length: n }, (_, i) => `<path d="M${x} ${y + i * gap}h${w * (i % 5 === 4 ? .6 : 1)}" stroke="#b7b3aa" stroke-width="9"/>`).join('');
const AN1 = [['PARE', 0], ['DE', 0], ['CONTAR.', 0], ['HÁ', 1], ['43', 1], ['FOTOS', 2], ['NESTE', 2], ['JORNAL.', 2]];
const AN2 = [['PARE', 0], ['DE', 0], ['CONTAR.', 0], ['DIGA AO', 1], ['PESQUISADOR', 1], ['QUE VIU ISTO', 2], ['E GANHE', 2], ['£250', 3]];
const LIN = { 1: [[-150, 70], [10, 190], [190, 58]], 2: [[-180, 64], [-80, 46], [10, 46], [150, 170]] };
const anuncio = (L, ks, brilho = 0) => { const x = 90, y = -470, w = 680, h = 520, cx = x + w / 2, cy = y + h / 2, Ls = LIN[L === AN1 ? 1 : 2], por = Ls.map(() => []);
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fffdf6" stroke="#555" stroke-width="3"/>` + (brilho > 0 ? `<rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" fill="none" stroke="${AMAR}" stroke-width="18" opacity="${brilho}"/>` : '');
  L.forEach(([p, l], i) => por[l].push([p, ks[i] || 0]));
  por.forEach((ws, l) => { const [dy, tam] = Ls[l]; if (!ws.some(([, k]) => k > 0)) return;
    s += `<text x="${cx}" y="${cy + dy + tam * .35}" font-family="Segoe UI" font-weight="700" font-size="${tam}" text-anchor="middle">` + ws.map(([p, k]) => `<tspan fill="${/\d/.test(p) ? VERM : TINTA}" fill-opacity="${k}">${p.replace('&', '&amp;')}</tspan>`).join(' ') + `</text>`; });
  return s; };
const jornal = ({ ks1 = [], ks2 = null, fotos = -1, b1 = 0, b2 = 0, escuro = 0, soFotos = 0 } = {}) => {
  const meio = ks2 != null;
  let s = `<rect x="-806" y="-502" width="1640" height="1040" fill="#000" opacity=".22"/><rect x="-820" y="-520" width="1640" height="1040" fill="#f3efe4" stroke="#555" stroke-width="4"/><path d="M0 -520V520" stroke="#cfc8b8" stroke-width="6"/>`;
  if (!meio) s += `<rect x="-760" y="-480" width="700" height="100" fill="#e7e1d2"/>` + txt('DIÁRIO', -410, -408, { tam: 64, cor: '#333' });
  s += linhas(-700, -100, 300, 5) + linhas(-300, -100, 240, 5) + linhas(-700, 400, 620, 3) + linhas(110, 100, 640, 2);
  FOTOS.forEach((f, i) => { s += foto(f, fotos === i || fotos === 99); });
  s += anuncio(meio ? AN2 : AN1, meio ? ks2 : ks1, meio ? b2 : b1);
  if (soFotos > 0) s += `<rect x="-820" y="-520" width="1640" height="1040" fill="#000" opacity="${.78 * soFotos}"/>` + FOTOS.map(f => g(foto(f, 1), { op: soFotos })).join('');
  return s + (escuro ? `<rect x="-820" y="-520" width="1640" height="1040" fill="#000" opacity="${escuro}"/>` : '');
};
const ksDe = (t, ts) => ts.map(x => ent(t, x - .12, .3));
const madeira = `<rect x="-100" y="-100" width="2120" height="1280" fill="#a77d55"/>` + Array.from({ length: 14 }, (_, i) => `<path d="M-200 ${-200 + i * 120}Q960 ${-230 + i * 120} 2200 ${-190 + i * 120}" stroke="#946a45" stroke-width="5" fill="none"/>`).join('');
const dedo = (cor = '#55B793', r = 0) => g(`<rect x="-80" y="200" width="160" height="900" rx="60" fill="${cor}" ${S6}/><rect x="-74" y="200" width="148" height="44" rx="14" fill="#419479" ${S6}/>` +
  `<path d="M-62 214q-12 -86 10 -124h104q24 38 10 124z" fill="#6E6E6E" ${S6}/><rect x="-16" y="0" width="34" height="130" rx="17" fill="#6E6E6E" ${S6}/><path d="M-50 110q-30 30 -12 84" fill="none" stroke="#1b1b1b" stroke-width="5"/><path d="M-30 150h70M-26 176h64" stroke="#1b1b1b" stroke-width="4"/>`, { r });
const PONTOS = FOTOS.map(([x, y, w, h]) => [x + w / 2, y + h / 2]);
const contaDedo = (t, t0, dt, ordem) => { const u = Math.max(0, (t - t0) / dt), i = Math.min(ordem.length - 1, Math.floor(u)), f = io(clamp((u - i) / .55)), A = PONTOS[ordem[i]], B = PONTOS[ordem[Math.min(ordem.length - 1, i + 1)]];
  return { p: [lerp(A[0], B[0], f), lerp(A[1], B[1], f) - 40 * Math.sin(Math.PI * f)], i, toca: f < .05 || f > .95 }; };

const beira = (id, x = 860, quadril = 505, pes = 655) => { const s = altura(id, pes) * K / 1150;
  return { tronco: { pos: [x * K, quadril * K + 57 * s], s }, pernas: { pos: [x * K, pes * K - 494 * s], s, ordem: ['pernaE', 'pernaD', 'virilha', 'tenisE', 'tenisD'], pe: { E: [2, -2, 0], D: [-3, 3, 0] } }, sx: x * K, sy: pes * K, s }; };
const BC = beira('C2');
const PERNAS = P(() => BC.pernas);
const FEED = [['aviao', AZUL, 'viagem'], ['festa', AMAR, 'festa'], ['cracha', TURQ, 'crachá novo'], ['coracao', '#e98aa0', 'casamento'], ['estrela', AMBAR, 'promoção'], ['trofeu', VERDE, 'maratona']];
const feed = ({ scroll = 0, cinza = -9, vaga = -9, brilho = 0, t = 0 }) => {
  let s = `<rect x="-230" y="-420" width="460" height="840" rx="56" fill="#17191c" ${S6}/><rect x="-200" y="-380" width="400" height="760" rx="22" fill="#f4f6f8"/><clipPath id="tl"><rect x="-200" y="-380" width="400" height="760" rx="22"/></clipPath><g clip-path="url(#tl)">`;
  const base = Math.floor(scroll / 240);
  for (let i = -1; i < 5; i++) { const idx = i + base, y = -350 + i * 240 - (scroll - base * 240), [ic0, cor, l] = FEED[((idx % 6) + 6) % 6], meu = idx === cinza, vg = idx === vaga;
    s += `<rect x="-180" y="${y}" width="360" height="210" rx="18" fill="${meu ? '#c9ccd0' : BRANCO}" stroke="#bbb" stroke-width="3"/><rect x="-160" y="${y + 20}" width="320" height="120" rx="12" fill="${meu ? '#a9adb3' : vg ? '#f3e3b8' : cor}"/>` +
      g(I[vg ? 'cracha' : meu ? 'relogio' : ic0], { x: 0, y: y + 80, s: .5 }) + txt(vg ? 'vaga aberta' : meu ? 'eu' : l, -160, y + 186, { tam: 30, anc: 'start', cor: meu ? '#777' : '#333' }) +
      (!meu && !vg && brilho > 0 ? `<rect x="-184" y="${y - 4}" width="368" height="218" rx="20" fill="none" stroke="${AMAR}" stroke-width="8" opacity="${brilho * (.6 + .4 * Math.sin(t * 6 + idx))}"/>` : ''); }
  return s + `</g>`; };
const ROSTO_NOITE = { gx: 8, gy: 16, sorriso: -.15, sobr: -2 };
const cel = { br: { D: [-10, -120, 0] }, mao: { D: 'celular' } };
const relogioParede = (t, a) => g(`<circle r="62" fill="#e9e6df" stroke="#2a2a2a" stroke-width="7"/><path d="M0 0L${44 * Math.sin(a)} ${-44 * Math.cos(a)}" stroke="#222" stroke-width="7" stroke-linecap="round"/><path d="M0 0L${30 * Math.sin(a / 12)} ${-30 * Math.cos(a / 12)}" stroke="#222" stroke-width="9" stroke-linecap="round"/><circle r="6" fill="#222"/>`, { x: 600 * K, y: 170 * K });
const camaCena = (f, { manha = 0, extra = () => '', painel = () => '', cam = () => ({ z: 1, x: 960, y: 540 }) } = {}) => { const T = P(t => ({ ...BC.tronco, ordem: SEM_PERNAS, ...f(t) }));
  return [raw('cena', t => { const c = cam(t), m = typeof manha === 'function' ? manha(t) : manha;
    const pers = T.raw(t);
    return DEFS + camera(c, bg('C2') + (m ? `<rect x="${770 * K}" y="${55 * K}" width="${270 * K}" height="${282 * K}" fill="url(#ceu)" opacity="${m}"/>` + tinta('#ffd59a', .14 * m) : '') +
      (m ? pers : noite(pers)) + frente('C2') + extra(t, c)) + (LIMPO ? '' : painel(t)); })]; };
const painelFeed = (t, o, k) => k <= 0 || LIMPO ? '' : g(feed({ t, ...o }), { x: 420, y: 520 + (1 - k) * 40, s: .9 * (.94 + .06 * k), op: k });

const C = {
  M001: a => { const w = W(a), ks = w('sorte', 3.8);
    return camaCena(t => ({ ...cel, cab: 6, rosto: { ...ROSTO_NOITE, sorriso: -.1 - .25 * ent(t, ks - .3) } }),
      { painel: t => painelFeed(t, { scroll: 240 * Math.max(0, t - .5) * .8, brilho: ent(t, w('pessoa', 2.7)) }, ent(t, w('vida', .7) - .2)) }); },
  M011: a => { const w = W(a);
    return camaCena(t => ({ br: { D: [20, 150, 0] }, mao: { D: 'costas' }, cab: -8, rosto: { gx: 14, gy: -10, sorriso: -.35, sobrIn: .6, sobr: -1, pisca: piscar(t, [1.8, 3.9]) } }),
      { cam: t => ({ z: 1.45 + .06 * t / 4.5, x: BC.sx - 160, y: 560 }), extra: t => relogioParede(t, 6 * t + 3 * Math.max(0, t - w('acontece', .8)) ** 2.4) }); },
  M044: a => { const w = W(a), kn = w('não', 2.7), kd = w('nada', 4.4) - .45;
    const bal = (s, t0, x, y, t) => pop(`<ellipse rx="${s.length * 14 + 70}" ry="70" fill="${BRANCO}" ${S6}/>` + txt(s, 0, 14, { tam: 42 }) + `<circle cx="-30" cy="98" r="16" fill="${BRANCO}" ${S6}/><circle cx="-50" cy="132" r="9" fill="${BRANCO}" ${S6}/>`, t, t0, { x, y });
    return camaCena(t => ({ br: { E: [8, -4, 0], D: [-8, 4, 0] }, cab: 4, rosto: { gx: 4, gy: -16, sorriso: -.45, sobrIn: .8, sobr: 1, pisca: piscar(t, [1.2, 3.1]) } }),
      { cam: () => ({ z: 1.25, x: BC.sx - 160, y: 520 }), painel: t => bal('não sou bom o bastante', kn - .15, 640, 200, t) + bal('nada dá certo', kd, 1380, 260, t) }); },
  M089: a => { const w = W(a), ko = w('olhar', 1.5), up = t => io(clamp((t - ko + .2) / .7));
    return camaCena(t => ({ ...cel, br: { D: lp([-10, -120, 0], [-14, -96, 0], up(t)) }, cab: 6 - 10 * up(t), rosto: { gx: lerp(8, -4, up(t)), gy: lerp(16, -6, up(t)), sorriso: lerp(-.1, .9, up(t)), sobr: 3 * up(t) } }),
      { manha: 1, painel: t => painelFeed(t, { scroll: 240 * t * .8 }, 1 - ent(t, ko + .3, .5)) }); },

  M012: a => { const w = W(a), kd = w('diferente', 4.3), kp = w('perceber', 5.8);
    return [raw('jornal', t => madeira + g(jornal({ b1: pico(t, kd + .3, .45) }), { x: 960, y: 540, s: .86 + .05 * t / 7.2 }) + pop(txt('?', 0, 0, { tam: 260, cor: AMBAR }), t, kp - .15, { x: 1330, y: 400 }))]; },
  M019: a => { const w = W(a), z = t => io(clamp((t - w('página', .1)) / .6)), kc = w('cinco', 4.4);
    return [raw('pag2', t => { const k = z(t), r = io(clamp((t - kc + .2) / .8));
      return madeira + g(jornal({ b1: ent(t, w('anúncio', 1.4) - .1, .4) }) +
        g(txt('P', 0, 0, { tam: 330, cor: '#d9d2c2' }) + `<path d="M150 -238V0" stroke="${VERM}" stroke-width="8" opacity="${r}"/><path d="M130 -238h40M130 0h40" stroke="${VERM}" stroke-width="8" opacity="${r}"/>`, { x: 380, y: -40, op: ent(t, w('letras', 3.2) - .1) }),
        { x: lerp(960, 960 - 430 * 1.55, k), y: lerp(540, 540 + 210 * 1.55, k), s: lerp(.86, 1.55, k) }) +
        (r > 0 ? g(`<rect x="0" y="-30" width="90" height="560" rx="8" fill="${AMAR}" ${S6}/>` + Array.from({ length: 12 }, (_, i) => `<path d="M0 ${i * 45}h${i % 2 ? 24 : 44}" stroke="${TINTA}" stroke-width="5"/>`).join('') + txt('5 cm', 130, 290, { tam: 70, cor: VERM, anc: 'start' }), { x: 1260, y: 230 + (1 - r) * 40, op: r }) : ''); })]; },
  M020: a => { const w = W(a), ts = [w('pare', .9), w('de', 1.4), w('contar', 1.6), w('há', 2.5), w('quarenta', 2.7), w('fotos', 3.8), w('neste', 4.3), w('neste', 4.3) + .35];
    return [raw('escreve', t => madeira + g(jornal({ ks1: ksDe(t, ts), b1: .5 * pico(t, ts[4] + .2, .4) }), { x: 960 - 430 * 1.55, y: 540 + 210 * 1.55, s: 1.55 + .03 * t / 4.7 }))]; },
};
const TODO1 = [1, 1, 1, 1, 1, 1, 1, 1];
const OMBRO = [520, 1080];
const nuca = (x, y, k, cab = 0, cima = 0) => g(`<path d="M-240 400V130q0 -120 120 -150h240q120 30 120 150v270z" fill="#55B793" ${S6}/><path d="M-130 -30q130 70 260 0q-20 70 -130 80q-110 -10 -130 -80z" fill="#419479" ${S6}/>` +
  g(`<rect x="-46" y="-120" width="92" height="130" rx="34" fill="#C3C2C2" ${S6}/><ellipse cx="-178" cy="-150" rx="28" ry="42" fill="#DAD9D9" ${S6}/><ellipse cx="178" cy="-150" rx="28" ry="42" fill="#DAD9D9" ${S6}/>` +
    `<path d="M0 -440q120 0 170 90q30 80 10 170q-30 70 -180 90q-150 -20 -180 -90q-20 -90 10 -170q50 -90 170 -90z" fill="#2D2D2D" ${S6}/><path d="M-80 -380l40 60M10 -400l20 70M90 -370l-10 60M-120 -300l40 40M120 -290l-30 40" stroke="#111" stroke-width="6" stroke-linecap="round"/>`,
    { y: -40 * cima, r: cab }), { x, y, s: k });
const sobreOmbro = (f, { cont = null, soFotos = () => 0 } = {}) => [raw('mesa', t => { const o = f(t);
    const pj = [1060, 540], sj = .78, tip = [pj[0] + o.p[0] * sj, pj[1] + o.p[1] * sj], v = [OMBRO[0] - tip[0], OMBRO[1] - tip[1]], r = Math.atan2(-v[0], v[1]) * 180 / Math.PI;
    return madeira + g(jornal({ ks1: TODO1, b1: o.b || 0, soFotos: soFotos(t) }), { x: pj[0], y: pj[1], s: sj }) + (o.extra || '') + g(dedo(), { x: tip[0], y: tip[1] + (o.toca ? 0 : -6), r }); }),
  raw('ui', t => { const o = f(t); return nuca(250, 1010, 1.15, o.cab || 0, o.cima || 0) + (cont ? contador(cont(t), t, 0, 'fotos', 230) : '') + (o.ui || ''); })];
const PAN = [...PONTOS, [430, -210]];
const anda = (t, t0, dt, ordem) => { const u = Math.max(0, (t - t0) / dt), i = Math.min(ordem.length - 1, Math.floor(u)), f = io(clamp((u - i) / .6)), A = PAN[ordem[i]], B = PAN[ordem[Math.min(ordem.length - 1, i + 1)]];
  return { p: [lerp(A[0], B[0], f), lerp(A[1], B[1], f) - 30 * Math.sin(Math.PI * f)], toca: f < .04 || f > .96, i, f }; };
const tensoC1 = { gx: 2, gy: 16, sobrIn: .8, sobr: -2, sorriso: -.3 };
const C1Q = { pos: no('C1', 1000, 640).pos, s: no('C1', 1000, 640).s };
const papel = (s = 1, on = 0) => g(`<rect x="-80" y="-100" width="160" height="200" rx="4" fill="#f3efe4" stroke="#444" stroke-width="5"/><rect x="-62" y="-80" width="56" height="44" fill="#b9c3cc"/><rect x="6" y="-80" width="56" height="70" fill="${on ? AMAR : '#fffdf6'}" stroke="#777" stroke-width="2"/>` + linhas(-62, -10, 124, 4, 22).replace(/stroke-width="9"/g, 'stroke-width="7"'), { s });
const lupa = (cx, cy, r, inner, k = 1) => k <= 0 || LIMPO ? '' : g(`<clipPath id="lp${cx}"><circle r="${r}"/></clipPath><circle r="${r + 14}" fill="#000" opacity=".2" transform="translate(10 14)"/><g clip-path="url(#lp${cx})"><rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" fill="#a77d55"/>${inner}</g><circle r="${r}" fill="none" stroke="${TINTA}" stroke-width="14"/><path d="M${r * .72} ${r * .72}l${r * .4} ${r * .4}" stroke="${TINTA}" stroke-width="34" stroke-linecap="round"/>`, { x: cx, y: cy, s: .9 + .1 * k, op: k });
Object.assign(C, {
  M021: a => { const w = W(a); return sobreOmbro(t => ({ ...anda(t, .1, .75, [3, 8, 4, 5]), cab: 0 }), { cont: t => 27 + [0, 0, 1, 2][anda(t, .1, .75, [3, 8, 4, 5]).i] }); },
  M026: a => { const w = W(a), ka = w('anúncio', 2.2), ks = io(clamp((t0 => 0)(0)));
    return sobreOmbro(t => { const u = clamp((t - ka + .6) / .7), sus = pico(t, ka, .3), ap = io(clamp((t - ka) / .5));
      const A = PAN[5], B = PAN[8], p = [lerp(A[0], B[0], io(u)), lerp(A[1], B[1], io(u))];
      return { p: t < ka - .6 ? anda(t, 0, .8, [4, 5]).p : p, toca: true, cab: -3 * sus, cima: Math.max(sus, .4 * ap), b: ap * (.6 + .4 * Math.sin(t * 9)), ui: pop(txt('!', 0, 0, { tam: 220, cor: AMBAR }), t, ka + .1, { x: 1780, y: 420 }) }; },
      { cont: t => t < 1 ? 41 : 42 }); },
  M090: a => { const w = W(a), ks = w('sorte', .6);
    return sobreOmbro(t => { const u = io(clamp((t - .1) / (ks - .1))), A = PAN[5], B = PAN[8];
      return { p: [lerp(A[0], B[0], u), lerp(A[1], B[1], u)], toca: true, cima: .5 * ent(t, ks), b: ent(t, ks, .3), ui: pop(I.check, t, ks + .1, { x: 1780, y: 330, s: 1.2 }) }; }); },
  M016: a => { const w = W(a), ke = w('entregava', 1), kc = w('contar', 3.2), ts = [kc, w('quantas', 3.7), w('fotos', 4.4), w('ali', 5.2)];
    const fig = no('C1', 140, 655), heroi = no('C1', 330, 650);
    const pass = t => io(clamp((t - ke) / .7)), traz = t => io(clamp((t - ke - .9) / .6));
    const F = figurante('bia', t => ({ ...no('C1', 140, 655, 'feminina'), br: { D: lp([-18, 9, 0], [-72, -12, 0], clamp((t - ke + .6) / .6) * (1 - io(clamp((t - ke - .8) / .6)))) }, mao: { D: 'aberta' }, rosto: { gx: 10, gy: 4, sorriso: .2 } }));
    const H = P(t => ({ ...heroi, br: { E: lp(lp([19, -7, 0], [72, 12, 0], clamp((t - ke) / .5)), [24, 128, 0], traz(t)) }, mao: { E: 'aberta' }, rosto: { gx: lerp(-10, 2, traz(t)), gy: lerp(2, 16, traz(t)), sorriso: .1 } }));
    return [raw('c1', t => { const c = { z: 1.35, x: 560, y: 640 }, fq = F.raw && null;
      const mf = mao({ ...fig, br: { D: [-72, -12, 0] } }, 'D'), mh = traz(t) > 0 ? mao({ ...heroi, br: { E: [24, 128, 0] } }, 'E') : mao({ ...heroi, br: { E: [72, 12, 0] } }, 'E');
      const mh0 = mao({ ...heroi, br: { E: [72, 12, 0] } }, 'E'), pp = t < ke ? mf : t < ke + .9 ? lp(mf, mh0, pass(t)) : lp(mh0, mh, traz(t));
      const i = Math.min(3, ts.filter(x => t > x).length);
      return DEFS + camera(c, bg('C1') + sombra(fig.pos[0], 655 * K, 100) + sombra(heroi.pos[0], 650 * K, 100) + F.raw(t) + H.raw(t) + (t > ke - .7 ? g(papel(heroi.s * 1.3), { x: pp[0], y: pp[1] - 10, r: -8 }) : '') + frente('C1')) +
        lupa(1380, 430, 300, g(jornal({ fotos: [-1, 3, 0, 1, 2][i] }), { s: .42, x: 40 * (1 - i), y: 0 }) + (i > 0 ? g(dedo(), { x: PONTOS[[3, 0, 1, 2][i - 1]][0] * .42 + 40 * (1 - i), y: PONTOS[[3, 0, 1, 2][i - 1]][1] * .42, s: .45, r: -20 }) : ''), ent(t, kc - .3, .5)) +
        (t > kc - .2 ? contador(i, t, kc - .2) : ''); })]; },
  M023: a => { const w = W(a), kd = w('direto', 4.3);
    const H = P(t => ({ ...C1Q, br: { E: [24, 128, 0] }, mao: { E: 'aberta' }, rosto: { ...tensoC1, pisca: piscar(t, [1.5, 4]) } }));
    return [raw('c1', t => { const c = { z: 1.15 + .04 * t / 6.4, x: 1180, y: 560 }, mh = mao({ ...C1Q, br: { E: [24, 128, 0] } }, 'E'), n = 31 + Math.floor(t / .55);
      const pisca = .5 + .5 * Math.sin(t * 8), passa = anda(t, .2, .9, [0, 1, 8, 4, 5, 6, 2]);
      return DEFS + camera(c, bg('C1') + sombra(C1Q.pos[0], 640 * K, 100) + H.raw(t) + g(papel(C1Q.s * 1.3, 1), { x: mh[0], y: mh[1] - 10, r: -8 }) + frente('C1')) +
        lupa(560, 450, 330, g(jornal({ ks1: TODO1, b1: pisca }), { s: .36, x: -20 }) + g(`<rect x="-120" y="-90" width="240" height="180" fill="#fffdf6" stroke="#555" stroke-width="3"/>` + txt('£250', 0, 30, { tam: 80, cor: VERM }) + `<rect x="-128" y="-98" width="256" height="196" fill="none" stroke="${AMAR}" stroke-width="12" opacity="${1 - pisca}"/>`, { x: -130, y: 180 }) +
          g(dedo(), { x: passa.p[0] * .36 - 20, y: passa.p[1] * .36, s: .55, r: -20 }), ent(t, 0)) + contador(n, t, 0); })]; },
  M025: a => { const w = W(a), ke = w('estreita', .9), kq = w('Quem', 3);
    const H = P(t => ({ ...C1Q, br: { E: [24, 128, 0] }, mao: { E: 'aberta' }, cab: .8 * Math.sin(t * 9), rosto: { ...tensoC1, sobrIn: .8 + .2 * ent(t, ke), pisca: piscar(t, [2.2]) } }));
    const rosto = [C1Q.pos[0] + 0, C1Q.pos[1] - 420 * C1Q.s];
    return [raw('close', t => { const k = io(clamp((t - ke) / 1.4));
      if (t < kq) return DEFS + camera({ z: 3.1 + .15 * t / 3, x: rosto[0], y: rosto[1] }, bg('C1') + H.raw(t) + frente('C1')) + tunel(k * .85);
      const u = ent(t, kq, .5); return madeira + g(jornal({ soFotos: 1, ks1: TODO1 }), { x: 960, y: 540, s: .95 + .05 * (t - kq) / 4 }) + tunel(.85 + .1 * u); })]; },
  M030: a => { const w = W(a), kc = w('celular', 1.2), kr = w('rola', 2.4), kco = w('comparando', 3.2);
    const cena2 = camaCena(t => ({ ...cel, cab: 6, rosto: { ...ROSTO_NOITE, sorriso: -.2 } }), { painel: t => painelFeed(t, { scroll: 240 * Math.max(0, t - kr) * .9, cinza: 2, brilho: ent(t, kco) }, 1) + contador(1 + Math.floor(Math.max(0, t - kr) * 1.1), t, kr - .2, 'posts') })[0];
    return [raw('m', t => { if (t >= kc) return cena2.raw(t);
      const f = io(clamp((t - .3) / (kc - .3))), sx = lerp(.86, .14, f), sy = lerp(.86, .4, f);
      return `<rect width="1920" height="1080" fill="#2a2d33"/>` + g(f < .7 ? `<g transform="scale(${sx / .86} ${sy / .86})">${jornal()}</g>` : feed({ t, scroll: 0 }), { x: 960, y: 540, s: f < .7 ? .86 : lerp(.6, 1, (f - .7) / .3) }); })]; },
  M031: a => { const w = W(a), kv = w('vaga', 1.9), kp = w('passa', 2.3);
    return [raw('cel', t => { const sc = 240 * Math.max(0, t - .1) * 1.1 + 240 * 1.5 * io(clamp((t - kp) / .8));
      const polegar = 20 * Math.sin(Math.min(t, 4) * Math.PI * 2 / .9);
      return DEFS + camera({ z: 2.2, x: 1100, y: 420 }, bg('C2')) + tinta('#0b0f1a', .55) +
        g(feed({ t, scroll: sc, vaga: 1 + Math.floor((240 * (kv - .1) * 1.1) / 240) + 1 }), { x: 960, y: 560, s: 1.15 }) +
        g(`<path d="M-300 520q-40 -260 60 -380q60 -40 110 10l160 200q30 40 -10 70l-40 30z" fill="#6E6E6E" ${S6}/><rect x="-60" y="-120" width="70" height="260" rx="35" fill="#6E6E6E" ${S6} transform="rotate(${-40 + polegar})"/>`, { x: 760, y: 860 }) +
        g(`<rect x="-40" y="-30" width="90" height="56" rx="26" fill="#6E6E6E" ${S6}/><rect x="-40" y="40" width="84" height="54" rx="26" fill="#6E6E6E" ${S6}/><rect x="-40" y="110" width="76" height="52" rx="26" fill="#6E6E6E" ${S6}/>`, { x: 1250, y: 640 }) +
        contador(31 + Math.floor(t * 1.2), t, 0, 'fotos'); })]; },
  M022: a => { const w = W(a), ts = [w('pare', 2.4), w('de', 2.9), w('contar', 3.1), w('diga', 4), w('pesquisador', 4.5), w('viu', 5.4), w('ganhe', 6.4), w('duzentas', 6.7)];
    const vira = t => clamp((t - .1) / .45);
    return [raw('folheia', t => { const n = Math.min(2, Math.floor((t - .1) / .45)), f = vira(t - n * .45 + 0) % 1, z = io(clamp((t - 1.3) / .7));
      const pagina = t < 1.0 ? (() => { const u = ((t - .1) / .45) % 1, sx = Math.cos(Math.PI * io(clamp(u)));
        return `<g transform="scale(${Math.abs(sx) < .02 ? .02 : sx} 1)"><rect x="0" y="-520" width="820" height="1040" fill="${sx > 0 ? '#f3efe4' : '#ebe5d6'}" stroke="#555" stroke-width="4"/>${sx > 0 ? linhas(60, -440, 680, 12, 70) : ''}</g>`; })() : '';
      const base = t < 1.0 ? jornal({ ks1: TODO1, escuro: 0 }) : jornal({ ks2: ksDe(t, ts), b2: .5 * pico(t, ts[7] + .2, .4) });
      return madeira + g(base + pagina, { x: lerp(960, 960 - 430 * 1.45, z), y: lerp(540, 540 + 210 * 1.45, z), s: lerp(.86, 1.45, z) }); })]; },
});

const TQ = { pos: [840, 874], s: 1.05 }, HQ = { pos: [1425, 983], s: .95 };
const manta = (x, y, w, cor = '#56688a') => `<path d="M${x - w / 2} ${y}q${w / 2} -40 ${w} 0l40 400h${-w - 80}z" fill="${cor}" ${S6}/><path d="M${x - w / 4} ${y + 10}q-10 120 -30 380M${x + w / 5} ${y}q20 140 10 390" stroke="#44567a" stroke-width="8" fill="none"/>`;
const NOITE4 = c => tinta('#0d1a3a', .38);
const luz = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="420" ry="520" fill="${AMAR}" opacity=".08"/>`;
const aviao = ({ tina, homem, cam = () => ({ z: 1, x: 960, y: 540 }), ui = () => '', extra = () => '', sem = false }) => {
  const T = tina && P(t => ({ ...TQ, ordem: SEM_PERNAS, ...tina(t) }), { pers: 'feminina', variante: TINA }), H = homem && figurante('jorge', t => ({ ...HQ, ordem: SEM_PERNAS, ...homem(t) }));
  return [raw('c4', t => DEFS + camera(cam(t), bg('C4') + (T ? luz(840, 560) + T.raw(t) + manta(840, 860, 360) : '') + (H ? '' : frente('C4')) + (H ? H.raw(t) + manta(1425, 940, 380, '#606a78') : '') + extra(t) + NOITE4()) + (LIMPO ? '' : ui(t)))]; };
const notebookTopo = (tela = '') => `<rect x="-300" y="-20" width="600" height="60" rx="14" fill="#b9bec5" ${S6}/><rect x="-270" y="-380" width="540" height="360" rx="18" fill="#3b3e44" ${S6}/><rect x="-246" y="-356" width="492" height="312" rx="6" fill="#f4f6f8"/>${tela}`;
const proposta = `<rect x="-150" y="-330" width="300" height="270" fill="${BRANCO}" stroke="#999" stroke-width="3"/>` + txt('PROPOSTA', 0, -282, { tam: 30, cor: '#7B4FB5' }) + linhas(-120, -240, 240, 6, 26).replace(/stroke-width="9"/g, 'stroke-width="7"');
const maoRoxa = (x, y, r) => g(`<rect x="-60" y="40" width="120" height="420" rx="50" fill="#7B4FB5" ${S6}/><path d="M-56 50q-10 -80 20 -110h80q30 30 20 110z" fill="#717171" ${S6}/><path d="M-50 -20l-30 -30" stroke="#717171" stroke-width="28" stroke-linecap="round"/>`, { x, y, r });
const bandeja = t => DEFS + camera({ z: 2.3, x: 405, y: 735 }, bg('C4')) + tinta('#0d1a3a', .38) + `<path d="M120 640h1680l80 440H40z" fill="#c9ccd1" ${S6}/>`;
const balaoFala = (s, x, y, t, t0, lado = 1) => pop(`<rect x="${-s.length * 14 - 40}" y="-55" width="${s.length * 28 + 80}" height="110" rx="40" fill="${BRANCO}" ${S6}/><path d="M${-30 * lado} 50l${-30 * lado} 50l${60 * lado} -50" fill="${BRANCO}" ${S6}/>` + txt(s, 0, 16, { tam: 44 }), t, t0, { x, y });
Object.assign(C, {
  M068: a => { const w = W(a), kb = w('podia', 1.2) - .9, est = t => io(clamp((t - kb) / .7)) * (1 - io(clamp((t - kb - 1.5) / .7)));
    return aviao({ tina: t => ({ br: { E: lp([19, -7, 0], [150, 20, 0], est(t)), D: lp([-18, 9, 0], [-150, -20, 0], est(t)) }, mao: { E: est(t) > .3 ? 'punho' : 'costas', D: est(t) > .3 ? 'punho' : 'costas' }, tronco: -2 * est(t),
      rosto: { pisca: est(t) > .2 ? 1 : .45, abre: .95 * est(t), sorriso: .1, sobr: 4 * est(t) } }),
      homem: t => ({ cab: 10, rosto: { pisca: 1, sorriso: 0, gy: 6 } }), cam: t => ({ z: 1.08 + .03 * t / 3.5, x: 1100, y: 600 }) }); },
  M069: a => { const w = W(a), ke = w('editor', 1), kp = w('puxou', 2.5), vira = t => io(clamp((t - kp + .5) / .5));
    const T = P(t => ({ ...TQ, ordem: SEM_PERNAS, cab: -6 * vira(t), rosto: { gx: 14 * vira(t), gy: 2, sorriso: .5, ...fala(t, [[kp, 3.6]]) } }), { pers: 'feminina', variante: TINA });
    const H = figurante('jorge', t => ({ ...HQ, ordem: SEM_PERNAS, rosto: { gx: -12 * ent(t, 3, .4), gy: 4, sorriso: .2, pisca: piscar(t, [1.6]) } }));
    return [raw('div', t => { const corpo = bg('C4') + luz(840, 560) + T.raw(t) + manta(840, 860, 360) + H.raw(t) + manta(1425, 940, 380, '#606a78') + NOITE4();
      return DEFS + `<clipPath id="ce"><rect x="0" y="0" width="956" height="1080"/></clipPath><clipPath id="cd"><rect x="964" y="0" width="956" height="1080"/></clipPath>` +
        `<defs><g id="corpo4">${corpo}</g></defs><g clip-path="url(#ce)"><g transform="translate(-480 0)">${camera({ z: 1.5, x: 840, y: 560, livre: 1 }, '<use href="#corpo4"/>')}</g></g>` +
        `<g clip-path="url(#cd)"><g transform="translate(480 0)">${camera({ z: 1.5, x: 1425, y: 640, livre: 1 }, '<use href="#corpo4"/>')}</g></g><rect x="955" y="0" width="10" height="1080" fill="${BRANCO}"/>` +
        pop(`<rect x="-200" y="-40" width="400" height="80" rx="40" fill="${AMAR}" ${S6}/>` + txt('editor de livros', 0, 14, { tam: 38 }), t, ke - .1, { x: 1440, y: 840 }) + balaoFala('oi! posso…', 560, 200, t, kp - .1, -1); })]; },
  M070: a => { const w = W(a), km = w('mostrar', .5), r = t => io(clamp((t - km) / 1.2));
    return [raw('m', t => { const k = r(t), x = 960 + 260 * k, y = 760, ro = -22 * k;
      return bandeja(t) + g(notebookTopo(proposta), { x, y, r: ro }) + maoRoxa(x - 330 + 30 * k, y + 120, 30) + maoRoxa(x + 300 - 40 * k, y + 140 + 20 * k, -40); })]; },
  M074: a => { const w = W(a), kp = w('proposta', 1.2), v = t => io(clamp((t - kp + .3) / 1.1));
    return [raw('m', t => { const k = v(t);
      return bandeja(t) + g(notebookTopo(k < .02 ? proposta : ''), { x: 1220, y: 760, r: -22 }) + (k > 0 ? g(proposta, { x: 1220 + 600 * k, y: 760 - 700 * k + 200 * Math.sin(Math.PI * k), r: -22 + 70 * k, s: 1 + .4 * k }) : '') + maoRoxa(920, 880, 30); })]; },
  M071: a => { const w = W(a), kg = w('gostou', .2), kn = w('disse', 1.1), j = t => io(clamp((t - kg) / .4)) * (1 - io(clamp((t - kn + .2) / .4))), n = t => io(clamp((t - kn) / .4));
    return aviao({ homem: t => ({ br: { E: lp([19, -7, 0], [22, 140, 0], j(t)), D: lp([-18, 9, 0], [-35, -95 + 14 * Math.sin(t * 14), 0], n(t)) }, mao: { E: j(t) > .3 ? 'joinha' : 'costas', D: n(t) > .3 ? 'aberta' : 'costas' },
      cab: 4 * Math.sin(t * 9) * n(t), rosto: { gx: -10, gy: 2, sorriso: .8 * j(t) + .1, sobrIn: .4 * n(t), ...fala(t, [[kn, 2.4]]) } }),
      cam: () => ({ z: 1.9, x: 1425, y: 640 }), ui: t => balaoFala('não é para nós', 700, 220, t, w('não', 1.6) - .1, 1) }); },
  M076: a => { const w = W(a), ks = w('sorte', .6);
    return [raw('c4', t => DEFS + camera({ z: 1.05 + .04 * t / 3.7, x: 960, y: 560 }, bg('C4')) + tinta('#0d1a3a', .3) +
      pop(`<circle r="${120 + 10 * Math.sin(t * 5)}" fill="${AMAR}" opacity=".35"/>` + g(I.trevo, { s: 1.1 }), t, ks - .15, { x: 1060, y: 560 }) + pop(txt('sorte?', 0, 0, { tam: 90, cor: BRANCO }), t, ks + .3, { x: 1060, y: 790 }))]; },
});

const H5 = no('C5', 330, 660);
const c5 = (Ls, { cam = () => ({ z: 1, x: 960, y: 540 }), manha = 0, sem = false, ui = () => '' } = {}) => [raw('c5', t => DEFS + camera(cam(t), bg('C5') + (manha ? tinta('#ffcf8a', .12) : '') + Ls.map(f => f(t)).join('') + (sem ? '' : frente('C5'))) + (LIMPO ? '' : ui(t)))];
const tela = (body, z = 2.2) => DEFS + camera({ z, x: 772 * K, y: 360 * K }, bg('C5')) + `<rect width="1920" height="1080" fill="#000" opacity=".25"/>` +
  `<rect x="260" y="80" width="1400" height="880" rx="30" fill="#2f3237" ${S6}/><rect x="300" y="120" width="1320" height="800" rx="10" fill="#f6f7f9"/>` + body;
const cursor = (x, y, s = 1.4) => g(I.cursor, { x, y, s });
const email = ({ para, assunto, corpo = '', anexo = true, botao = 0, ok = 0 }) => `<rect x="300" y="120" width="1320" height="80" fill="#e4e8ee"/>` + txt('Nova mensagem', 340, 175, { tam: 36, anc: 'start', cor: '#444' }) +
  txt('Para: ' + para, 340, 270, { tam: 40, anc: 'start', peso: 600 }) + `<path d="M330 300H1590" stroke="#ddd" stroke-width="3"/>` + txt('Assunto: ' + assunto, 340, 360, { tam: 40, anc: 'start', peso: 600 }) + `<path d="M330 390H1590" stroke="#ddd" stroke-width="3"/>` +
  (corpo ? txt(corpo, 340, 470, { tam: 46, anc: 'start', peso: 400 }) : '') +
  (anexo ? `<rect x="340" y="600" width="420" height="90" rx="14" fill="#fbe9e7" stroke="#d9654b" stroke-width="4"/>` + txt('currículo.pdf', 380, 660, { tam: 36, anc: 'start', cor: '#b3432c' }) : '') +
  g(`<rect x="-130" y="-46" width="260" height="92" rx="46" fill="${botao ? '#2f62a3' : AZUL}" ${S6}/>` + txt('Enviar', 0, 14, { tam: 42, cor: BRANCO }), { x: 1440, y: 830, s: 1 - .05 * botao }) +
  (ok > 0 ? g(`<rect x="-260" y="-50" width="520" height="100" rx="50" fill="${TURQ}" ${S6}/>` + txt('enviado', -30, 16, { tam: 46, cor: BRANCO }) + `<path d="M120 0l24 24l46 -50" fill="none" stroke="${BRANCO}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`, { x: 960, y: 520 + (1 - ok) * 30, op: ok }) : '');
const costasSentado = (t, k = 1) => g(`<path d="M-230 380V120q0 -110 110 -140h240q110 30 110 140v260z" fill="#55B793" ${S6}/><path d="M-120 -24q120 60 240 0q-20 60 -120 70q-100 -10 -120 -70z" fill="#419479" ${S6}/>` +
  `<rect x="-46" y="-130" width="92" height="130" rx="34" fill="#C3C2C2" ${S6}/><ellipse cx="-178" cy="-190" rx="28" ry="42" fill="#DAD9D9" ${S6}/><ellipse cx="178" cy="-190" rx="28" ry="42" fill="#DAD9D9" ${S6}/>` +
  `<path d="M0 -480q120 0 170 90q30 80 10 170q-30 70 -180 90q-150 -20 -180 -90q-20 -90 10 -170q50 -90 170 -90z" fill="#2D2D2D" ${S6}/><path d="M-80 -420l40 60M10 -440l20 70M90 -410l-10 60" stroke="#111" stroke-width="6" stroke-linecap="round"/>`, { s: k });
Object.assign(C, {
  M037: a => { const w = W(a), km = w('mandar', 1.9), kv = w('ou', 3.2), B = [1440, 830], R = [1000, 620];
    return [raw('tela', t => { const ida = io(clamp((t - km + .3) / .8)), volta = io(clamp((t - kv) / .6)), p = lp(lp(R, B, ida), R, volta);
      return tela(email({ para: 'vagas@empresa.com', assunto: 'Candidatura', botao: 0 })) + cursor(p[0] + 10, p[1] + 10); })]; },
  M085: a => { const w = W(a), kc = w('candidata', .1) + .15;
    return [raw('tela', t => { const p = lp([1200, 680], [1450, 840], io(clamp(t / .3)));
      return tela(email({ para: 'vagas@empresa.com', assunto: 'Candidatura', botao: pico(t, kc + .05, .12) > 0 ? 1 : 0, ok: ent(t, kc + .3, .4) })) + cursor(p[0], p[1]); })]; },
  M059: a => { const w = W(a), msg = 'Oi, Tina! Você teria 5 minutos?', kf = w('dela', 3.3), kc = w('cinco', 1.8);
    return [raw('tela', t => { const n = Math.round(msg.length * clamp((t - .2) / 2.4)), env = io(clamp((t - kf - .1) / .7)), p = lp([1100, 700], [1450, 840], io(clamp((t - 2.6) / .5)));
      return tela(email({ para: 'Tina Seelig', assunto: '5 minutos?', corpo: msg.slice(0, n) + (t < 2.7 && Math.floor(t * 3) % 2 ? '|' : ''), anexo: false, botao: pico(t, kf, .12) > 0 ? 1 : 0 })) +
        pop(I.relogio, t, kc - .1, { x: 1400, y: 560, s: .9 }) + (env > 0 && env < 1 ? g(I.envelope, { x: 1440 + 400 * env, y: 830 - 700 * env, s: 1.2, r: -20 * env }) : '') + (env > 0 ? '' : cursor(p[0], p[1])); })]; },
  M061: a => { const w = W(a), kl = w('lista', 1.6), its = [w('jeitos', 2.2), w('ajudar', 2.9), w('livro', 3.5)];
    const linhaB = [0, 1, 2].map(j => rab(470, 300 + j * 70, [330, 280, 200][j], j + 1));
    const itens = its.map((x, j) => [x, rab(1180, 420 + j * 140, 330, j + 7)]);
    return [raw('mesa', t => { let s = `<rect width="1920" height="1080" fill="#b08a62"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M0 ${80 + i * 120}Q960 ${50 + i * 120} 1920 ${90 + i * 120}" stroke="#9c774f" stroke-width="5" fill="none"/>`).join('');
      s += `<g transform="rotate(-4 640 500)"><rect x="400" y="200" width="520" height="560" rx="8" fill="#fffaf0" ${S6}/>` + txt('obrigado!', 470, 270, { tam: 46, anc: 'start', cor: '#2b4c8c' }) + linhaB.map((p, j) => traco(p, clamp((t - .1 - j * .3) / .3))).join('') + g(I.coracao, { x: 800, y: 640, s: .45, op: ent(t, 1.1, .3) }) + `</g>`;
      s += `<g transform="rotate(3 1360 560)"><rect x="1080" y="300" width="560" height="560" rx="8" fill="#fffaf0" ${S6}/>` + g(txt('lista', 0, 0, { tam: 46, anc: 'start', cor: '#2b4c8c' }), { x: 1140, y: 370, op: ent(t, kl - .1, .3) }) +
        itens.map(([x, p], j) => `<circle cx="1140" cy="${420 + j * 140}" r="12" fill="#2b4c8c" opacity="${ent(t, x - .2, .2)}"/>` + traco(p, clamp((t - x + .1) / .5))).join('') + `</g>`;
      const j = its.findIndex(x => t > x - .1 && t < x + .4), pt = j >= 0 ? rp(fim(itens[j][1], clamp((t - its[j] + .1) / .5)), 3, 1360, 560) : t < 1.1 ? rp(fim(linhaB[Math.min(2, Math.max(0, Math.floor((t - .1) / .3)))], clamp(((t - .1) % .3) / .3)), -4, 640, 500) : lp([900, 640], [1150, 400], io(clamp((t - 1.1) / (its[0] - 1.3))));
      return s + g(`<rect x="-12" y="-170" width="24" height="170" rx="8" fill="#2b4c8c" ${S6}/><path d="M-12 0L0 26L12 0z" fill="${TINTA}"/>` + `<path d="M-60 -150q-10 -60 40 -80l60 10q40 30 20 90z" fill="#6E6E6E" ${S6}/><rect x="-40" y="-260" width="140" height="500" rx="56" fill="#55B793" ${S6} transform="rotate(-30) translate(60 -380)"/>`, { x: pt[0] + 6, y: pt[1] - 26, r: 25 }); })]; },
});

const fim5 = H5.pos[1] + 494 * H5.s;
const passo = (t, t0, d = .7, dx = -260) => { const k = io(clamp((t - t0) / d)), f = clamp((t - t0) / d), sw2 = Math.sin(f * Math.PI * 2);
  return { dx: dx * k, dy: -10 * Math.abs(Math.sin(f * Math.PI * 2)), pe: { E: [10 * sw2, 0, 0], D: [-10 * sw2, 0, 0] }, br: { E: [19 - 8 * sw2, -7, 0], D: [-18 - 8 * sw2, 9, 0] } }; };
const corrente = (A, B, tensa) => { const n = 18, pts = []; for (let i = 0; i <= n; i++) { const u = i / n; pts.push([lerp(A[0], B[0], u), lerp(A[1], B[1], u) + (1 - tensa) * 60 * Math.sin(Math.PI * u)]); }
  return pts.map((p, i) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="11" ry="7" fill="none" stroke="#5b5f66" stroke-width="5" transform="rotate(${i % 2 ? 90 : 0} ${p[0]} ${p[1]})"/>`).join(''); };
const cracha = k => g(`<path d="M-40 -150l40 70l40 -70" fill="none" stroke="${AZUL}" stroke-width="10"/><rect x="-90" y="-80" width="180" height="190" rx="14" fill="${BRANCO}" ${S6}/><circle cy="-30" r="26" fill="${CINZA}" ${S6}/>` + txt('assistente', 0, 34, { tam: 26 }) + txt('de pesquisa', 0, 66, { tam: 26 }), { s: .9 + .1 * k, op: k });
const encosto = [[818, 392], [842, 350], [960, 352], [958, 398], [932, 522], [914, 524], [918, 448], [850, 448], [836, 522], [820, 522]];
const laptopAberto = k => `<path d="M-100 0h200l14 12h-228z" fill="#9aa0a8" ${S6}/>` + (k > .03 ? `<g transform="scale(1 ${k})"><rect x="-92" y="-120" width="184" height="120" rx="8" fill="#5c6168" ${S6}/><rect x="-82" y="-110" width="164" height="100" rx="3" fill="#cfe0ec"/></g>` : '');
Object.assign(C, {
  M046: a => { const w = W(a), ke = w('experimentos', 2.3), kd = w('dia', 3.4), ks = w('sair', 4.4), kz = w('zona', 5.4), kc = w('conforto', 5.8);
    const H = P(t => { const p = passo(t, kc - .25); return { ...H5, pos: [H5.pos[0] + p.dx, H5.pos[1] + p.dy], pe: p.pe, br: t > kc - .25 ? p.br : { E: [19, -7, 0], D: [-18, 9, 0] }, rosto: { gx: t < ks ? 12 : -6, gy: t < ks ? -4 : 12, sorriso: .3 + .5 * ent(t, kd) } }; });
    return c5([t => { const k = ent(t, ks - .2, .6);
      return (k > 0 ? `<ellipse cx="${H5.pos[0]}" cy="${fim5}" rx="${240 * k}" ry="${56 * k}" fill="${TURQ}" fill-opacity=".18" stroke="${TURQ}" stroke-width="8" stroke-dasharray="22 14"/>` : '') +
        sombra(H5.pos[0] + passo(t, kc - .25).dx, fim5, 120) + H.raw(t); }], { ui: t => pop(`<path d="M-150 -130h300v220l-40 40h-260z" fill="${AMAR}" ${S6}/>` + txt('experimento', 0, -50, { tam: 40 }) + txt('de hoje', 0, 0, { tam: 40 }) + `<rect x="-30" y="34" width="60" height="60" rx="8" fill="${BRANCO}" ${S6}/>` +
        (t > kd ? `<path d="M-18 62l14 16l30 -34" fill="none" stroke="${TURQ}" stroke-width="10" stroke-linecap="round"/>` : ''), t, ke - .15, { x: 900, y: 330, r: 3 }) + pop(`<rect x="-200" y="-40" width="400" height="80" rx="40" fill="${BRANCO}" ${S6}/>` + txt('zona de conforto', 0, 14, { tam: 38, cor: '#2f7a5f' }), t, kz - .15, { x: 560, y: 880 }) }); },
  M051: a => { const w = W(a), ke = w('evita', .9), kp = w('prende', 3.5), Q = no('C5', 560, 665);
    const tenta = t => io(clamp((t - ke) / .6)) * (1 - io(clamp((t - kp + .2) / .5)));
    const qq = t => { const tn = tenta(t); return { ...Q, pos: [Q.pos[0] - 70 * tn, Q.pos[1]], tronco: -6 * tn, pe: { E: [10 * tn, 0, 0], D: [-14 * tn, 0, 0] } }; };
    const H = P(t => ({ ...qq(t), br: { E: [30 * tenta(t) + 19, -7, 0], D: [-18, 9, 0] }, rosto: { gx: -10 * tenta(t) + 8 * (1 - tenta(t)), gy: 10, sobrIn: .7, sorriso: -.3 } }));
    return c5([t => { const q = qq(t), J = pose(q).J.tenisD, A = [q.pos[0] + J[0] * q.s, q.pos[1] + J[1] * q.s + 20];
      return sombra(q.pos[0], 665 * K, 110) + H.raw(t) + (t > .2 ? g(corrente(A, [748 * K, 650 * K], .3 + .7 * tenta(t)), { op: ent(t, .2, .4) }) : '') + `<ellipse cx="${A[0]}" cy="${A[1]}" rx="22" ry="14" fill="none" stroke="#5b5f66" stroke-width="8"/>`; }], { sem: true, cam: () => ({ z: 1.15, x: 980, y: 640 }) }); },
  M063: a => { const w = W(a), kc = w('contratou', .2), k5 = w('cinco', 3.8);
    const H = P(t => ({ ...H5, rosto: { gx: -6, gy: 2 + 8 * ent(t, kc + .2), sorriso: .4 + .5 * ent(t, kc + .3), sobr: 2 } }));
    const pc = [H5.pos[0] + 10 * H5.s, H5.pos[1] - 175 * H5.s];
    return c5([t => sombra(H5.pos[0], fim5, 120) + H.raw(t) + g(cracha(ent(t, kc, .5)), { x: pc[0], y: pc[1] + (1 - ent(t, kc, .5)) * 30, s: H5.s * .72 })], { cam: t => ({ z: 1.6 + .04 * t / 5.7, x: H5.pos[0] + 120, y: H5.pos[1] - 260 * H5.s }),
      ui: t => { const k = io(clamp((t - k5 - .1) / .8)); return pop(I.relogio + txt('5 min', 0, 130, { tam: 40 }), t, k5 - .15, { x: 1500, y: 260, s: 1.2 }) +
        (k > 0 ? `<path d="M1380 340Q1150 330 ${lerp(1380, 1040, k)} ${lerp(340, 560, k)}" fill="none" stroke="${AMBAR}" stroke-width="12" stroke-dasharray="26 18" stroke-linecap="round"/>` : ''); } }); },
  M039: a => { const s = altura('C5', 690) * K / 1150, cx = 850 * K, quad = 500 * K, kb = s * 322 / 460;
    const T = P(t => ({ pos: [0, 57 * s], s, ordem: SEM_PERNAS, rosto: { gx: 4, gy: 4, sorriso: .1, pisca: .3 } })), L = P(t => ({ pos: [0, 690 * K - quad - 494 * s], s, ordem: ['pernaE', 'pernaD', 'virilha', 'tenisE', 'tenisD'] }));
    return [raw('c5', t => { const th = Math.PI * 2 * 2.5 * io(clamp(t / 3.4)), c = Math.cos(th), sx = Math.max(.06, Math.abs(c)), frenteV = c >= 0;
      const pessoa = `<g transform="translate(${cx} ${quad}) scale(${sx} 1)">${frenteV ? L.raw(t) + T.raw(t) : g(costasSentado(t, 1), { s: kb, y: -380 * kb + 20 })}</g>`;
      const giro = th > .2 && th < Math.PI * 4.6 ? [0, 1, 2].map(j => `<path d="M${cx - 220} ${quad - 120 + j * 90}q220 -60 440 0" fill="none" stroke="${BRANCO}" stroke-width="10" stroke-linecap="round" opacity="${.5 * Math.abs(Math.sin(th))}"/>`).join('') : '';
      return DEFS + camera({ z: 1.12, x: 1150, y: 640 }, bg('C5') + sombra(cx, 690 * K, 140) + pessoa + (frenteV ? '' : recorte(`${CN}/C5.png`, encosto, 'enc')) + giro); })]; },
  M094: a => { const Q = no('C5', 450, 670), kf = .35, km = 1.3, ka = 1.8;
    const fecha = t => io(clamp((t - kf - .3) / .5)), braco = t => io(clamp((t - kf + .1) / .4)) * (1 - io(clamp((t - kf - .9) / .4)));
    const anda = t => io(clamp((t - ka) / 1.7)), q = t => { const k = anda(t), f = clamp((t - ka) / 1.7), s = Q.s * (1 + .9 * k);
      return { pos: [Q.pos[0] - 120 * k, Q.pos[1] + 260 * k - 12 * Math.abs(Math.sin(f * Math.PI * 4)) * (k > 0 && k < 1 ? 1 : 0)], s, pe: { E: [7 * Math.sin(f * Math.PI * 4), 0, 0], D: [-7 * Math.sin(f * Math.PI * 4), 0, 0] } }; };
    const H = P(t => ({ ...q(t), br: { E: [19, -7, 0], D: lp([-18, 9, 0], [-72, -14 + 20 * fecha(t), 0], braco(t)) }, mao: { D: braco(t) > .3 ? 'aberta' : 'costas' }, rosto: { gx: braco(t) > .3 ? 14 : 0, gy: 6, sorriso: .7, pisca: piscar(t, [1.5]) } }));
    return [raw('c5', t => { const Qt = q(t), mk = ent(t, km, .4);
      const mochila = mk > 0 ? g(`<path d="M-95 -250q-10 120 20 230" fill="none" stroke="#3b3f46" stroke-width="30" stroke-linecap="round"/><path d="M95 -250q10 120 -20 230" fill="none" stroke="#3b3f46" stroke-width="30" stroke-linecap="round"/>`, { x: Qt.pos[0], y: Qt.pos[1], s: Qt.s, op: mk }) : '';
      return DEFS + camera({ z: 1, x: 960, y: 540 }, bg('C5') + tinta('#ffcf8a', .12) + g(laptopAberto(1 - fecha(t)), { x: 772 * K, y: 372 * K, s: K * .62 }) + sombra(Qt.pos[0], Qt.pos[1] + 494 * Qt.s, 130 * Qt.s / Q.s) + (mk > 0 ? g(`<rect x="-170" y="-280" width="340" height="300" rx="60" fill="#4a515c" ${S6}/>`, { x: Qt.pos[0], y: Qt.pos[1], s: Qt.s, op: mk }) : '') + H.raw(t) + mochila); })]; },
});

const I1 = `${CN}/I1.png`, I4 = `${CN}/I4.png`;
const vento = (t, op = .7, n = 7, y0 = 120, y1 = 900) => Array.from({ length: n }, (_, j) => { const u = ((t * .35 + j * .37) % 1), x = -400 + 2700 * u, y = y0 + (y1 - y0) * ((j * .61) % 1);
  return `<path d="M${x} ${y}q120 -40 240 0t240 0" fill="none" stroke="${BRANCO}" stroke-width="9" stroke-linecap="round" opacity="${op * Math.sin(Math.PI * u)}"/>`; }).join('');
const BANCO = `${V}/../../videos/001_como_fazer_amigos_quando_ninguem_tem_tempo/04_clipes_flow/cenas_numeradas`;
const QD = {};
const quadros = (n, ini, dur) => { const d = `${os.tmpdir().replace(/\\/g, '/')}/m007_banco${n}_${ini}`;
  if (!fs.existsSync(`${d}/ok`)) { fs.mkdirSync(d, { recursive: true }); const f = fs.readdirSync(BANCO).find(x => x.startsWith(`Cena ${n} -`));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(ini), '-t', String(dur + .2), '-i', `${BANCO}/${f}`, '-vf', 'fps=24,scale=1920:1080', '-q:v', '3', `${d}/q_%04d.jpg`]); fs.writeFileSync(`${d}/ok`, ''); }
  return t => { const k = Math.min(Math.floor(t * 24) + 1, fs.readdirSync(d).length - 1), f = `${d}/q_${String(k).padStart(4, '0')}.jpg`;
    QD[f] ??= `data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}`; return `<image href="${QD[f]}" x="0" y="0" width="1920" height="1080"/>`; }; };
const PASTEUR = (() => { const d = `${V}/midia/fontes`; const f = fs.existsSync(d) && fs.readdirSync(d).find(x => /pasteur|^I3/i.test(x) && /\.(png|jpe?g)$/i.test(x)); return f && `${d}/${f}`; })();
const retrato = () => { if (PASTEUR) { const b = fs.readFileSync(PASTEUR), jpg = /jpe?g$/i.test(PASTEUR); return `<image href="data:image/${jpg ? 'jpeg' : 'png'};base64,${b.toString('base64')}" x="-330" y="-420" width="660" height="840" preserveAspectRatio="xMidYMid slice"/>`; }
  return `<rect x="-330" y="-420" width="660" height="840" fill="#d9d4ca"/><circle cy="-110" r="130" fill="#b9b3a7"/><path d="M-260 420q0 -300 260 -300q260 0 260 300z" fill="#b9b3a7"/>` + txt('retrato de Pasteur', 0, 360, { tam: 32, cor: '#8a847a' }); };
const quadro = t => `<rect x="-380" y="-470" width="760" height="940" fill="#8a6a3c" ${S6}/><rect x="-350" y="-440" width="700" height="880" fill="#c9a45c"/><g>${retrato()}</g><rect x="-330" y="-420" width="660" height="840" fill="none" stroke="#5c4524" stroke-width="8"/>`;
const pasteur = (kz, kf, ks, t) => `<rect width="1920" height="1080" fill="#2e2a26"/>` + g(quadro(t), { x: 640, y: 540, s: 1 + .05 * kz }) +
  pop(`<rect x="-380" y="-110" width="760" height="220" rx="20" fill="${BRANCO}" ${S6}/>` + txt('“o acaso favorece', 0, -18, { tam: 58 }) + txt('a mente preparada”', 0, 62, { tam: 58, cor: TURQ }), t, kf, { x: 1400, y: 540 }) + selo('Louis Pasteur · Lille, 1854', t, ks);
const navio = { x0: 1005, y0: 415, x1: 1150, y1: 562 };
const moveNavio = (dx, dy = 0) => { const { x0, y0, x1, y1 } = navio, w = x1 - x0;
  return `<g transform="translate(${-140 * K} 0)">${recorte(I1, [[1145, y0], [1280, y0], [1280, y1], [1145, y1]], 'mar')}</g><g transform="translate(${dx * K} ${dy * K})">${recorte(I1, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 'nav')}</g>`; };
const bandeiraFim = (x, y, k) => g(`<path d="M0 60V-70" stroke="${TINTA}" stroke-width="8"/><path d="M0 -70l70 22l-70 22z" fill="${VERM}" ${S6}/>`, { x, y, s: .9, op: k });
const rota = (A, B, k) => k <= 0 ? '' : `<path d="M${A[0]} ${A[1]}Q${(A[0] + B[0]) / 2} ${Math.min(A[1], B[1]) - 120} ${lerp(A[0], B[0], k)} ${lerp(A[1], B[1], k) - 120 * Math.sin(Math.PI * k) * 0}" fill="none" stroke="${BRANCO}" stroke-width="10" stroke-dasharray="4 22" stroke-linecap="round"/>`;
const pas = (t, a) => `<clipPath id="pas"><circle cx="${782 * K}" cy="${338 * K}" r="${165 * K}"/></clipPath><g clip-path="url(#pas)"><g transform="rotate(${a} ${782 * K} ${338 * K})">${img(I1)}</g></g>` + recorte(I1, [[690, 345], [835, 345], [840, 555], [685, 555]], 'torre') + recorte(I1, [[730, 330], [835, 330], [835, 360], [730, 360]], 'teto');
const vane = (a, k) => g(`<path d="M0 0V110" stroke="#3a3a3a" stroke-width="8"/><g transform="rotate(${a})"><path d="M-70 -6h110l14 6l-14 6h-110z" fill="#3a3a3a"/><path d="M-70 -6l-24 -18v42l24 -18" fill="#3a3a3a"/></g><circle r="9" fill="#3a3a3a"/>`, { x: 172 * K, y: 255 * K, s: .5, op: k });
const sala = (c, extra = '') => DEFS + camera(c, img(I4) + extra);
const fig4 = figurante('jorge', t => ({ pos: [0, 0], s: .34, ordem: SEM_PERNAS, rosto: { gx: -8, gy: -4, sorriso: .3, pisca: piscar(t, [1.3, 4]) } }));
const sombraTina = P(t => ({ ...{ pos: [665 * K, 545 * K - 472 * .5], s: .5 }, br: { D: [-30 - 12 * Math.sin(t * 2.4), -70, 0] }, mao: { D: 'aberta' }, cab: 3 * Math.sin(t * 1.3), rosto: { ...fala(t, [[.2, 4.3]]) } }), { pers: 'feminina', variante: { cabelo: '#2b2b30', roupa: '#33363d', pele: '#3a3d44', mao: '#33363d', calca: '#2b2b30', tenis: '#2b2b30', detalhe: '#33363d' } });
Object.assign(C, {
  M004: a => { const w = W(a); return [raw('p', t => pasteur(t / 5.2, w('acaso', 2.4) - .15, w('Louis', .6) - .2, t))]; },
  M092: a => { const w = W(a); return [raw('p', t => pasteur(t / 3.8, w('acaso', 1.2) - .15, w('Pasteur', .1), t))]; },
  M034: a => { const w = W(a), kv = w('vela', 6.9);
    return [raw('i1', t => { const u = io(clamp(t / 8.1)), c = { z: 1.5, x: lerp(640, 1280, u), y: 560 }, k = ent(t, kv - .3, .5);
      return DEFS + camera(c, img(I1) + (k > 0 ? `<ellipse cx="${1100 * K}" cy="${480 * K}" rx="${70 * k + 10 * Math.sin(t * 6)}" ry="${50 * k}" fill="${BRANCO}" opacity="${.35 * k}"/>` + [0, 1, 2].map(j => `<path d="M${(990 - 40 * j) * K} ${(450 + 25 * j) * K}q30 -20 60 0" fill="none" stroke="${BRANCO}" stroke-width="5" opacity="${k}"/>`).join('') : '')) + vento(t, .75); })]; },
  M035: a => { const w = W(a), kj = w('janela', 1.7);
    return [raw('i1', t => DEFS + camera({ z: 2.5 + .1 * t / 4.7, x: 300 * K, y: 420 * K }, img(I1) + [[110, 460], [316, 456], [411, 456]].map(([x, y]) => `<rect x="${(x - 22) * K}" y="${(y - 32) * K}" width="${44 * K}" height="${64 * K}" fill="none" stroke="${AMBAR}" stroke-width="5" opacity="${pico(t, kj + .3, .6)}"/>`).join('')) +
      vento(t * 1.4, .8, 6, 200, 760)) ]; },
  M036: a => { const w = W(a), kn = w('nota', 2.4), kg = w('gira', 4.8);
    return [raw('i1', t => { const ang = t < kn ? 10 * Math.sin(t * 2) : t < kg ? [0, 120, -90, 200][Math.min(3, Math.floor((t - kn) / .6))] : 200 + 400 * (t - kg);
      const dir = Math.floor((t - kn) / .6), gust = t > kn && t < kg ? [0, 120, -90, 200].map((d, j) => j === dir ? `<path d="M${960 - 500 * Math.cos(d * Math.PI / 180)} ${540 - 300 * Math.sin(d * Math.PI / 180)}L${960 - 150 * Math.cos(d * Math.PI / 180)} ${540 - 90 * Math.sin(d * Math.PI / 180)}" stroke="${BRANCO}" stroke-width="14" stroke-linecap="round" opacity=".8"/>` : '').join('') : '';
      const rastro = t > kg ? `<circle cx="960" cy="540" r="280" fill="none" stroke="${AMBAR}" stroke-width="12" stroke-dasharray="40 26" transform="rotate(${t * 200} 960 540)" opacity="${ent(t, kg)}"/>` : '';
      return DEFS + camera({ z: 3, x: 320, y: 360 }, img(I1) + `<g transform="translate(0 ${42 * K})">${recorte(I1, [[135, 196], [205, 196], [205, 226], [135, 226]], 'ceu1')}</g>` + vane(ang, 1)) + `<g transform="translate(-186 66)">${gust + rastro}</g>`; })]; },
  M040: a => { const w = W(a), km = w('moinho', 3.1), ka = w('aproveita', 3.9);
    return [raw('i1', t => { const u = io(clamp((t - km + .6) / 1)), c = { z: 2, x: lerp(545 * K + 60 * t, 782 * K, u), y: lerp(180 * K, 380 * K, u) };
      const balao = recorte(I1, [[495, 75], [595, 75], [595, 220], [495, 220]], 'bal');
      return DEFS + camera(c, img(I1) + `<g transform="translate(${110 * K} 0)">${recorte(I1, [[385, 75], [485, 75], [485, 220], [385, 220]], 'ceu2')}</g>` + `<g transform="translate(${30 * t} ${-6 * t})">${balao}</g>` + (t > ka - .3 ? [0, 1].map(j => `<path d="M${782 * K + 260 * Math.cos(t * 3 + j * Math.PI)} ${338 * K + 260 * Math.sin(t * 3 + j * Math.PI)}A260 260 0 0 1 ${782 * K + 260 * Math.cos(t * 3 + j * Math.PI + 1.2)} ${338 * K + 260 * Math.sin(t * 3 + j * Math.PI + 1.2)}" fill="none" stroke="${BRANCO}" stroke-width="12" stroke-linecap="round" opacity="${ent(t, ka - .3)}"/>`).join('') : '')) + vento(t, .6, 5); })]; },
  M043: a => { const w = W(a), kv = w('veleiro', .3), kd = w('destino', 2.7), kc = w('você', 5);
    return [raw('i1', t => { const c = { z: 2.1, x: 1075 * K, y: 470 * K }, A = [1075 * K, 520 * K], B = [1240 * K, 455 * K];
      return DEFS + camera(c, img(I1) + `<ellipse cx="${1080 * K}" cy="${478 * K}" rx="${60 * K}" ry="${40 * K}" fill="${BRANCO}" opacity="${.3 * pico(t, kv + .4, .6)}"/>` + rota(A, B, io(clamp((t - kd + .1) / 1))) + bandeiraFim(B[0], B[1] - 50, ent(t, kd + .8))) + vento(t, .6, 5) +
        pop(`<rect x="-110" y="-46" width="220" height="92" rx="46" fill="${AMAR}" ${S6}/>` + txt('você', 0, 16, { tam: 46 }) + `<path d="M0 46v70" stroke="${TINTA}" stroke-width="8"/><path d="M-16 100l16 24l16 -24" fill="none" stroke="${TINTA}" stroke-width="8"/>`, t, kc - .15, { x: 960, y: 260 }); })]; },
  M093: a => { const w = W(a), kv = w('veleiro', 1.3), km = w('mente', 3.2);
    return [raw('i1', t => { const u = io(clamp((t - kv + .3) / 3)), c = { z: 2.2, x: 1100 * K + 80 * u, y: 470 * K };
      return DEFS + camera(c, img(I1) + moveNavio(70 * u, -12 * u) + bandeiraFim(1245 * K, 400 * K, 1) + rota([(1080 + 70 * u) * K, 520 * K], [1245 * K, 455 * K], 1 - u * .6)) + vento(t, .5, 5) +
        pop(`<rect x="-230" y="-44" width="460" height="88" rx="16" fill="${BRANCO}" ${S6}/>` + txt('mente preparada', 0, 16, { tam: 46, cor: TURQ }), t, km - .15, { x: 960 + 150 * u, y: 870 }); })]; },
  M088: a => { const w = W(a);
    return [raw('porta', t => { const ab = io(clamp((t - .2) / .7)), x = io(clamp((t - 1.1) / .8));
      const corredor = `<rect width="1920" height="1080" fill="${QUENTE}"/><path d="M0 820L700 560H1220L1920 820z" fill="#d9c3a3"/>` + portas([1, 1, 1, 1, ab]);
      return `<g transform="translate(960 540) scale(${1 + 1.4 * x}) translate(${-lerp(960, 1310, x)} ${-lerp(540, 600, x)})">${corredor}</g>` +
        (x > 0 ? `<g opacity="${x}">${DEFS + camera({ z: 1.5 + .1 * x, x: 1280, y: 600 }, img(I1) + moveNavio(50 * clamp((t - 1.5) / 2)))}</g>` : ''); })]; },
  M048: a => { const w = W(a), kf = w('ferramenta', 3);
    return [raw('i4', t => sala({ z: 1.05 + .06 * t / 6.3, x: 960, y: 520 }) + pop(cartao(330, 140) + `<circle cx="-120" cy="0" r="34" fill="${AMBAR}" ${S6}/>` + txt('1', -120, 16, { tam: 44, cor: BRANCO }) + txt('construir', 40, -8, { tam: 34 }) + txt('o veleiro', 40, 34, { tam: 34, cor: TURQ }), t, .1, { x: 1680, y: 860 - 40 }) + selo(SEELIG, t, kf - .2))]; },
  M058: a => { const w = W(a), ks = w('sorte', 3.4);
    return [raw('i4', t => sala({ z: 1.35, x: 665 * K, y: 300 * K }, sombra(665 * K, 545 * K, 120) + sombraTina.raw(t) + recorte(I4, [[522, 348], [800, 348], [800, 560], [522, 560]], 'pul') +
      g(`<circle r="${110 + 8 * Math.sin(t * 4)}" fill="${AMAR}" opacity=".25"/>` + I.trevo, { x: 520 * K, y: 190 * K, s: ent(t, ks - .2, .5), op: ent(t, ks - .2, .5) })) + selo(SEELIG, t, w('Seelig', 2.5) - .2))]; },
  M072: a => { const w = W(a), kc = w('contato', .5), ke = w('editor', 2.2), ka = w('aula', 3), kst = w('Stanford', 4.7);
    return [raw('i4', t => { const env = clamp((t - kc) / 1.6), ex = 360 + 400 * Math.abs(Math.sin(env * Math.PI * 1.5));
      return sala({ z: 1.05, x: 960, y: 560 }, g(fig4.raw(t), { x: 1010 * K, y: 470 * K }) + recorte(I4, [[790, 432], [1240, 432], [1280, 720], [780, 720]], 'mes')) +
        `<rect x="0" y="0" width="1920" height="360" fill="${BRANCO}" opacity=".88"/>` + g(linha({ prog: lerp(.25, .7, ent(t, ka - .3, .8)), on: [1, ent(t, kc - .2), ent(t, ka - .2), 0], y: 240 }), { s: .9, x: 96, y: -20 }) +
        (env > 0 && env < 1 ? g(I.envelope, { x: ex * .9 + 96, y: 70, s: .5 }) : '') + pop(`<rect x="-100" y="-36" width="200" height="72" rx="36" fill="${AMAR}" ${S6}/>` + txt('editor', 0, 14, { tam: 38 }), t, ke - .1, { x: 1010 * K * 1.05 - 48, y: 470 }); })]; },
  M042: a => { const w = W(a), q = quadros('08', 2, 2.5), kp = w('prédio', 1.3);
    return [raw('b', t => q(t) + selo(SEELIG, t, .1) + pop(`<rect x="-150" y="-200" width="300" height="400" fill="#c9c2b6" ${S6}/>` + [0, 1, 2, 3].flatMap(r => [0, 1, 2].map(c => `<rect x="${-110 + c * 80}" y="${-170 + r * 90}" width="60" height="60" fill="${ent(t, kp - .2 + (r * 3 + c) * .04, .2) > .5 ? AMAR : '#6e6a62'}" ${S6}/>`)).join(''), t, kp - .5, { x: 1660, y: 520, s: .9 }))]; },
  M081: a => { const w = W(a), q = quadros('20', 1, 4), ke = w('estreitando', 1);
    return [raw('b', t => DEFS + q(t) + tunel(.85 * io(clamp((t - ke) / 1.2))))]; },
  M084: a => { const w = W(a), q = quadros('19', 1, 5.4), km = w('mexe', 1.2), kn = w('nova', 3.8);
    return [raw('b', t => { const u = clamp((t - kn + .2) / .7);
      return q(t) + pop(cartao(520, 200) + txt('“mexe a sopa”', 0, 10, { tam: 60 }) + trad(150, 70), t, km - .1, { x: 420, y: 160 }) +
        (u > 0 && u < 1 ? g(I.estrela, { x: 1240, y: lerp(-80, 230, u * u), s: .6, r: 200 * u }) : '') + (u >= 1 ? `<circle cx="1240" cy="230" r="${60 + 80 * clamp(t - kn - .5)}" fill="none" stroke="${AMAR}" stroke-width="10" opacity="${1 - clamp(t - kn - .5)}"/>` : ''); })]; },
});
const linhaFila = (x, y, pers = 'vetor') => no('C3', x, y, pers);
const c3 = (Ls, { cam = () => ({ z: 1, x: 960, y: 540 }), ui = () => '' } = {}) => [raw('c3', t => DEFS + camera(cam(t), bg('C3') + frente('C3') + Ls.map(f => f(t)).join('')) + (LIMPO ? '' : ui(t)))];
const figura = (nome, x, y, f) => { const q = linhaFila(x, y, FIGS_F.has(nome) ? 'feminina' : 'vetor'); return { q, L: figurante(nome, t => ({ ...q, ...f(t) })) }; };
const FIGS_F = new Set(['dani', 'bia']);
const aperto = (A, B, k) => k <= 0 ? '' : g(I.coracao, { x: (A + B) / 2, y: 0, s: .5 * k, op: k });
Object.assign(C, {
  M002: a => { const w = W(a), kv = w('vaga', .1), kc = w('céu', 1.1), ka = w('amigo', 2.2), kf = w('fila', 3.6);
    const F1 = figura('leo', 330, 615, t => ({ br: { D: lp([-18, 9, 0], [-150, -10, 0], ent(t, kv, .5)) }, mao: { D: 'aberta' }, rosto: { gy: -12, gx: 6, sorriso: .3 + .6 * ent(t, kc) } }));
    const F2 = figura('dani', 700, 612, t => ({ br: { D: lp([-18, 9, 0], [-70, -12, 0], ent(t, ka - .5, .5)) }, mao: { D: 'aberta' }, rosto: { gx: 12, sorriso: .8 } }));
    const F3 = figura('jorge', 860, 612, t => ({ br: { E: lp([19, -7, 0], [70, 12, 0], ent(t, ka - .5, .5)) }, mao: { E: 'aberta' }, rosto: { gx: -12, sorriso: .8 } }));
    const H = linhaFila(1080, 620), HL = P(t => ({ ...H, ...cel, rosto: { gx: 8, gy: 16, sorriso: -.1 } }));
    const m1 = mao({ ...F1.q, br: { D: [-150, -10, 0] } }, 'D');
    return c3([t => [F1, F2, F3].map(f => sombra(f.q.pos[0], f.q.pos[1] + 494 * f.q.s, 90) + f.L.raw(t)).join('') + sombra(H.pos[0], 620 * K, 90) + HL.raw(t),
      t => { const u = clamp((t - kv) / (kc - kv + .2)); return u > 0 ? g(I.envelope, { x: m1[0] + 30 * Math.sin(u * 8) * (1 - u), y: lerp(-100, m1[1] - 40, io(u)), s: .6, r: 15 * Math.sin(u * 6) * (1 - u) }) : ''; },
      t => g(I.coracao, { x: (F2.q.pos[0] + F3.q.pos[0]) / 2, y: F2.q.pos[1] - 330 * F2.q.s - 30 * ent(t, ka), s: .6 * ent(t, ka, .4), op: ent(t, ka, .4) })], { cam: () => ({ z: 1.05, x: 980, y: 560 }) }); },
  M028: a => { const w = W(a), km = w('moedas', 4.8);
    const q = t => { const u = clamp(t / 6.4), x = lerp(250, 1150, u), f = t * 1.7; return { ...linhaFila(x, 625), pos: [x * K, linhaFila(x, 625).pos[1] - 8 * Math.abs(Math.sin(f * Math.PI))], pe: { E: [9 * Math.sin(f * Math.PI), 0, 0], D: [-9 * Math.sin(f * Math.PI), 0, 0] } }; };
    const H = P(t => ({ ...q(t), ...cel, rosto: { gx: 8, gy: 16, sorriso: .1 } }));
    const moeda = (x, k) => g(`<ellipse rx="22" ry="9" fill="${AMAR}" stroke="#a87a1c" stroke-width="4"/>` + `<path d="M-6 -24l6 -14l6 14" stroke="${AMAR}" stroke-width="4" opacity="${k}"/>`, { x: x * K, y: 628 * K });
    return c3([t => [760, 830, 905].map((x, j) => moeda(x, pico(t, km + j * .15, .4))).join('') + sombra(q(t).pos[0], 625 * K, 90) + H.raw(t)], { ui: t => selo(SEELIG, t, .2), cam: t => ({ z: 1.15, x: lerp(500, 1500, clamp(t / 6.6)), y: 640 }) }); },
  M053: a => { const w = W(a), kp = w('puxa', 1.2), kd = w('e', 1.8), kpr = w('professor', 2.3), kes = w('escreve', 4.1);
    const tenta = t => io(clamp((t - kp + .3) / .4)) * (1 - io(clamp((t - kd) / .5)));
    const F = figura('dani', 840, 615, t => ({ rosto: { gx: -4, sorriso: .2, pisca: piscar(t, [2.1]) } }));
    const H = linhaFila(660, 620), HL = P(t => ({ ...H, br: { D: lp([-18, 9, 0], [-40, -60, 0], tenta(t)) }, mao: { D: 'aberta' }, rosto: { gx: 10, gy: 2, abre: .6 * tenta(t), sorriso: lerp(.1, -.35, ent(t, kd)), sobrIn: .5 * ent(t, kd) } }));
    return c3([t => sombra(F.q.pos[0], 615 * K, 90) + F.L.raw(t) + sombra(H.pos[0], 620 * K, 90) + HL.raw(t)], { cam: () => ({ z: 1.5, x: 1000, y: 600 }),
      ui: t => { const k = ent(t, kpr - .15, .4), d = io(clamp((t - kes) / .8));
        return k > 0 ? g(`<rect x="-260" y="-150" width="520" height="300" rx="20" fill="${BRANCO}" ${S6}/>` + txt('Para: professor', -220, -80, { tam: 38, anc: 'start' }) + `<path d="M-220 -40h440" stroke="#ddd" stroke-width="3"/>` + `<rect x="-220" y="0" width="440" height="110" fill="#f4f4f4"/>`, { x: 1640, y: 230 - 60 * d, op: k * (1 - d), s: .8 - .3 * d }) : ''; } }); },
  M086: a => { const w = W(a), ka = w('apresenta', 0), kf = w('fila', 1.5);
    const ap = t => io(clamp((t - ka) / .5)), sh = t => 6 * Math.sin(t * 16) * clamp((t - ka - .5) / .2) * (1 - clamp((t - kf) / .3));
    const F = figura('dani', 820, 615, t => ({ br: { E: lp([19, -7, 0], [64, 8 + sh(t), 0], ap(t)) }, mao: { E: 'aberta' }, rosto: { gx: -10, sorriso: .7 } }));
    const H = linhaFila(660, 620), HL = P(t => ({ ...H, br: { D: lp([-18, 9, 0], [-64, -8 - sh(t), 0], ap(t)) }, mao: { D: 'aberta' }, rosto: { gx: 10, sorriso: .9, ...fala(t, [[ka, .9]]) } }));
    return c3([t => sombra(F.q.pos[0], 615 * K, 90) + F.L.raw(t) + sombra(H.pos[0], 620 * K, 90) + HL.raw(t) + g(I.coracao, { x: 740 * K, y: 380 * K, s: .4 * ent(t, kf - .4, .4), op: ent(t, kf - .4, .4) })], { cam: () => ({ z: 1.5, x: 1000, y: 600 }) }); },
});



export { C as CENAS, CN, K, uri, mapa, img, bg, frente, recorte, altura, no, sombra, DEFS, camera, P, mao, SEM_PERNAS, FIG, TINA, W, jornal, contador };
if (process.argv[1].replace(/\\/g, '/').endsWith('/m007_b.mjs')) {
  const ids = (process.argv[2] || Object.keys(C).join(',')).split(',');
  const PREV = process.env.PREV || `${HERE}/prev`;
  const pr = new Proj(), jobs = [];
  for (const id of ids) {
    const [a, b] = SB[id], c = pr.comp(id, b - a);
    pr.layers(c, C[id](a));
    if (process.argv[3]) jobs.push(...process.argv[3].split(';').map(s => frame(id, s === 'm' ? (b - a) * .8 : +s, `${PREV}/${id}${s === 'm' ? '' : '_' + s}.png`)));
    else jobs.push(video(id, `${V}/midia/motion/${id}.mp4`));
  }
  fs.mkdirSync(PREV, { recursive: true });
  await pr.run(jobs);
}
