import fs from 'fs';
import { Proj, video, frame, HERE, clamp, io, out } from './kit.mjs';
import { prota, piscar } from './vetor.mjs';
import { PAPEL, TINTA, TURQ, AMBAR, CINZA, VERM, AZUL, AMAR, BRANCO, ICON, ent, sai, lerp, raw, fundo, txt, g, surge, cartao } from './mg.mjs';

const V = `${HERE}/../../shorts/001_disciplina_nao_e_forca_de_vontade`;
const T = fs.readFileSync(`${V}/audio/tempos.csv`, 'utf8').trim().split('\n').slice(1).map(l => l.split(',').slice(1, 3).map(Number));
const FIM = 57.5, ini = i => i ? T[i][0] : 0, dur = i => (T[i + 1]?.[0] ?? FIM) - ini(i);
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const NOITE = '#2b3346', MADRU = '#3d4a63', TARDE = '#e6d9c4', MAD = '#b98a5e', MADE = '#8a5e3c';

const resp = t => Math.sin(t / 3.2 * Math.PI * 2);
const P = (f, o) => prota(t => { const q = f(t);
  return { s: .5, tronco: .6 * resp(t), cab: 0, br: { E: [19, -7, 0], D: [-18, 9, 0] }, pe: { E: [3, -1, -2], D: [-3, 1, 2] }, ...q,
    rosto: { pisca: piscar(t, [1.1, 3.9]), ...(q.rosto || {}) } }; }, o);
const triste = { sorriso: -.4, sobr: 4, sobrIn: .8 }, feliz = { sorriso: 1 }, firme = { sorriso: .1, sobr: -2, sobrIn: -.4 };
const sombra = (x, y, w) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * .09}" fill="#000" opacity=".27"/>`;
const corre = (t, f = 2.6) => { const a = Math.sin(t * f * Math.PI * 2), b = Math.abs(Math.cos(t * f * Math.PI * 2));
  return { bob: -14 * b, br: { E: [19 - 34 * a, -95, 0], D: [-18 - 34 * a, 95, 0] }, pe: { E: [5 * a, -6 * clamp(a), 0], D: [5 * a, -6 * clamp(-a), 0] }, mao: { E: 'punho', D: 'punho' } }; };
const anda = (t, f = 1.1) => { const a = Math.sin(t * f * Math.PI * 2);
  return { bob: -6 * Math.abs(Math.cos(t * f * Math.PI * 2)), br: { E: [19 - 9 * a, -10, 0], D: [-18 - 9 * a, 10, 0] }, pe: { E: [9 * a, -10 * clamp(a), 0], D: [9 * a, -10 * clamp(-a), 0] } }; };

const celular = (luz, k = 1) => `<rect x="-58" y="-104" width="116" height="208" rx="18" fill="#22252b" ${S6}/>` +
  `<rect x="-46" y="-88" width="92" height="176" rx="8" fill="${luz > 0 ? `rgb(${Math.round(lerp(40, 200, luz))},${Math.round(lerp(44, 225, luz))},${Math.round(lerp(52, 240, luz))})` : '#2f333a'}"/>`;
const ondas = (t, op) => op <= 0 ? '' : [0, 1].map(j => { const u = (t * 1.6 + j * .5) % 1;
  return `<path d="M${90 + 40 * u} -40q30 40 0 80M${-90 - 40 * u} -40q-30 40 0 80" fill="none" stroke="${AMAR}" stroke-width="8" stroke-linecap="round" opacity="${op * (1 - u)}"/>`; }).join('');
