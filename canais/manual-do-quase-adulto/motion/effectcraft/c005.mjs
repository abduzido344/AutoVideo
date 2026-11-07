import fs from 'fs';
import { Proj, video, frame, HERE, clamp, io, out, shapeL, add } from './kit.mjs';
import { prota, piscar, pose } from './vetor.mjs';
import { TINTA, BRANCO, AMBAR, raw, g } from './mg.mjs';
import { sala, quartoLado } from './cenarios.mjs';
import { quartoMesa, mesaFrente, mesaCima, maoCima, rabisco, trim, fim, caneta } from './mesa.mjs';

const V = `${HERE}/../../videos/005_por_que_voce_vive_cansado_sem_ter_feito_nada`;
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const resp = t => Math.sin(t / 3.4 * Math.PI * 2);
const lerp = (a, b, k) => a + (b - a) * k;
const lp = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
const pico = (t, c, w) => Math.max(0, 1 - Math.abs(t - c) / w);
const SEM_PERNAS = ['cabeloTras', 'tronco', 'cabeca', 'cabelo', 'sobrancelhas', 'maoE', 'bracoE', 'maoD', 'bracoD'];
const celular = (luz = 0) => `<rect x="-58" y="-104" width="116" height="208" rx="18" fill="#22252b" ${S6}/>` +
  (luz ? `<rect x="-46" y="-88" width="92" height="176" rx="8" fill="#cfe3f0" opacity="${luz}"/>` : '');
const noCel = (f, rotf = () => -6, show = () => true) => raw('celular', t => { if (!show(t)) return ''; const q = f(t), J = pose(q).J.maoD, s = q.s;
  return g(celular(0), { x: q.pos[0] + J[0] * s + 8 * s / .78, y: q.pos[1] + J[1] * s - 66 * s / .78, r: rotf(t), s: .55 * s / .78 }); });
const vib = (x, y, t, k = 1) => [0, 1].map(j => { const u = (t * 2 + j * .5) % 1;
  return `<path d="M${x + 110 * k + 30 * u} ${y - 50 * k}q${24 * k} ${50 * k} 0 ${100 * k}M${x - 110 * k - 30 * u} ${y - 50 * k}q${-24 * k} ${50 * k} 0 ${100 * k}" fill="none" stroke="${AMBAR}" stroke-width="8" stroke-linecap="round" opacity="${1 - u}"/>`; }).join('');
const zoom = (pr, nome, dur, Ls, anchor, scale, pos = [960, 540], mov = 0) => { const c = pr.comp(nome, dur); pr.layers(c, Ls);
  return [{ name: nome, comp: c, anchor, pos, scale: t => scale * (1 + mov * t / dur), t0: 0, t1: dur }]; };
const P0 = f => prota(t => { const q = f(t); return { s: .5, tronco: .8 * resp(t), cab: 0, br: { E: [19, -7, 0], D: [-18, 9, 0] }, ...q,
  rosto: { pisca: piscar(t, [1.1, 3.4, 6.1]), ...(q.rosto || {}) } }; });

// C1 sofá
const MAD = '#b98a5e', MADE = '#8a5e3c';
const mesinha = raw('mesinha', () => `<ellipse cx="960" cy="1010" rx="560" ry="26" fill="#000" opacity=".28"/>` +
  `<rect x="420" y="760" width="1080" height="56" rx="10" fill="${MAD}" ${S6}/><rect x="450" y="816" width="1020" height="150" fill="${MADE}" ${S6}/>` +
  `<rect x="470" y="966" width="40" height="44" fill="${MADE}" ${S6}/><rect x="1410" y="966" width="40" height="44" fill="${MADE}" ${S6}/>`);
const janela = (noite = false) => raw('janela', () => `<rect x="70" y="150" width="200" height="380" fill="${noite ? '#1f2a40' : '#e9dcc0'}" ${S6}/>` +
  (noite ? [[110, 420], [200, 380], [150, 470], [230, 450]].map(([x, y]) => `<rect x="${x}" y="${y}" width="14" height="18" fill="#f2c94c" opacity=".8"/>`).join('') : '') +
  `<path d="M170 150V530M70 340H270" fill="none" ${S6}/><rect x="50" y="530" width="240" height="22" rx="6" fill="#d8d3ca" ${S6}/>`);
const fone = (x, y, r = 0, s = .6) => g(`<rect x="-70" y="-14" width="140" height="28" rx="10" fill="#22252b" ${S6}/>`, { x, y, r, s });
const BR0 = [-30, 125, 0], BRMESA = [-8, 30, 0];
const largado = q => t => { const o = q(t);
  return { pos: [960, 770 + (o.dy || 0)], s: .78, tronco: -5 + .8 * resp(t) + (o.tr || 0), cab: 9 + (o.cab || 0), ordem: SEM_PERNAS,
    br: { E: [22, -10, 0], D: o.brD || BR0 }, mao: { E: 'costas', D: o.maoD || 'punho' },
    rosto: { gx: 10, gy: 16, pisca: piscar(t, [1.3, 3.2]), sorriso: -.1, sobr: -2, ...(o.rosto || {}) } }; };
const rola = t => { const u = (t % .9) / .9, f = u < .25 ? Math.sin(u / .25 * Math.PI) : 0;
  return { dy: 14 * out(t / 1.2), brD: lp(BR0, [-30, 131, 0], f), cab: 2 * out(t / 1.2), rosto: { abre: .25 * pico(t, .7, .35) } }; };
const C1P1 = largado(rola);
const C1P2 = largado(t => ({ dy: 14, cab: 3, rosto: { gx: 8, gy: 18, pisca: .35 + .65 * pico(t, 1.2, .3), sobr: -3, sorriso: -.25, abre: .2 * pico(t, 1.9, .3) } }));
const LARGA = 1.3;
const C1P3 = largado(t => { const d = io(clamp((t - .3) / 1)), v = io(clamp((t - 1.5) / .9));
  return { dy: 14 - 18 * v, tr: 3 * v, cab: 3 - 12 * v, brD: lp(BR0, BRMESA, d), maoD: 'punho',
    rosto: { gx: lerp(8, -14, v), gy: lerp(18, -2, v), pisca: piscar(t, [2.9]), sobr: lerp(-3, 1, v), sorriso: lerp(-.25, .15, v) } }; });

// C2 quarto
const C2P1 = t => ({ pos: [980, 790], s: .62, tronco: -4 + .8 * resp(t), cab: 10 - 3 * io(clamp((t - 1) / 1)),
  br: { E: [12, -4, 0], D: [-12, 4, 0] }, ordem: SEM_PERNAS,
  rosto: { pisca: .55 + .45 * pico(t, 2.6, .3), sobr: -3, sorriso: -.3, abre: .85 * pico(t, 1.5, .6), gy: 8 } });
const C2P2 = t => { const k = io(clamp((t - .4) / .9)), b = io(clamp((t - 2.7) / .9)), up = k * (1 - b);
  return { pos: [980, 1010 - 10 * up], s: .5, cab: -6 * up + 4 * Math.sin(t * 1.4) * b,
    br: { E: lp([19, -7, 0], [165, 15, 0], up), D: lp([-18, 9, 0], [-165, -15, 0], up) }, mao: { E: up > .3 ? 'punho' : 'costas', D: up > .3 ? 'punho' : 'costas' },
    rosto: { pisca: up > .5 ? 1 : 0, abre: .9 * pico(t, 1.6, .7), sorriso: .2, sobr: 3 * up } }; };

// C3 escrivaninha
const cabeca = q => { const J = pose(q).J.cabeca; return [q.pos[0] + J[0] * q.s, q.pos[1] + J[1] * q.s]; };
const rot2 = (v, d) => { const r = d * Math.PI / 180; return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)]; };
const fones = f => raw('fone', t => { const q = f(t), H = cabeca(q), a = (q.tronco || 0) + (q.cab || 0), s = q.s, c = add(H, rot2([0, -177 * s], a));
  const L = add(c, rot2([-170 * s, 40 * s], a)), R = add(c, rot2([170 * s, 40 * s], a)), T = add(c, rot2([0, -250 * s], a));
  return `<path d="M${L[0]} ${L[1]}Q${T[0]} ${T[1]} ${R[0]} ${R[1]}" fill="none" stroke="${TINTA}" stroke-width="${30 * s + 12}" stroke-linecap="round"/>` +
    `<path d="M${L[0]} ${L[1]}Q${T[0]} ${T[1]} ${R[0]} ${R[1]}" fill="none" stroke="#2a2d33" stroke-width="${30 * s}" stroke-linecap="round"/>` +
    [L, R].map(P => `<rect x="${P[0] - 40 * s}" y="${P[1] - 70 * s}" width="${80 * s}" height="${140 * s}" rx="${30 * s}" fill="#2a2d33" stroke="${TINTA}" stroke-width="6" transform="rotate(${a} ${P[0]} ${P[1]})"/>`).join(''); });