const criado = `<rect x="-170" y="0" width="340" height="300" rx="10" fill="${MADE}" ${S6}/><path d="M-170 130h340" fill="none" ${S6}/><circle cx="0" cy="68" r="12" fill="${AMBAR}" ${S6}/><circle cx="0" cy="198" r="12" fill="${AMBAR}" ${S6}/><rect x="-200" y="-24" width="400" height="30" rx="8" fill="${MAD}" ${S6}/>`;
const cama = (lump = 1, treme = 0) => `<rect x="-470" y="40" width="40" height="120" fill="${MADE}" ${S6}/><rect x="430" y="40" width="40" height="120" fill="${MADE}" ${S6}/>` +
  `<rect x="-500" y="-260" width="60" height="420" rx="14" fill="${MAD}" ${S6}/><rect x="-460" y="0" width="920" height="70" rx="12" fill="${MAD}" ${S6}/>` +
  `<path d="M-430 -110q30 -40 120 -30q40 10 40 50q-60 30 -160 20z" fill="${BRANCO}" ${S6}/>` +
  `<path d="M-440 10Q-440 ${-80 - 70 * lump + treme} -240 ${-90 - 80 * lump + treme}Q0 ${-140 * lump - 20 + treme} 200 ${-70 * lump - 30}Q420 -40 450 10Z" fill="#8f9fb8" ${S6}/>` +
  `<path d="M-200 ${-70 * lump - 30}q60 30 120 10M80 ${-60 * lump - 20}q50 30 120 0" fill="none" stroke="#71809a" stroke-width="6" stroke-linecap="round"/>`;
const calendario = (dia, vira) => { const nomes = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], a = nomes[dia % 5], b = nomes[(dia + 1) % 5];
  const pag = (n, sy = 1) => `<g transform="scale(1 ${sy})"><rect x="-130" y="-20" width="260" height="230" rx="10" fill="${BRANCO}" ${S6}/>${txt(n, 0, 130, { tam: 90 })}</g>`;
  return `<rect x="-140" y="-80" width="280" height="80" rx="10" fill="${VERM}" ${S6}/><circle cx="-70" cy="-80" r="12" fill="${TINTA}"/><circle cx="70" cy="-80" r="12" fill="${TINTA}"/>` +
    pag(b) + (vira < 1 ? `<g transform="translate(0 -20)">${pag(a, 1 - 2 * vira).replace('translate(0 -20)', '')}</g>`.replace('<g transform="translate(0 -20)">', `<g transform="translate(0 ${-20 + 20 * (1 - vira)})">`) : ''); };
const pensa = (icone, k, apagado) => g(cartao(220, 220, { fill: apagado ? '#ddd8cf' : BRANCO, r: 110 }) + g(icone, { s: .9, op: apagado ? .4 : 1 }) +
  `<circle cx="-70" cy="140" r="22" fill="${BRANCO}" ${S6}/><circle cx="-110" cy="190" r="12" fill="${BRANCO}" ${S6}/>`, { s: .6 + .4 * k, op: k });
const tenis = (x, y, s = 1) => g(`<path d="M-80 0q-6 -36 24 -44l40 -10q20 20 50 18l40 6q22 6 22 30z" fill="${BRANCO}" ${S6}/><path d="M-40 -46q10 22 40 26" fill="none" stroke="${AMBAR}" stroke-width="12" stroke-linecap="round"/><path d="M-84 0h182" fill="none" ${S6}/>`, { x, y, s });
const porta = `<rect x="-150" y="-560" width="300" height="560" rx="6" fill="${MAD}" ${S6}/><rect x="-110" y="-520" width="220" height="200" rx="6" fill="none" stroke="${MADE}" stroke-width="8"/><rect x="-110" y="-280" width="220" height="230" rx="6" fill="none" stroke="${MADE}" stroke-width="8"/><circle cx="104" cy="-270" r="16" fill="${AMBAR}" ${S6}/>`;
const grade = (t, n, falha, k0, vel) => { let s = ''; for (let i = 0; i < 66; i++) { const c = i % 6, r = Math.floor(i / 6), x = 540 + (c - 2.5) * 130, y = 520 + r * 104, kk = clamp((t - k0 - i * vel) / .25);
  if (i >= n) { s += `<rect x="${x - 46}" y="${y - 40}" width="92" height="80" rx="12" fill="#ddd8cf"/>`; continue; }
  s += `<rect x="${x - 46}" y="${y - 40}" width="92" height="80" rx="12" fill="${i === falha ? BRANCO : kk > .5 ? TURQ : '#ddd8cf'}" ${S6}/>` +
    (i !== falha && kk > 0 ? `<path d="M${x - 20} ${y}l14 16l28 -32" fill="none" stroke="${BRANCO}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="${kk}"/>` : ''); }
  return s; };