const notebook = `<path d="M-230 0L230 0L260 34L-260 34Z" fill="#9aa0a8" ${S6}/><rect x="-210" y="-290" width="420" height="290" rx="14" fill="#5c6168" ${S6}/><rect x="-188" y="-268" width="376" height="246" rx="6" fill="#cfe0ec"/>`;
const C3P1 = t => ({ pos: [960, 750], s: .74, cab: -2, tronco: .6 * resp(t),
  br: { E: [10, -70 + 4 * Math.sin(t * 13), 0], D: [-10, 70 + 4 * Math.sin(t * 11 + 1), 0] }, mao: { E: 'costas', D: 'costas' }, ordem: SEM_PERNAS,
  rosto: { gx: -3, gy: 12, sobrIn: .7, sobr: -2, sorriso: -.2 } });
const C3P2 = () => [...mesaCima(), raw('celular vibrando', t => { const on = (t % .9) < .55, v = on ? Math.sin(t * 70) * 6 : 0;
  return `<rect x="${830 + v}" y="320" width="260" height="470" rx="36" fill="#000" opacity=".25"/>` + g(`<rect x="-120" y="-220" width="240" height="440" rx="34" fill="#22252b" ${S6}/><rect x="-100" y="-196" width="200" height="392" rx="14" fill="${on ? '#d7ecfa' : '#2f333a'}"/>` +
    (on ? [0, 1, 2].map(j => `<rect x="-82" y="${-170 + j * 92}" width="164" height="72" rx="14" fill="${BRANCO}" opacity=".9"/>`).join('') : ''), { x: 960 + v, y: 540, r: v * .5 }) + (on ? vib(960, 540, t, 2) : ''); })];
const ESCRITA = [1, 2, 3, 4, 5, 6].map(j => rabisco(690, 125 + j * 70, [290, 340, 250, 320, 280, 200][j - 1], j));
const progE = (i, t) => clamp(t / 2.6 * ESCRITA.length - i);
const C3P3 = () => { const tip = t => { const i = ESCRITA.findIndex((_, k) => progE(k, t) < 1); return i < 0 ? ESCRITA.at(-1).at(-1) : fim(ESCRITA[i], progE(i, t)); };
  const emp = t => io(clamp((t - 3.0) / .8)), solta = t => t > 2.8;
  return [...mesaCima(), raw('folha', t => `<g transform="translate(${360 * emp(t)} ${-60 * emp(t)}) rotate(${8 * emp(t)} 960 560)"><rect x="574" y="70" width="800" height="1000" rx="10" fill="#000" opacity=".2"/>` +
      `<rect x="560" y="60" width="800" height="1000" rx="8" fill="#f6f3ea" ${S6}/>` + Array.from({ length: 15 }, (_, j) => `<path d="M600 ${140 + j * 64}H1320" stroke="#c9d3e3" stroke-width="3"/>`).join('') +
      ESCRITA.map((p, i) => progE(i, t) > .002 ? `<path d="M${trim(p, progE(i, t)).map(q => q.join(' ')).join('L')}" fill="none" stroke="#2b4c8c" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` : '').join('') + `</g>`),
    raw('caneta solta', t => solta(t) ? g(`<rect x="-12" y="-90" width="24" height="180" rx="10" fill="#2b4c8c" ${S6}/>`, { x: 470, y: 760, r: 70 }) : ''),
    shapeL('Caneta', caneta('#2b4c8c', 160), { pos: tip, rot: 30, op: t => solta(t) ? 0 : 100 }),
    shapeL('Mão', maoCima(true), { pos: t => solta(t) ? [1080 + 300 * emp(t), 700 - 40 * emp(t)] : add(tip(t), [60, 70]), rot: -30 })];
};

// C4 cozinha
const cozinha = raw('cozinha', () => `<rect width="1920" height="1080" fill="#d9d4c8"/>` +
  Array.from({ length: 9 }, (_, i) => `<path d="M${120 + i * 210} 420V760" stroke="#c7c1b4" stroke-width="4"/>`).join('') + [500, 580, 660].map(y => `<path d="M0 ${y}H1920" stroke="#c7c1b4" stroke-width="4"/>`).join('') +
  `<rect x="60" y="60" width="760" height="300" rx="10" fill="#e9e3d6" ${S6}/><path d="M440 60V360" ${S6}/><circle cx="410" cy="300" r="10" fill="${TINTA}"/><circle cx="470" cy="300" r="10" fill="${TINTA}"/>` +
  `<rect x="1180" y="60" width="680" height="300" rx="10" fill="#e9e3d6" ${S6}/><path d="M1520 60V360" ${S6}/>` +
  `<g transform="rotate(-3 400 555)"><rect x="300" y="430" width="200" height="250" fill="${BRANCO}" ${S6}/>` + [0, 1, 2, 3, 4].map(j => `<path d="M330 ${480 + j * 38}h${120 - j * 12}" stroke="#b5b0a6" stroke-width="6" stroke-linecap="round"/>`).join('') + `</g>`);
const bancada = raw('bancada', () => `<rect x="-20" y="760" width="1960" height="50" rx="8" fill="#e2ddd2" ${S6}/><rect x="0" y="810" width="1920" height="300" fill="#7d8a7c" ${S6}/>` +
  `<path d="M480 810V1080M960 810V1080M1440 810V1080" ${S6}/><rect x="1260" y="740" width="420" height="24" rx="6" fill="#3a3d42" ${S6}/>`);
const panela = (t, vapor = 1) => `<rect x="1330" y="640" width="280" height="110" rx="14" fill="#9aa3ad" ${S6}/><rect x="1300" y="630" width="340" height="26" rx="10" fill="#b7bec6" ${S6}/><path d="M1300 680h-60M1640 680h60" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>` +
  [0, 1, 2].map(j => { const u = (t * .5 + j / 3) % 1; return `<path d="M${1400 + j * 70} ${610 - 220 * u}q-24 -30 0 -60q24 -30 0 -60" fill="none" stroke="${BRANCO}" stroke-width="12" stroke-linecap="round" opacity="${vapor * .7 * Math.sin(Math.PI * u)}"/>`; }).join('');
const tabua = (n, cx = 820) => `<rect x="${cx - 260}" y="730" width="520" height="40" rx="12" fill="#c69a6a" ${S6}/>` +
  `<path d="M${cx - 200} 720h${220 - n * 12}q30 0 30 12q0 12 -30 12h-${220 - n * 12}z" fill="#f08a3c" ${S6}/>` +
  Array.from({ length: n }, (_, i) => `<ellipse cx="${cx + 70 + i * 26}" cy="${738 - (i % 2) * 6}" rx="12" ry="10" fill="#f08a3c" stroke="${TINTA}" stroke-width="4"/>`).join('');
const corte = t => Math.floor(t / .45);
const C4P1 = t => { const u = (t % .45) / .45, d = u < .5 ? u / .5 : 1 - (u - .5) / .5;
  return { pos: [820, 800], s: .66, tronco: 2 + .6 * resp(t), cab: 6, ordem: SEM_PERNAS,
    br: { E: [14, -52, 0], D: [-20, 64 - 14 * d, 0] }, mao: { E: 'aberta', D: 'punho' },
    rosto: { gx: 4, gy: 18, sorriso: .25, sobr: -1, sobrIn: -.2 } }; };
const C4P3 = t => { const v = io(clamp((t - .2) / .7)), j = io(clamp((t - 1.4) / .5));
  return { pos: [1200 + 60 * v, 800], s: .66, tronco: -8 * v + .6 * resp(t), cab: 10 * v - 4 * j, ordem: SEM_PERNAS,
    br: { E: lp([19, -7, 0], [22, 140, 0], j), D: [-18, 9, 0] }, mao: { E: j > .3 ? 'joinha' : 'costas' },
    rosto: { pisca: v > .4 && j < .5 ? 1 : 0, sorriso: .3 + .7 * j, sobr: 4 * j, gx: 10 * v } }; };