const ceu = (a, b, id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#${id})"/>`;
const predios = (dx, cor, y0 = 1180, luz = 0) => Array.from({ length: 14 }, (_, i) => { const w = 120 + (i * 37) % 70, h = 220 + (i * 89) % 260, x = ((i * 150 + dx) % 2100 + 2100) % 2100 - 300;
  return `<rect x="${x}" y="${y0 - h}" width="${w}" height="${h}" fill="${cor}" ${S6}/>` + (luz ? `<rect x="${x + 24}" y="${y0 - h + 40}" width="22" height="30" fill="${AMAR}" opacity="${luz}"/><rect x="${x + w - 48}" y="${y0 - h + 110}" width="22" height="30" fill="${AMAR}" opacity="${luz}"/>` : ''); }).join('');
const poste = (x, y0) => `<path d="M${x} ${y0}V${y0 - 520}q0 -40 60 -40" fill="none" stroke="#1d2230" stroke-width="16" stroke-linecap="round"/><ellipse cx="${x + 70}" cy="${y0 - 556}" rx="34" ry="14" fill="${AMAR}" ${S6}/><path d="M${x + 40} ${y0 - 546}L${x - 60} ${y0}H${x + 200}L${x + 100} ${y0 - 546}Z" fill="${AMAR}" opacity=".12"/>`;

const C = [
  i => [fundo(NOITE), raw('celular', t => { const toca = t < 3.3, v = toca ? Math.sin(t * 60) * 8 : 0, k21 = ent(t, .5, .5), x = ent(t, 2.85, .35);
    return g(criado, { x: 540, y: 1180 }) + g(celular(toca ? .75 + .25 * Math.sin(t * 9) : 0) + ondas(t, toca ? 1 : 0), { x: 540 + v, y: 1060, r: -90 + v * .4 }) + sombra(540, 1160, 150) +
      g(txt('21 dias', 0, 0, { tam: 150, cor: BRANCO }) + (x > 0 ? `<path d="M-260 -40L${-260 + 520 * x} -40" stroke="${VERM}" stroke-width="22" stroke-linecap="round"/>` : ''), { x: 540, y: 520 + (1 - k21) * 30, op: k21 }); })],
  i => [fundo(NOITE), raw('dias', t => { const d = Math.floor(t / 1.25), u = (t % 1.25) / 1.25, vira = io(clamp((u - .7) / .25)), toca = u < .45 && t < 4.6, lump = 1;
    const fala = ent(t, 3.95, .3);
    return g(calendario(d, vira), { x: 540, y: 470 }) + g(cama(lump, toca ? Math.sin(t * 50) * 3 : 0), { x: 470, y: 1230 }) + sombra(490, 1400, 480) +
      g(criado, { x: 960, y: 1260, s: .6 }) + g(celular(toca ? 1 : 0) + ondas(t, toca ? 1 : 0), { x: 960, y: 1238, s: .5, r: -90 }) +
      g(`<rect x="-200" y="-70" width="400" height="140" rx="60" fill="${BRANCO}" ${S6}/><path d="M-60 66l-50 60l90 -58" fill="${BRANCO}" ${S6}/>` + txt('amanhã', 0, 26, { tam: 76 }), { x: 430, y: 860, s: .85 + .15 * fala, op: fala }); })],
  i => { const w = [0, 1.45, 3.15]; return [fundo(TARDE), raw('janela', t => { const k = clamp(t / 5.6);
    return `<rect x="60" y="560" width="300" height="400" rx="10" fill="${k < .5 ? '#cfe1ea' : '#f0c890'}" ${S6}/><path d="M210 560v400M60 760h300" stroke="${MADE}" stroke-width="14"/>` +
      `<rect x="0" y="1360" width="1080" height="560" fill="#b59a7a"/><path d="M0 1360h1080" ${S6}/>` + sombra(540, 1362, 190); }),
    P(t => ({ pos: [540, 1010], s: .72, cab: -4 + 1.5 * resp(t), br: { E: [19, -7, 0], D: [-24, -128, 0] }, mao: { D: 'celular' }, rosto: { gx: -4, gy: 14, sorriso: 0 } })),
    raw('pensa', t => [ICON.haltere, ICON.check, ICON.postit].map((ic, j) => { const k = ent(t, w[j], .4), apaga = t > w[j] + 1.1;
      return g(pensa(ic, k, apaga), { x: 250 + j * 290, y: 330 - (j % 2) * 60 }); }).join(''))]; },
  i => [fundo('#c9ccd2'), raw('chão', t => `<rect x="0" y="1560" width="1080" height="360" fill="#9a9ea8"/><path d="M0 1560h1080" ${S6}/>` + sombra(540, 1562, 260)),
    P(t => { const k = io(clamp((t - .4) / 1.4)); return { pos: [540, 1100 + 20 * k], s: .95, cab: 6 * k, tronco: 2 * k, br: { E: [12, -4, 0], D: [-12, 4, 0] }, rosto: { ...triste, gy: 10 * k, gx: -6 } }; }),
    raw('nuvem', t => { const k = ent(t, 1.8, .6), x = 540 + 10 * Math.sin(t * 1.3);
      return g(`<path d="M-150 40q-60 0 -60 -50q0 -50 60 -50q10 -60 80 -60q60 0 80 50q70 -10 80 50q60 10 50 60z" fill="#7c828e" ${S6}/>` +
        Array.from({ length: 6 }, (_, j) => { const u = (t * 1.4 + j / 6) % 1; return `<path d="M${-120 + j * 50} ${60 + 120 * u}v26" stroke="${AZUL}" stroke-width="8" stroke-linecap="round" opacity="${1 - u}"/>`; }).join(''), { x, y: 270, op: k }); })],
  i => [fundo(PAPEL), raw('porta', t => `<rect x="0" y="1360" width="1080" height="560" fill="#b59a7a"/><path d="M0 1360h1080" ${S6}/>` + g(porta, { x: 760, y: 1362 }) + tenis(690, 1352, 1.2) + tenis(850, 1352, 1.2) + sombra(400, 1362, 160)),
    P(t => ({ pos: [380, 1040], s: .66, cab: -3, br: { E: [19, -7, 0], D: [-18, 9, 0] }, rosto: { gx: 12, gy: 12, sorriso: 0, sobrIn: .4 } })),
    raw('ampulheta', t => { const k = ent(t, 1.9, .5), gira = 180 * io(clamp((t - 2.6) / .8));
      return g(ICON.ampulheta, { x: 540, y: 420, s: 1.8 * (.8 + .2 * k), r: gira, op: k }) + `<rect width="1080" height="1920" fill="#fff" opacity="${clamp((t - (dur(4) - .12)) / .12)}"/>`; })],
  i => [raw('madrugada', t => ceu(MADRU, '#6e7b96', 'm6') + `<rect x="0" y="1360" width="1080" height="560" fill="#5a5f6c"/><path d="M0 1360h1080" ${S6}/>` + sombra(540, 1362, 190)),
    P(t => { const k = io(clamp((t - 1.3) / .8)), sono = 1 - k;
      return { pos: [540, 1010 - 10 * k], s: .72, cab: 5 * sono, tronco: 1.5 * sono, hs: 1, br: { E: [19 - 6 * k, -7, 0], D: [-18 + 6 * k, 9, 0] }, mao: k > .5 ? { E: 'punho', D: 'punho' } : {},
        rosto: { pisca: sono > .5 ? .7 + .3 * Math.max(0, Math.sin(t * 3)) : piscar(t, [2.6]), ...(k > .5 ? firme : { sorriso: -.2 }) } }; }),
    raw('dia1', t => { const k = ent(t, 3.2, .35); return g(txt('DIA 1', 0, 0, { tam: 190, cor: BRANCO }), { x: 540, y: 420, s: 1.15 - .15 * k, op: k }); })],
  i => [raw('rua', t => ceu('#3a4560', '#59647e', 'm7') + predios(-t * 120, '#2f3648', 1260, .8) + poste(((-t * 520) % 1400 + 1400) % 1400 - 200, 1360) +
      `<rect x="0" y="1360" width="1080" height="560" fill="#4a4f5c"/><path d="M0 1360h1080" ${S6}/>` + Array.from({ length: 6 }, (_, j) => `<path d="M${((j * 260 - t * 700) % 1560 + 1560) % 1560 - 240} 1520h120" stroke="#6b7180" stroke-width="12" stroke-linecap="round"/>`).join('') ),
    P(t => { const c = corre(t); return { pos: [540, 1290 + 1.6 * c.bob], s: 1.25, tronco: 4, cab: -2, ...c, rosto: { sorriso: -.3, sobrIn: .9, sobr: 3, abre: .35 + .15 * Math.sin(t * 9), pisca: 0 } }; }),
    raw('dia2', t => { const k1 = ent(t, .1, .3), k2 = ent(t, 2.15, .3);
      return g(txt('DIA ' + (t < 2.15 ? 1 : 2), 0, 0, { tam: 120, cor: BRANCO }), { x: 540, y: 400, s: t < 2.15 ? 1 : 1.12 - .12 * k2, op: t < 2.15 ? k1 : 1 }); })],
  i => [raw('rua', t => ceu('#56627c', '#7d879d', 'm8') + predios(-450, '#3f4659', 1260, .4) + `<rect x="0" y="1360" width="1080" height="560" fill="#5a5f6c"/><path d="M0 1360h1080" ${S6}/>` + sombra(540, 1362, 190)),
    P(t => { const k = io(clamp(t / .6)), o = Math.sin(t * 8);
      return { pos: [540, 1022 + 8 * o], s: .72, tronco: 3 + 2 * o, cab: 8 * k, br: { E: [24, -12, 0], D: [-24, 12, 0] }, rosto: { ...triste, gy: 12, abre: .3 + .2 * Math.abs(o), pisca: piscar(t, [2.2]) } }; }),
    raw('semana', t => [0, 1, 2, 3, 4].map(j => { const x = 540 + (j - 2) * 170, k = ent(t, .2 + j * .12, .3), falha = j === 3, kf = ent(t, 2.2, .3);
      return g(`<rect x="-66" y="-66" width="132" height="132" rx="18" fill="${falha ? (kf > .5 ? BRANCO : '#ddd8cf') : TURQ}" ${S6}/>` +
        (!falha ? `<path d="M-26 0l18 20l36 -40" fill="none" stroke="${BRANCO}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>` : kf > .5 ? `<path d="M-24 -24l48 48M24 -24l-48 48" stroke="${VERM}" stroke-width="10" stroke-linecap="round"/>` : ''), { x, y: 380, op: k, s: falha ? 1 + .12 * Math.sin(Math.PI * clamp((t - 2.2) / .4)) : 1 }); }).join(''))],
  i => [fundo(PAPEL), raw('grade', t => grade(t, Math.min(66, 24 + Math.floor(clamp((t - 2.2) / 3) * 42)), 21, .2, .03) +
      txt('Phillippa Lally e colegas, 2010', 540, 300, { tam: 58, peso: 700, op: ent(t, .3) }) + txt('European Journal of Social Psychology', 540, 380, { tam: 40, peso: 400, cor: '#555', op: ent(t, .5) }))],
  i => [fundo('#f2e3c9'), raw('conta', t => { const n = Math.round(1 + 65 * io(clamp((t - .2) / 2.6))), k = Math.sin(Math.PI * clamp((t - 2.8) / .35));
      return g(txt(String(n), 0, 0, { tam: 380, cor: TURQ }), { x: 540, y: 820, s: 1 + .06 * k }) + txt('dias', 540, 960, { tam: 90, op: ent(t, .1) }) +
        txt('na média', 540, 1060, { tam: 56, peso: 400, cor: '#555', op: ent(t, .3) }); }),
    raw('corredor', t => `<path d="M0 1500h1080" stroke="${TINTA}" stroke-width="6"/>`),
    P(t => { const c = corre(t); return { pos: [lerp(-120, 1200, t / dur(9)), 1330 + c.bob * .5], s: .28, tronco: 6, ...c, rosto: firme }; })],
  i => [raw('ladeira', t => { const sx = -t * 60;
      return ceu('#f3c48a', '#f6e2c0', 'm11') + `<circle cx="820" cy="${560 - 30 * t / 5}" r="110" fill="${AMAR}" opacity=".9"/>` + predios(sx * .3, '#d2a07a', 1340) +
        `<path d="M-100 1700L1180 1180V1920H-100Z" fill="#a5856a" ${S6}/>` + Array.from({ length: 7 }, (_, j) => { const u = ((j * 220 + t * 160) % 1540) - 200; return `<path d="M${u} ${1700 - (u + 100) * .406 + 30}l60 -24" stroke="#8b6e55" stroke-width="10" stroke-linecap="round"/>`; }).join(''); }),
    P(t => { const c = anda(t); return { pos: [540, 1112 + c.bob], s: .72, tronco: -4, ...c, rosto: { sorriso: .5 * ent(t, 2.2, .8), gx: 6, pisca: piscar(t, [1.4, 3.6]) } }; })],
  i => { const loop = dur(11) - 1.15; return [raw('topo', t => ceu('#f6b46c', '#fbe6c4', 'm12') + `<circle cx="820" cy="${760 - 80 * clamp(t / 4)}" r="130" fill="${AMAR}"/>` + predios(-200, '#c98e66', 1300, 0) +
      `<path d="M-100 1460Q540 1330 1180 1460V1920H-100Z" fill="#a5856a" ${S6}/>` + sombra(540, 1408, 190)),
    P(t => ({ pos: [540, 1056], s: .72, cab: 2, br: { E: [19, -7, 0], D: [-18, 9, 0] }, rosto: { ...feliz, gy: -6, pisca: piscar(t, [2.2]) } })),
    raw('volta', t => t < loop ? '' : `<rect width="1080" height="1920" fill="${NOITE}"/>` + g(criado, { x: 540, y: 1180 }) + g(celular(.9) + ondas(t, 1), { x: 540 + Math.sin(t * 60) * 8, y: 1060, r: -90 }))]; },
];

const pr = new Proj(), arg = process.argv[2], cs = [];
C.forEach((f, i) => { const c = pr.comp('S' + (i + 1), dur(i)); pr.layers(c, f(i)); cs.push({ name: 'S' + (i + 1), comp: c, t0: ini(i), t1: ini(i) + dur(i) }); });
pr.layers(pr.comp('s001', FIM), cs);
fs.mkdirSync(`${HERE}/prev`, { recursive: true });
await pr.run(arg ? arg.split(',').map(s => frame('s001', +s, `${HERE}/prev/s001_${s}.png`)) : [video('s001', `${V}/midia/motion.mp4`)]);