// C5 parque
const nuvens = t => [[300, 180, 1], [1400, 140, 1.3], [900, 260, .8]].map(([x, y, s]) => g(`<ellipse cx="0" cy="0" rx="120" ry="48" fill="${BRANCO}"/><ellipse cx="-70" cy="10" rx="80" ry="40" fill="${BRANCO}"/><ellipse cx="80" cy="12" rx="90" ry="38" fill="${BRANCO}"/>`, { x: x + 10 * t, y, s })).join('');
const parque = raw('parque', t => `<rect width="1920" height="1080" fill="#cfe4ee"/>` + nuvens(t) +
  `<path d="M0 760Q480 700 960 740T1920 730V1080H0Z" fill="#8cbf7a" ${S6}/>` +
  `<path d="M560 980C600 760 600 520 620 300L760 300C780 520 780 760 820 980Z" fill="#8a6345" ${S6}/>` +
  `<ellipse cx="690" cy="230" rx="430" ry="230" fill="#5f9e5a" ${S6}/><ellipse cx="460" cy="320" rx="220" ry="140" fill="#6aad63" ${S6}/><ellipse cx="930" cy="310" rx="240" ry="150" fill="#6aad63" ${S6}/>`);
const moita = raw('moita', () => `<path d="M300 1080Q280 900 420 900Q460 820 560 860Q640 800 720 870Q820 820 880 900Q1000 880 1000 1000L1020 1080Z" fill="#4f8f4a" ${S6}/>`);
const livro = (x, y, r = 0, s = 1) => g(`<path d="M0 -10L-150 -40L-150 110L0 140Z" fill="#f6f3ea" ${S6}/><path d="M0 -10L150 -40L150 110L0 140Z" fill="#f6f3ea" ${S6}/>` +
  [0, 1, 2].map(j => `<path d="M-130 ${-10 + j * 34}L-20 ${12 + j * 34}M130 ${-10 + j * 34}L20 ${12 + j * 34}" stroke="#b5b0a6" stroke-width="5"/>`).join('') + `<path d="M-160 112L0 150L160 112" fill="none" stroke="#c0392b" stroke-width="10"/>`, { x, y, r, s });
const LIVRO = { E: [28, -118, 0], D: [-28, 118, 0] };
const C5P1 = t => ({ pos: [690, 930], s: .5, cab: 4, br: LIVRO, mao: { E: 'punho', D: 'punho' }, ordem: SEM_PERNAS,
  rosto: { gy: 18, gx: 2, sorriso: .3, pisca: piscar(t, [2.2]) } });
const C5P2 = t => { const k = io(clamp((t - .4) / .8)); return { pos: [690, 930], s: .5, tronco: .8 * resp(t) - 1.5 * k * Math.sin(t * 1.6), cab: 4 - 10 * k, br: LIVRO, mao: { E: 'punho', D: 'punho' }, ordem: SEM_PERNAS,
  rosto: { gy: lerp(18, -20, k), gx: lerp(2, -6, k), sorriso: .3 + .4 * k, pisca: k > .3 && t > 2.4 && t < 3.6 ? 1 : 0, abre: .15 * pico(t, 2.2, .5) } }; };
const folhaCai = t => { const u = clamp((t - .6) / 3.2); return u <= 0 || u >= 1 ? '' : g(`<path d="M0 -18Q20 0 0 18Q-20 0 0 -18Z" fill="#7fbf6a" ${S6}/>`, { x: 820 - 120 * u + 40 * Math.sin(u * 9), y: 360 + 380 * u, r: 40 * Math.sin(u * 7) }); };

// C6 degrau
const porta = raw('porta', () => `<rect width="1920" height="1080" fill="#d9c7a8"/>` + Array.from({ length: 14 }, (_, i) => `<path d="M0 ${i * 80 + 40}H1920" stroke="#cbb895" stroke-width="4"/>`).join('') +
  `<rect x="760" y="80" width="400" height="820" rx="8" fill="#6f8fa8" ${S6}/><rect x="810" y="140" width="300" height="300" rx="6" fill="none" stroke="#5a778e" stroke-width="10"/><rect x="810" y="490" width="300" height="340" rx="6" fill="none" stroke="#5a778e" stroke-width="10"/><circle cx="1110" cy="520" r="16" fill="${AMBAR}" ${S6}/>` +
  `<rect x="560" y="880" width="800" height="70" fill="#b8b2a7" ${S6}/><rect x="520" y="950" width="880" height="140" fill="#a39c90" ${S6}/>` +
  `<rect x="1430" y="840" width="160" height="150" rx="10" fill="#b5563a" ${S6}/><path d="M1510 840q-80 -120 -40 -220M1510 840q10 -150 70 -230M1510 840q80 -90 140 -110" fill="none" stroke="#4f8f4a" stroke-width="22" stroke-linecap="round"/>`);
const C6 = t => { const ri = pico(t, 1.3, .7);
  return { pos: [960, 930], s: .56, tronco: .8 * resp(t) - 3 * ri * Math.abs(Math.sin(t * 14)), cab: -9 * ri + 2, br: { E: [19, -7, 0], D: [-28, 118, 0] }, mao: { D: 'punho' }, ordem: SEM_PERNAS,
    rosto: { gx: 8, gy: 14 - 10 * ri, sorriso: .5 + .5 * ri, abre: ri * .7 * Math.abs(Math.sin(t * 12)), pisca: ri > .5 ? .85 : piscar(t, [3.6]) } }; };
const C6b = t => ({ ...C6(t + 3), rosto: { gx: 8, gy: 12, sorriso: .55, pisca: piscar(t, [1.2]) } });
const ondasCel = (f, on) => raw('ondas', t => { if (!on(t)) return ''; const q = f(t), J = pose(q).J.maoD; return vib(q.pos[0] + J[0] * q.s + 6, q.pos[1] + J[1] * q.s - 48, t, .6); });

const SH = {
  C1: [
    ['P1 rolando', 4, () => [...sala(false), janela(), prota(C1P1), noCel(C1P1), mesinha]],
    ['P2 rosto', 2.5, pr => zoom(pr, 'C1 P2 base', 2.5, [...sala(false), janela(), prota(C1P2), noCel(C1P2), mesinha], [960, 470], 250, [960, 560])],
    ['P3 larga o celular', 3.5, () => [...sala(false), janela(), prota(C1P3), noCel(C1P3, t => -6 + 20 * clamp((t - .3) / 1), t => t < LARGA),
      mesinha, raw('celular na mesa', t => t >= LARGA ? fone(1060, 778, 0, .9) : '')]],
  ],
  C2: [
    ['P1 beira da cama', 4, pr => zoom(pr, 'C2 P1 base', 4, [...quartoLado(), P0(C2P1), raw('lençol frente', () => `<path d="M268 770H1690V900H268Z" fill="#a6abb3" ${S6}/>`)], [980, 600], 170)],
    ['P2 espreguiça', 4, pr => zoom(pr, 'C2 P2 base', 4, [...quartoLado(), P0(C2P2)], [1000, 760], 175)],
  ],
  C3: [
    ['P1 notebook', 3, () => [...quartoMesa(), P0(C3P1), fones(C3P1), ...mesaFrente(null, { luminaria: true }), raw('notebook', t => g(notebook, { x: 960, y: 792, s: .6 }) + g(celular((t % .9) < .5 ? 1 : 0), { x: 1330, y: 742, r: 74, s: .45 }))]],
    ['P2 celular vibrando', 2, () => C3P2()],
    ['P3 escreve e afasta', 4, () => C3P3()],
  ],
  C4: [
    ['P1 corta', 4, () => [cozinha, P0(C4P1), bancada, raw('panela e tábua', t => panela(t) + tabua(Math.min(8, corte(t))))]],
    ['P2 close faca', 3, pr => zoom(pr, 'C4 P2 base', 3, [cozinha, P0(t => C4P1(t + 4)), bancada, raw('panela e tábua', t => panela(t) + tabua(Math.min(12, corte(t + 3.6))))], [840, 700], 260)],
    ['P3 cheira e joinha', 3, () => [cozinha, P0(C4P3), bancada, raw('panela e tábua', t => panela(t, 1.4) + tabua(12))]],
  ],
  C5: [
    ['P1 lendo', 4, pr => zoom(pr, 'C5 P1 base', 4, [parque, P0(C5P1), raw('livro', () => livro(690, 800, 0, .55)), moita], [690, 690], 165, [960, 560], .1)],
    ['P2 olha o céu', 4, pr => zoom(pr, 'C5 P2 base', 4, [parque, P0(C5P2), raw('livro', t => livro(690, 800 + 30 * io(clamp((t - .4) / .8)), 0, .55)), moita, raw('folha', folhaCai)], [690, 560], 230)],
  ],
  C6: [
    ['P1 ri ao telefone', 3, pr => zoom(pr, 'C6 P1 base', 3, [porta, P0(C6), noCel(t => ({ ...C6(t), s: .56 })), ondasCel(t => ({ ...C6(t), s: .56 }), t => t < 2.2)], [960, 640], 130)],
    ['P2 ouve tranquilo', 2, pr => zoom(pr, 'C6 P2 base', 2, [porta, P0(C6b), noCel(t => ({ ...C6b(t), s: .56 }))], [960, 560], 240)],
  ],
  TH: [['thumb', 1, pr => { const q = largado(() => ({ dy: 14, cab: 4, rosto: { gx: 8, gy: 18, pisca: .45, sobr: -4, sobrIn: .9, sorriso: -.45 } }));
    const T = (s, x, y, tam, cor) => `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle" fill="none" stroke="${TINTA}" stroke-width="34" stroke-linejoin="round">${s}</text>` +
      `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="900" font-size="${tam}" text-anchor="middle" fill="${cor}">${s}</text>`;
    return [...zoom(pr, 'TH base', 1, [...sala(false), janela(), prota(q), noCel(q), mesinha], [960, 560], 175, [1380, 600]),
      raw('luz', () => `<defs><linearGradient id="th" x1="0" x2="1"><stop offset="0" stop-color="#1d2433" stop-opacity=".85"/><stop offset=".55" stop-color="#1d2433" stop-opacity=".35"/><stop offset="1" stop-color="#e8a24a" stop-opacity=".15"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#th)"/>`),
      raw('texto', () => T('CANSADO', 560, 430, 210, '#fbf3e0') + T('DE QUÊ?', 560, 680, 230, AMBAR))]; }]],
  I1: [['pórtico', 1, () => [raw('pórtico', () => { const PEDRA = '#efe9dc', SOMB = '#d6cdb9';
    const filo = (x, cor, r = 0, h = 1) => g(`<path d="M-55 230L-40 20Q0 -6 40 20L55 230Z" fill="${cor}" ${S6}/><path d="M-40 30L40 120" stroke="${BRANCO}" stroke-width="16" opacity=".6"/><circle cy="-30" r="44" fill="#d8b48c" ${S6}/><path d="M-40 -20q40 50 80 0" fill="#9a8f84" ${S6}/>`, { x, y: 640, r, s: h });
    return `<rect width="1920" height="1080" fill="#cfe4ee"/><rect y="820" width="1920" height="260" fill="${SOMB}" ${S6}/>` +
      Array.from({ length: 8 }, (_, i) => `<path d="M${i * 280 - 100} 1080L${i * 240 + 60} 820" stroke="#c4baa4" stroke-width="5"/>`).join('') +
      `<path d="M120 200L960 40L1800 200Z" fill="${PEDRA}" ${S6}/><rect x="120" y="200" width="1680" height="70" fill="${PEDRA}" ${S6}/>` +
      [220, 520, 820, 1100, 1400, 1700].map(x => `<rect x="${x - 50}" y="270" width="100" height="550" fill="${PEDRA}" ${S6}/>` + [0, 1, 2].map(j => `<path d="M${x - 26 + j * 26} 290V800" stroke="${SOMB}" stroke-width="6"/>`).join('') +
        `<rect x="${x - 70}" y="262" width="140" height="30" fill="${PEDRA}" ${S6}/><rect x="${x - 70}" y="800" width="140" height="30" fill="${PEDRA}" ${S6}/>`).join('') +
      filo(700, '#c9d6e0', -3) + filo(880, '#e7d7b6', 2) + filo(1140, '#d9c7d6', -2) + filo(1320, '#cfe0c8', 4) +
      g(`<rect x="-20" y="-80" width="40" height="160" rx="16" fill="#f3e6c4" ${S6}/>`, { x: 1250, y: 720, r: 60 }) +
      `<path d="M935 620l30 -60" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>`; })]]],
  I2: [['noite', 1, () => [...sala(true), janela(true), raw('celular largado', () => g(celular(0), { x: 1180, y: 690, r: 72, s: .5 }))]]],
};

const id = process.argv[2] || 'C1', pr = new Proj(); let t0 = 0; const cs = [];
for (const [n, d, f] of SH[id]) { const c = pr.comp(`${id} ${n}`, d); pr.layers(c, f(pr)); cs.push({ name: n, comp: c, t0, t1: t0 + d }); t0 += d; }
pr.layers(pr.comp(id, t0), cs);
const ts = process.argv[3];
fs.mkdirSync(`${HERE}/prev`, { recursive: true });
await pr.run(ts ? ts.split(';').map(s => frame(id, +s, `${HERE}/prev/${id}_${s}.png`)) : [video(id, `${V}/midia/${id}.mp4`)]);
