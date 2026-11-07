import fs from 'fs';
import { Proj, video, frame, HERE, clamp, io, out } from './kit.mjs';
import { prota, fala, piscar } from './vetor.mjs';
import { PAPEL, TINTA, TURQ, AMBAR, CINZA, VERM, AZUL, AMAR, BRANCO, ent, sai, vis, lerp, raw, fundo, txt, g, surge, cartao, barra, barraH, imagem, ICON, icone, nuvem, fonte } from './mg.mjs';

const V = `${HERE}/../../videos/004_morar_sozinho_pela_primeira_vez`;
const EDL = fs.readFileSync(`${V}/midia/edl.csv`, 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const span = id => { const i = EDL.findIndex(r => r[2] === `motion/${id}.mp4`); return [+EDL[i][0], +(EDL[i + 1]?.[0] ?? EDL[i][1])]; };
const PAL = JSON.parse(fs.readFileSync(`${V}/audio/palavras.json`, 'utf8'));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const pw = (frag, perto) => { const f = norm(frag); let m = null;
  for (const [w, t] of PAL) if (norm(w).startsWith(f) && Math.abs(t - perto) < 4 && (!m || Math.abs(t - perto) < Math.abs(m - perto))) m = t;
  if (m == null) throw new Error(`palavra ${frag} perto de ${perto}`); return m; };
const FONTES = `${V}/midia/fontes`;
const print = f => { const x = fs.readdirSync(FONTES).find(n => n.startsWith(f + '_')); return x && `${FONTES}/${x}`; };
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const MAD = '#b98a5e', MADE = '#8a5e3c', CEU = '#dfe7ea';

const I = {
  casa: `<path d="M-90 -10L0 -90L90 -10" fill="none" ${S6}/><rect x="-70" y="-20" width="140" height="110" fill="${BRANCO}" ${S6}/><path d="M-100 -2L0 -98L100 -2" fill="none" stroke="${VERM}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><rect x="-22" y="30" width="44" height="60" rx="4" fill="${MAD}" ${S6}/><rect x="28" y="0" width="30" height="30" fill="${AZUL}" ${S6}/>`,
  cadeira: `<rect x="-46" y="-110" width="92" height="96" rx="10" fill="${MAD}" ${S6}/><rect x="-58" y="-18" width="116" height="26" rx="6" fill="${MADE}" ${S6}/><path d="M-48 8v96M48 8v96" fill="none" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>`,
  geladeira: `<rect x="-56" y="-100" width="112" height="200" rx="12" fill="${BRANCO}" ${S6}/><path d="M-56 -30h112" fill="none" ${S6}/><path d="M38 -78v30M38 -12v40" fill="none" ${S6}/>`,
  lampada: `<path d="M-40 -10q-10 -70 40 -74q50 4 40 74q-8 20 -14 30h-52q-6 -10 -14 -30z" fill="${AMAR}" ${S6}/><rect x="-26" y="22" width="52" height="34" rx="6" fill="${CINZA}" ${S6}/>`,
  lampadaApagada: `<path d="M-40 -10q-10 -70 40 -74q50 4 40 74q-8 20 -14 30h-52q-6 -10 -14 -30z" fill="#cfcbc3" ${S6}/><rect x="-26" y="22" width="52" height="34" rx="6" fill="${CINZA}" ${S6}/><path d="M-12 -30l10 16l10 -16" fill="none" ${S6}/>`,
  botijao: `<rect x="-24" y="-90" width="48" height="26" rx="6" fill="${CINZA}" ${S6}/><path d="M-60 -50q0 -18 18 -18h84q18 0 18 18v120q0 18 -18 18h-84q-18 0 -18 -18z" fill="${AZUL}" ${S6}/><path d="M-60 0h120" fill="none" ${S6}/>`,
  papelH: `<rect x="-60" y="-70" width="120" height="140" rx="20" fill="${BRANCO}" ${S6}/><ellipse cx="0" cy="-70" rx="60" ry="22" fill="${BRANCO}" ${S6}/><ellipse cx="0" cy="-70" rx="18" ry="7" fill="${CINZA}" ${S6}/>`,
  saco: `<path d="M-60 80q-20 -70 10 -120h100q30 50 10 120z" fill="#3b3e44" ${S6}/><path d="M-30 -40l-14 -36M30 -40l14 -36" fill="none" ${S6}/>`,
  caixa: `<rect x="-80" y="-60" width="160" height="120" rx="6" fill="#c9965f" ${S6}/><path d="M-80 -20h160M-14 -60v40h28v-40" fill="none" ${S6}/>`,
  relogio: `<circle r="80" fill="${BRANCO}" ${S6}/><path d="M0 -50V0L36 22" fill="none" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/>`,
  cesto: `<path d="M-90 -30h180l-20 110h-140z" fill="${MAD}" ${S6}/><path d="M-80 10h160M-74 44h148" fill="none" ${S6}/><path d="M-60 -30q0 -60 60 -60q60 0 60 60" fill="none" ${S6}/><path d="M-40 -34q20 -30 60 -10q20 10 30 10" fill="${AZUL}" ${S6}/>`,
  carrinho: `<path d="M-100 -60h30l26 100h110l20 -76h-142" fill="none" ${S6}/><path d="M-50 -36h132l-16 60h-100z" fill="${AMAR}" ${S6}/><circle cx="-34" cy="70" r="14" fill="${TINTA}"/><circle cx="56" cy="70" r="14" fill="${TINTA}"/>`,
  moeda: `<circle r="60" fill="${AMBAR}" ${S6}/><circle r="40" fill="none" stroke="#b9802a" stroke-width="6"/><path d="M0 -24v48M-14 -12q14 -14 26 0q-26 12 0 24q12 14 -26 0" fill="none" stroke="#7a5418" stroke-width="7" stroke-linecap="round"/>`,
  calendario: `<rect x="-80" y="-70" width="160" height="150" rx="12" fill="${BRANCO}" ${S6}/><rect x="-80" y="-70" width="160" height="40" rx="12" fill="${VERM}" ${S6}/>` + [0, 1, 2, 3].flatMap(i => [0, 1, 2].map(j => `<rect x="${-58 + i * 32}" y="${-14 + j * 30}" width="20" height="18" rx="3" fill="#cfcbc3"/>`)).join(''),
  talheres: `<path d="M-30 -80v60q0 16 12 16v84M-42 -80v40M-18 -80v40" fill="none" ${S6}/><path d="M30 -80q24 20 0 70v90" fill="none" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/>`,
  pincel: `<path d="M-60 70l70 -90" fill="none" stroke="${MADE}" stroke-width="16" stroke-linecap="round"/><path d="M4 -30l26 -36q20 -14 30 -4q10 10 -4 30l-36 26z" fill="${TURQ}" ${S6}/>`,
  ingresso: `<path d="M-90 -50h180v32a18 18 0 0 0 0 36v32h-180v-32a18 18 0 0 0 0 -36z" fill="${AMAR}" ${S6}/><path d="M30 -50v100" fill="none" stroke="${TINTA}" stroke-width="5" stroke-dasharray="10 8"/>`,
  louca: `<ellipse cx="0" cy="40" rx="90" ry="24" fill="${BRANCO}" ${S6}/><ellipse cx="-10" cy="16" rx="80" ry="22" fill="${BRANCO}" ${S6}/><ellipse cx="6" cy="-8" rx="74" ry="20" fill="${BRANCO}" ${S6}/><path d="M40 -30v-50h34v50" fill="${AZUL}" ${S6}/>`,
  sacola: `<path d="M-60 -30h120l10 110h-140z" fill="${VERM}" ${S6}/><path d="M-30 -30q0 -50 30 -50q30 0 30 50" fill="none" ${S6}/>`,
  pote: `<rect x="-80" y="-30" width="160" height="80" rx="14" fill="#e9eef0" ${S6}/><rect x="-86" y="-46" width="172" height="22" rx="8" fill="${TURQ}" ${S6}/><path d="M-60 0q20 -20 40 0t40 0t40 0" fill="none" stroke="${VERM}" stroke-width="10" stroke-linecap="round"/>`,
  predio: `<rect x="-70" y="-90" width="60" height="180" fill="#cfd6db" ${S6}/><rect x="0" y="-40" width="70" height="130" fill="#b9c3ca" ${S6}/>` + [0, 1, 2, 3].map(j => `<rect x="-56" y="${-70 + j * 40}" width="12" height="16" fill="${AMAR}"/><rect x="-32" y="${-70 + j * 40}" width="12" height="16" fill="${AMAR}"/>`).join(''),
  wifi: `<path d="M-70 -20q70 -60 140 0M-46 6q46 -38 92 0M-22 32q22 -18 44 0" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/><circle cy="58" r="12" fill="${TINTA}"/>`,
  raio: `<path d="M14 -90L-46 10h40L-20 90L50 -14h-42z" fill="${AMAR}" ${S6}/>`,
  detergente: `<path d="M-34 -50h68v120q0 14 -14 14h-40q-14 0 -14 -14z" fill="${TURQ}" ${S6}/><path d="M-14 -50v-26h28v26M14 -70h26" fill="none" ${S6}/>`,
  predioCond: `<rect x="-70" y="-90" width="140" height="180" fill="#d8d0c4" ${S6}/>` + [0, 1, 2].flatMap(i => [0, 1, 2, 3].map(j => `<rect x="${-50 + i * 38}" y="${-72 + j * 40}" width="22" height="24" fill="${AZUL}"/>`)).join(''),
  balao: `<path d="M-50 -34h100q20 0 20 20v40q0 20 -20 20h-60l-24 22v-22h-16q-20 0 -20 -20v-40q0 -20 20 -20z" fill="${BRANCO}" ${S6}/>`,
};
const ic = (n, x, y, s = 1, o = {}) => g(I[n] || ICON[n], { x, y, s, ...o });
const card = (n, label, x, y, k, { w = 240, h = 250, cor = BRANCO, s = 1 } = {}) => k <= 0 ? '' :
  g(cartao(w, h, { fill: cor }) + ic(n, 0, -26, .8) + (label ? txt(label, 0, h / 2 - 32, { tam: 34 }) : ''), { x, y: y + (1 - k) * 40, s: s * (.92 + .08 * k), op: k });

const resp = t => Math.sin(t / 3.2 * Math.PI * 2);
const P = (f, o) => prota(t => { const q = f(t);
  return { s: .5, tronco: .6 * resp(t), cab: 0, br: { E: [19, -7, 0], D: [-18, 9, 0] }, pe: { E: [3, -1, -2], D: [-3, 1, 2] }, ...q,
    rosto: { pisca: piscar(t, [1.1, 3.9, 6.6]), ...(q.rosto || {}) } }; }, o);
const triste = { sorriso: -.4, sobr: 4, sobrIn: .8 }, feliz = { sorriso: 1 }, neutro = { sorriso: .3 };

const mostraPrint = (f, cit, w = 1240, legenda) => a => [fundo(), raw('print', t => {
  const p = print(f), k = ent(t, 0, .7);
  const corpo = p ? g(imagem(p, 0, 0, w), { x: 960, y: (legenda ? 450 : 540) + (1 - k) * 40, s: 1 + .04 * clamp(t / 7), op: k }) : fonte(...cit, t, 0);
  return corpo + (legenda ? txt(legenda, 960, 880, { tam: 40, peso: 600, cor: '#555', op: ent(t, .4) }) : ''); })];

const contaThoreau = (a, tudo) => { const L = [['Tábuas', '8,03'], ['Telhas usadas', '4,00'], ['Tijolos', '4,00'], ['Pregos', '3,90'], ['Janelas', '2,43'], ['Transporte', '1,40']], tot = tudo ? -9 : pw('28', 14.6) - a;
  return [fundo(), raw('caderno', t => {
    let s = g(cartao(900, 820, { fill: '#f6f0dc', r: 10 }), { x: 960, y: 540 }) + txt('Casa — 1845', 620, 230, { tam: 44, anc: 'start', cor: '#6b5a3a' });
    L.forEach(([n, v], i) => { const k = tudo ? 1 : ent(t, .2 + i * .28, .4);
      s += g(txt(n, 0, 0, { tam: 46, peso: 600, anc: 'start' }) + txt('US$ ' + v, 640, 0, { tam: 46, peso: 600, anc: 'end' }), { x: 620, y: 320 + i * 66 + (1 - k) * 20, op: k }); });
    s += txt('…', 620, 320 + 6 * 66, { tam: 46, op: tudo ? 1 : ent(t, 2) }) + `<path d="M620 ${740}h640" stroke="${TINTA}" stroke-width="6" opacity="${ent(t, tot - .3)}"/>`;
    const kt = ent(t, tot - .1, .5);
    return s + g(txt('US$ 28,12', 0, 0, { tam: 150, cor: VERM }), { x: 960, y: 880, s: .9 + .1 * kt, op: kt }); })];
};

const janela = (a, abre, fecha, comCal = true) => [fundo(), raw('janela', t => {
  const kf = fecha != null ? io(clamp((t - fecha) / .9)) : 0, ka = abre != null ? 1 - io(clamp((t - abre) / .9)) : 0, k = Math.max(kf, ka);
  let s = `<rect x="610" y="190" width="700" height="620" rx="10" fill="${CEU}" ${S6}/>`;
  if (comCal) s += g(I.calendario, { x: 960, y: 500, s: 1.6 + .03 * Math.sin(t) });
  s += `<path d="M960 190v620M610 500h700" stroke="${MADE}" stroke-width="16"/>`;
  const w = 350 * k; if (w > 1) s += `<rect x="610" y="190" width="${w}" height="620" fill="${MAD}" ${S6}/><rect x="${1310 - w}" y="190" width="${w}" height="620" fill="${MAD}" ${S6}/>` +
    Array.from({ length: 9 }, (_, i) => `<path d="M612 ${240 + i * 64}h${w - 4}M${1312 - w} ${240 + i * 64}h${w - 4}" stroke="${MADE}" stroke-width="5"/>`).join('');
  return s + `<rect x="590" y="170" width="740" height="660" rx="16" fill="none" stroke="${TINTA}" stroke-width="10"/><rect x="560" y="820" width="800" height="40" rx="8" fill="${MAD}" ${S6}/>`;
})];

const tresCards = (a, revela) => { const L = [['geladeira', 'o silêncio', pw('silencio', 75)], ['conta', 'a conta', pw('conta', 76.5)], ['louca', 'a casa', pw('casa', 78)]];
  return [fundo(), raw('três', t => L.map(([n, l, w], i) => { const k = ent(t, i * .15), r = revela ? ent(t, w - a - .15, .45) : 0, x = 480 + i * 480;
    return g(cartao(380, 440, { fill: r > .5 ? BRANCO : '#e2ded6' }) + (r > 0 ? g(I[n] || ICON[n], { s: .95 * r + .05, y: -40 }) + txt(l, 0, 160, { tam: 48, op: r }) : txt('?', 0, 40, { tam: 160, cor: '#bdb8ae' })),
      { x, y: 540 + (1 - k) * 40, s: (.92 + .08 * k) * (1 + .05 * Math.sin(Math.PI * clamp((t - (w - a)) / .5)) * (revela ? 1 : 0)), op: k }); }).join(''))];
};

const semanas = (a, n, cues) => { const C = [['relogio', 'carrinho'], ['conta'], ['cesto', 'moeda'], ['xicara']];
  return [fundo(), raw('semanas', t => C.map((ics, i) => { const x = 330 + i * 420, k = ent(t, i * .1), f = i < n ? (cues[i] == null ? 1 : ent(t, cues[i] - a - .15, .5)) : 0;
    let b = cartao(360, 520, { fill: f > .5 ? BRANCO : '#e2ded6' }) + txt('semana ' + (i + 1), 0, -200, { tam: 40, cor: '#555' });
    if (f > 0) b += ics.map((c, j) => g(I[c] || ICON[c], { x: ics.length > 1 ? (j ? 60 : -60) : 0, y: ics.length > 1 ? (j ? 80 : -40) : 20, s: (ics.length > 1 ? .7 : 1) * f })).join('');
    return g(b, { x, y: 560 + (1 - k) * 40, op: k }); }).join(''))];
};

const barras = (L, x0, y0, { w = 120, h = 520, gap = 200, op = 1 } = {}) => L.map(([l, v, cor, k], i) => g(barra(w, h, v * k, cor), { x: x0 + i * gap, y: y0 }) + txt(l, x0 + i * gap + w / 2, y0 + 60, { tam: 36 })).join('');

const C = {
  M02: mostraPrint('F1', ['Henry David Thoreau', 1854, 'Walden; or, Life in the Woods', 'Ticknor and Fields, Boston'], 1500, 'Henry David Thoreau, Walden (1854)'),
  M03: a => [fundo(), raw('tábuas', t => {
    let s = `<path d="M560 860H1360" stroke="${TINTA}" stroke-width="6"/>`;
    for (let i = 0; i < 7; i++) { const k = out(clamp((t - i * .12) / .35)); s += g(`<rect x="-260" y="-26" width="520" height="52" rx="6" fill="${i % 2 ? MAD : '#c49a6c'}" ${S6}/>`, { x: 960, y: 830 - i * 56 - (1 - k) * 300, op: k }); }
    const kt = out(clamp((t - .95) / .4));
    return s + g(`<path d="M-320 0L0 -200L320 0Z" fill="${MADE}" ${S6}/>`, { x: 960, y: 440 - (1 - kt) * 200, op: kt }); })],
  M04: a => contaThoreau(a, false),
  M05: a => { const L = [['2', 'anos', pw('anos', 18.6)], ['2', 'meses', pw('meses', 20)], ['2', 'dias', pw('dias', 21)]];
    return [fundo(), raw('contador', t => L.map(([n, l, w], i) => { const k = ent(t, w - a - .25, .45);
      return g(cartao(420, 460) + txt(n, 0, 40, { tam: 220, cor: TURQ }) + txt(l, 0, 160, { tam: 56 }), { x: 480 + i * 480, y: 540 + (1 - k) * 40, s: .92 + .08 * k, op: k }); }).join('') +
      txt('4 de julho de 1845', 960, 170, { tam: 50, peso: 600, cor: '#555', op: ent(t, 0) }))];
  },
  M08: a => { const ac = pw('cinco', 33.5) - a;
    return [fundo(), raw('casas', t => { let s = '';
      for (let i = 0; i < 25; i++) { const r = Math.floor(i / 5), c = i % 5, on = c === (r * 2) % 5, k = ent(t, i * .03, .4), l = on ? ent(t, ac - .1 + r * .08, .4) : 0;
        s += g(g(I.casa, { s: .7 }) + (l > 0 ? `<rect x="-36" y="-12" width="72" height="66" fill="${AMAR}" opacity="${.55 * l}"/>` : ''), { x: 220 + c * 190, y: 170 + r * 185 + (1 - k) * 30, op: k * (on || t < ac ? 1 : .45 + .55 * (1 - ent(t, ac, .5))) }); }
      return s + txt('1 em cada 5 lares', 1460, 520, { tam: 56, op: ent(t, ac + .3) }) + txt('tem um morador só', 1460, 600, { tam: 44, peso: 400, op: ent(t, ac + .5) }); })];
  },
  M09: a => { const am = pw('milhoes', 40.2) - a;
    return [fundo(), raw('ibge', t => { const p = print('F2'), k = ent(t, 0, .7);
      const f = p ? g(imagem(p, 0, 0, 1000), { x: 960, y: 360, op: k }) : g(cartao(1180, 300, { r: 10 }) + txt('IBGE — Censo Demográfico 2022', -540, -50, { tam: 46, anc: 'start' }) +
        txt('Composição domiciliar e óbitos informados', -540, 20, { tam: 40, peso: 400, anc: 'start', cor: '#555' }) + txt('domicílios com um morador', -540, 80, { tam: 40, peso: 400, anc: 'start', cor: '#555' }), { x: 960, y: 340 + (1 - k) * 40, op: k });
      const kn = ent(t, am - .3, .5);
      return f + g(txt('13,7 milhões', 0, 0, { tam: 170, cor: TURQ }), { x: 960, y: 820, s: .9 + .1 * kn, op: kn }); })];
  },
  M10: a => [fundo(), raw('2010-2022', t => { const k1 = io(clamp((t - .2) / .8)), k2 = io(clamp((t - .9) / 1));
    return g(barra(220, 600, .122 / .2 * .9 * k1, CINZA), { x: 620, y: 800 }) + g(barra(220, 600, .189 / .2 * .9 * k2, TURQ), { x: 1080, y: 800 }) +
      txt('2010', 730, 870, { tam: 48 }) + txt('2022', 1190, 870, { tam: 48 }) + txt('12,2%', 730, 800 - 600 * .55 * k1 - 30, { tam: 64, op: k1 }) + txt('18,9%', 1190, 800 - 600 * .85 * k2 - 30, { tam: 80, cor: TURQ, op: k2 }); })],
  M12: a => janela(a, null, null),
  M13: a => janela(a, null, pw('fecha', 56.3) - a - .2),
  M14: a => { const like = pw('like', 63.5) - a, insc = pw('inscreve', 64.3) - a;
    return [fundo(), raw('caixa', t => g(I.caixa, { x: 330, y: 810, s: 1.2 })),
      P(t => { const k = io(clamp((t - .4) / .6));
        return { pos: [560, 560], s: .62, br: { E: [19, -7, 0], D: [lerp(-18, -88, k), lerp(9, -4, k), 0] }, mao: { D: k > .5 ? 'aponta' : 'costas' }, rosto: { ...feliz, gx: 8 * k } }; }),
      raw('botões', t => {
        const kl = ent(t, like - .1, .35), ki = ent(t, insc, .35), pl = 1 - .06 * Math.sin(Math.PI * clamp((t - like) / .3)), pi = 1 - .06 * Math.sin(Math.PI * clamp((t - insc) / .3));
        const b1 = `<rect x="-200" y="-64" width="400" height="128" rx="64" fill="${kl > .5 ? TURQ : BRANCO}" ${S6}/>` + g(ICON.like, { x: -110, y: 4, s: .7 }) + txt('Gostei', 40, 22, { tam: 52, cor: kl > .5 ? BRANCO : TINTA });
        const b2 = `<rect x="-240" y="-64" width="480" height="128" rx="64" fill="${ki > .5 ? '#cfcac2' : VERM}" ${S6}/>` + txt(ki > .5 ? 'Inscrito' : 'Inscrever-se', ki > .5 ? 20 : 0, 22, { tam: 52, cor: ki > .5 ? TINTA : BRANCO }) + (ki > .5 ? g(ICON.sino, { x: -150, y: 0, s: .7 }) : '');
        return surge(b1, t, .3, { x: 1360, y: 440, s: pl }) + surge(b2, t, .6, { x: 1360, y: 650, s: pi }); })];
  },
  M15: a => tresCards(a, false),
  M16: a => tresCards(a, true),
  M24: a => [fundo(), P(t => ({ pos: [620, 560], s: .62, cab: -4, rosto: { ...triste, gx: 10, gy: -8 } })),
    raw('pensa', t => surge(g(nuvem(560, 400, [-1, 1])) + g(I.casa, { y: -10, s: 1.3 }) + `<path d="M0 -150c-20 -30 -60 -10 -40 20l40 36l40 -36c20 -30 -20 -50 -40 -20z" fill="${VERM}" ${S6}/>`, t, .3, { x: 1260, y: 330 }))],
  M25: a => [fundo(), raw('estrada', t => { const u = io(clamp((t - .3) / 4));
    return `<path d="M380 760Q960 600 1540 760" fill="none" stroke="#c9c5bd" stroke-width="14" stroke-dasharray="30 24"/>` + ic('casa', 330, 640, 1.3) + ic('capelo', 1580, 600, 1.6) + ic('predio', 1580, 760, 1) +
      g(`<circle r="34" fill="${TURQ}" ${S6}/><circle cy="-60" r="30" fill="#d8d8d8" ${S6}/><rect x="-46" y="-30" width="34" height="60" rx="10" fill="${AMBAR}" ${S6}/>`, { x: lerp(440, 1450, u), y: 700 - Math.sin(Math.PI * u) * 110 - Math.abs(Math.sin(t * 9)) * 8 }); })],
  M26: mostraPrint('F3', ['Christopher Thurber e Edward Walton', 2012, 'Homesickness and adjustment in university students', 'Journal of American College Health, 60(5), 415–419']),
  M28: a => { const L = [['casa', -1, -1], ['predio', 1, -1], ['conta', -1, 1], ['relogio', 1, 1]];
    return [fundo(), P(t => ({ pos: [960, 560], s: .55, rosto: { sorriso: -.2, sobr: 6, sobrIn: .4, gx: 8 * Math.sin(t * 3) } })),
      raw('setas', t => L.map(([n, sx, sy], i) => { const u = io(clamp((t - i * .15) / .9)), x = 960 + sx * lerp(820, 420, u), y = 540 + sy * lerp(440, 260, u);
        return ic(n, x, y, .9, { op: clamp(u * 2) }) + `<path d="M${x - sx * 100} ${y - sy * 60}L${960 + sx * 300} ${540 + sy * 170}" stroke="${AMBAR}" stroke-width="10" stroke-linecap="round" opacity="${u}"/>`; }).join(''))];
  },
  M29: a => [fundo(), raw('alguém', t => { const k = ent(t, .3, .7);
    return g(I.casa, { x: 800, y: 560, s: 4 }) + g(`<circle cy="-120" r="56" fill="#9aa3a8"/><path d="M-80 120q0 -170 80 -170q80 0 80 170z" fill="#9aa3a8"/>`, { x: 1560, y: 600, op: .55 * k }) + txt('alguém', 1560, 860, { tam: 52, cor: '#6d7479', op: k }); })],
  M30: a => { const L = [['papelH', pw('higienico', 13.8 + 120)], ['botijao', pw('gas', 15.6 + 120)], ['saco', pw('lixo', 17.6 + 120)]];
    return [fundo(), raw('tarefas', t => g(I.casa, { x: 960, y: 300, s: 1.6 }) + g(`<circle cy="-60" r="28" fill="#9aa3a8"/><path d="M-40 60q0 -85 40 -85q40 0 40 85z" fill="#9aa3a8"/>`, { x: 1180, y: 330, op: .55 }) +
      L.map(([n, w], i) => card(n, i === 2 ? 'quinta' : '', 560 + i * 400, 760, ent(t, w - a - .15, .45))).join(''))];
  },
  M31: a => [fundo(), P(t => ({ pos: [960, 540], s: .6, br: { E: [40, -60, 0], D: [-40, 60, 0] }, rosto: { sorriso: -.1, sobr: 5, gy: 10 } })),
    raw('pilha', t => ['saco', 'botijao', 'papelH'].map((n, i) => { const u = out(clamp((t - .2 - i * .25) / .45));
      return ic(n, 1220, lerp(-150, 860 - i * 112, u), .65, { r: (1 - u) * 30 * (i - 1) }); }).join(''))],
  M33: a => [fundo(), raw('aluguel', t => surge(cartao(560, 640) + g(I.casa, { y: -110, s: 1.3 }) + txt('aluguel', 0, 110, { tam: 70 }) + txt('todo dia 10', 0, 200, { tam: 40, peso: 400, cor: '#555' }), t, .1, { x: 960, y: 540 }))],
  M34: a => { const L = [['predioCond', 'condomínio', pw('condominio', 147.2)], ['raio', 'luz', pw('luz', 148.6)], ['wifi', 'internet', pw('internet', 149.5)], ['botijao', 'gás', pw('gas', 150.6)],
      ['carrinho', 'mercado', pw('mercado', 151.5)], ['detergente', 'detergente', pw('detergente', 152.5)], ['saco', 'saco de lixo', pw('saco', 153.8)], ['lampada', 'lâmpada', pw('lampada', 155.2)]];
    return [fundo(), raw('contas', t => L.map(([n, l, w], i) => { const k = ent(t, w - a - .2, .4), lamp = i === 7, apaga = lamp && t > w - a + 1.2;
      const pisc = lamp && t > w - a + .6 && t < w - a + 1.2 && Math.sin(t * 60) > 0;
      return card(lamp && (apaga || pisc) ? 'lampadaApagada' : n, l, 300 + (i % 4) * 440, 320 + Math.floor(i / 4) * 420, k, { w: 340, h: 340, s: 1 }); }).join(''))];
  },
  M35: a => { const a30 = pw('30', 161.5) - a;
    return [fundo(), raw('renda', t => { const k = io(clamp((t - .2) / .7)), h = ent(t, a30 - .2, .5);
      return txt('sua renda', 260, 400, { tam: 52, anc: 'start', op: ent(t, 0) }) + g(barraH(1400, 120, k, '#cfcbc3'), { x: 260, y: 540 }) +
        (h > 0 ? `<rect x="260" y="480" width="${420 * h}" height="120" rx="60" fill="${AMBAR}" ${S6}/>` + txt('30%', 470, 560, { tam: 72, op: h }) + txt('aluguel', 470, 690, { tam: 48, op: h }) : ''); })];
  },
  M36: a => { const am = pw('margem', 166.2) - a;
    return [fundo(), raw('lei', t => { const r = clamp((t - .35) / .4), k2 = ent(t, am - .2, .45);
      return g(txt('lei', 0, 0, { tam: 160, cor: '#888' }) + `<path d="M-160 -50L${-160 + 320 * r} ${-50 + 20 * r}" stroke="${VERM}" stroke-width="16" stroke-linecap="round"/>`, { x: 620, y: 600 }) +
        g(txt('margem', 0, 0, { tam: 170, cor: TURQ }), { x: 1260, y: 600 + (1 - k2) * 40, op: k2 }); })];
  },
  M37: a => { const a70 = pw('70', 170.5) - a, L = ['predioCond', 'raio', 'wifi', 'botijao', 'carrinho', 'detergente', 'saco', 'lampada'];
    return [fundo(), raw('setenta', t => { let s = `<rect x="260" y="480" width="420" height="120" rx="60" fill="${AMBAR}" ${S6}/>` + txt('30%', 470, 560, { tam: 72 }) +
      `<rect x="680" y="480" width="980" height="120" rx="20" fill="#e2ded6" ${S6}/>` + txt('70%', 1170, 690, { tam: 64, op: ent(t, a70 - .2) });
      L.forEach((n, i) => { const k = out(clamp((t - .3 - i * .22) / .35)); s += ic(n, 740 + i * 120 + Math.sin(t * 8 + i) * 3 * k, lerp(200, 540, k), .5, { op: k }); });
      return s; })];
  },
  M38: a => contaThoreau(a, true),
  M41: a => [fundo(), raw('planilha', t => { const R = [['aluguel', 'carrinho'], ['mercado', 'carrinho'], ['luz e gás', 'raio'], ['delivery', 'sacola']];
    let s = g(cartao(1000, 680, { r: 12 }), { x: 860, y: 540 }) + txt('mês 1', 420, 290, { tam: 50, anc: 'start' }) + `<path d="M380 320h960" stroke="#ccc" stroke-width="4"/>`;
    R.forEach(([l], i) => { const k = ent(t, .2 + i * .2, .35); s += g(txt(l, 0, 0, { tam: 46, peso: 600, anc: 'start' }) + `<rect x="420" y="-34" width="${[300, 240, 180, 360][i]}" height="40" rx="10" fill="${i === 3 ? VERM : '#cfcbc3'}"/>`, { x: 420, y: 400 + i * 100, op: k }); });
    const u = clamp((t - 1.6) / 1.4);
    return s + ic('moeda', 1500 + u * 120, 700 + 360 * u * u, .7, { op: u > 0 ? 1 : 0, r: 200 * u }) + `<circle cx="1350" cy="700" r="${22 * ent(t, 1.3)}" fill="${TINTA}"/>`; })],
  M44: mostraPrint('F4', ['Kahneman, Krueger, Schkade, Schwarz e Stone', 2004, 'A survey method for characterizing daily life experience: the day reconstruction method', 'Science, 306(5702), 1776–1780']),
  M45: a => { const a9 = pw('909', 201) - a;
    return [fundo(), raw('909', t => { const u = io(clamp((t - Math.max(0, a9 - .4)) / 1.6)), n = Math.round(909 * u); let s = '';
      for (let i = 0; i < n; i++) { const c = i % 38, r = Math.floor(i / 38); s += `<circle cx="${360 + c * 32}" cy="${110 + r * 28}" r="10" fill="${i % 7 ? '#8c8f94' : TURQ}"/>`; }
      return s + txt(n + ' mulheres', 960, 830, { tam: 64, op: ent(t, a9 - .3) }) + txt('que trabalhavam, no Texas', 960, 895, { tam: 40, peso: 400, cor: '#555', op: ent(t, a9 + .4) }); })];
  },
  M46: a => [fundo(), raw('dia', t => { const B = [[TURQ, 120], [AMAR, 200], ['#cfcbc3', 260], [AZUL, 160], [VERM, 140], [AMBAR, 220], [TURQ, 180]]; let x = 280, s = txt('ontem', 280, 420, { tam: 52, anc: 'start' });
    B.forEach(([c, w], i) => { const k = out(clamp((t - i * .14) / .3)); s += `<rect x="${x}" y="480" width="${w * k}" height="120" fill="${c}" ${S6}/>`; x += w; });
    return s + txt('7h', 280, 670, { tam: 36, anc: 'start' }) + txt('23h', 1640, 670, { tam: 36, anc: 'end' }); })],
  M47: a => { const L = [['socializar', .95], ['relaxar', .85], ['comer', .8], ['ver TV', .72], ['trabalho doméstico', .3], ['trânsito', .22]], ad = pw('domestico', 211.6) - a, at = pw('transito', 215.6) - a;
    return [fundo(), raw('ranking', t => L.map(([l, v], i) => { const k = io(clamp((t - i * .12) / .6)), baixo = i >= 4, h = baixo ? ent(t, (i === 4 ? ad : at) - .2, .4) : 0;
      return g(txt(l, -20, 18, { tam: 46, peso: baixo ? 700 : 500, anc: 'end', cor: baixo && h > .5 ? VERM : TINTA }) + barraH(900, 60, v * k, baixo ? (h > .5 ? VERM : CINZA) : TURQ), { x: 820, y: 210 + i * 130 + (i >= 4 ? 40 : 0), op: ent(t, i * .1) }); }).join('') +
      txt('quanto gostavam', 1270, 120, { tam: 40, peso: 400, cor: '#555', op: ent(t, 0) }) + txt('...', 1300, 705, { tam: 50, op: ent(t, .5) }))];
  },
  M49: a => [fundo(), raw('medidor', t => { const k = clamp(1 - io(clamp((t - 1.2) / 1.6)) * .8);
    const ang = -80 + 160 * k, cx = 1240, cy = 700;
    return ic('louca', 520, 600, 1.8) + `<path d="M${cx - 300} ${cy}A300 300 0 0 1 ${cx + 300} ${cy}" fill="none" stroke="#e2ded6" stroke-width="60"/><path d="M${cx - 300} ${cy}A300 300 0 0 1 ${cx - 212} ${cy - 212}" fill="none" stroke="${VERM}" stroke-width="60"/><path d="M${cx + 212} ${cy - 212}A300 300 0 0 1 ${cx + 300} ${cy}" fill="none" stroke="${TURQ}" stroke-width="60"/>` +
      g(`<path d="M0 0V-250" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/><circle r="26" fill="${TINTA}"/>`, { x: cx, y: cy, r: ang }) + txt('prazer', cx, cy + 90, { tam: 48 }); })],
  M50: a => [fundo(), raw('casa', t => `<path d="M260 380L960 90L1660 380" fill="none" stroke="${VERM}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`),
    ...[[480, null, 'louca'], [800, { pers: 'feminina', nome: 'mae' }, 'cesto'], [1120, { nome: 'pai' }, 'carrinho'], [1440, { pers: 'feminina', variante: 'ruiva', nome: 'irma' }, 'saco']].flatMap(([x, o, n], i) => [
      P(t => ({ pos: [x, 560], s: .36, rosto: neutro }), o || { nome: 'b' + i }), raw('t' + i, t => ic(n, x, 870 - 30 * ent(t, .3 + i * .15), .6, { op: ent(t, .3 + i * .15) }))])],
  M51: a => [fundo(), P(t => ({ pos: [960, 520], s: .5, cab: 4 * ent(t, 1.2), rosto: { sorriso: -.3, sobr: 5, sobrIn: .8, gy: 8 } })),
    raw('chovem', t => ['louca', 'cesto', 'carrinho', 'saco'].map((n, i) => { const u = io(clamp((t - .2 - i * .2) / .7)), x0 = [480, 800, 1120, 1440][i];
      return ic(n, lerp(x0, 960 + (i - 1.5) * 90, u), lerp(950, 930 - (i % 2) * 40, u) - Math.sin(Math.PI * u) * 260, .6); }).join(''))],
  M52: a => { const ap = pw('paises', 243) - a;
    return [...mostraPrint('F5', ['Whillans, Dunn, Smeets, Bekkers e Norton', 2017, 'Buying time promotes happiness', 'PNAS, 114(32), 8523–8527'])(a),
      raw('países', t => ['EUA', 'Canadá', 'Dinamarca', 'Holanda'].map((p, i) => surge(`<rect x="-150" y="-44" width="300" height="88" rx="44" fill="${AMAR}" ${S6}/>` + txt(p, 0, 16, { tam: 40 }), t, ap - .2 + i * .12, { x: 420 + i * 360, y: 860 })).join(''))];
  },
  M53: a => { const at = pw('tempo', 246.6) - a, al = pw('limpar', 249) - a;
    return [fundo(), raw('troca', t => { const k = ent(t, at - .2, .5), kc = ent(t, al - .2, .5);
      return ic('moeda', 520, 460, 1.6) + `<path d="M700 460h${400 * k}" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/><path d="M${1080 * k + 20 * (1 - k)} 430l30 30l-30 30" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="${k}"/>` +
        ic('relogio', 1340, 460, 1.6 * (.9 + .1 * k), { op: k }) + surge(g(I.cesto, { s: 1 }) + txt('alguém limpa por você', 0, 150, { tam: 40 }), t, al - .2, { x: 960, y: 730 }) ; })];
  },
  M54: a => { const ar = pw('renda', 255.8) - a;
    return [fundo(), raw('satisfação', t => { const k = io(clamp((t - .5) / 1.6));
      return txt('satisfação com a vida', 960, 150, { tam: 52, op: ent(t, 0) }) + barras([['renda baixa', .45, '#cfcbc3', 1], ['renda média', .5, '#cfcbc3', 1], ['renda alta', .55, '#cfcbc3', 1]], 560, 760, { w: 140, h: 520, gap: 300 }) +
        [0, 1, 2].map(i => `<rect x="${560 + i * 300}" y="${760 - 520 * (.45 + .05 * i + .2 * k)}" width="140" height="${520 * .2 * k}" fill="${TURQ}" ${S6}/>`).join('') +
        txt('quem compra tempo: mais satisfeito', 960, 900, { tam: 40, peso: 600, cor: TURQ, op: ent(t, ar - .3) }); })];
  },
  M55: a => { const a4 = pw('40', 260) - a;
    return [fundo(), raw('40', t => { const k = io(clamp((t - a4 - .6) / .8));
      return g(`<rect x="-260" y="-120" width="520" height="240" rx="18" fill="#9fd1a5" ${S6}/>` + txt('US$ 40', 0, 24, { tam: 80 }), { x: 960, y: 340, s: 1 - .2 * k }) +
        [0, 1].map(i => g(I.calendario, { x: lerp(960, i ? 1360 : 560, k), y: 680, s: 1.4 * k, op: k }) + txt(i ? 'fim de semana 2' : 'fim de semana 1', i ? 1360 : 560, 880, { tam: 40, op: k })).join(''); })];
  },
  M56: a => { const at = pw('tempo', 267) - a;
    return [fundo(), raw('compras', t => g(cartao(520, 560), { x: 560, y: 540 }) + g(cartao(520, 560), { x: 1360, y: 540 }) + txt('fim de semana 1', 560, 330, { tam: 40 }) + txt('fim de semana 2', 1360, 330, { tam: 40 }) +
      surge(g(I.sacola, { s: 1.6 }), t, .1, { x: 560, y: 580 }) + surge(g(I.relogio, { s: 1.6 }), t, at - .2, { x: 1360, y: 580 }))];
  },
  M57: a => [fundo(), raw('rel', t => ic('relogio', 1400, 360, 1.2) + ic('sacola', 480, 560, .9, { op: .5 })),
    P(t => ({ pos: [960, 560], s: .6, br: { E: [19, -7, 0], D: [lerp(-18, -150, io(clamp((t - .4) / .5))), lerp(9, -30, io(clamp((t - .4) / .5))), 0] }, mao: { D: t > .7 ? 'joinha' : 'costas' }, rosto: { sorriso: .4 + .7 * ent(t, .3), sobr: 5 * ent(t, .3) } }))],
  M58: a => [fundo(), raw('diarista', t => { const r = clamp((t - 1) / .45);
    return g(txt('diarista', 0, -40, { tam: 120 }) + txt('toda semana', 0, 80, { tam: 80, peso: 400 }) + `<path d="M-380 -10L${-380 + 760 * r} ${10 + 20 * r}" stroke="${VERM}" stroke-width="18" stroke-linecap="round"/>`, { x: 960, y: 560, op: ent(t, 0) }); })],
  M59: a => [fundo(), raw('lavanderia', t => surge(cartao(620, 640) + g(I.cesto, { y: -60, s: 1.6 }) + txt('lavanderia', 0, 170, { tam: 60 }) + txt('1× por mês', 0, 250, { tam: 46, peso: 400, cor: TURQ }), t, .05, { x: 960, y: 540 }))],
  M61: a => { const as = pw('sai', 283.8) - a, L = ['louca', 'cesto', 'carrinho', 'conta'];
    return [fundo(), P(t => ({ pos: [560, 560], s: .55, rosto: { sorriso: .2 + .6 * ent(t, as), gx: 10, gy: -6 } })),
      raw('lista', t => g(nuvem(640, 520, [-1, 1]), { x: 1240, y: 420 }) + L.map((n, i) => { const sai1 = i === 2, u = sai1 ? io(clamp((t - as) / .8)) : 0;
        return ic(n, 1110 + (i % 2) * 260 + u * 700, 320 + Math.floor(i / 2) * 200 - u * 300, .6, { op: 1 - u, r: u * 40 }); }).join(''))];
  },
  M63: mostraPrint('F6', ['Eric Klinenberg', 2012, 'Going Solo: The Extraordinary Rise and Surprising Appeal of Living Alone', 'Penguin Press'], 420, 'Eric Klinenberg, Going Solo (2012) · mais de 300 entrevistas'),
  M64: a => [fundo(), raw('300', t => { const n = Math.round(300 * io(clamp(t / 3))); let s = '';
    for (let i = 0; i < n; i++) { const c = i % 25, r = Math.floor(i / 25); s += g(I.balao, { x: 220 + c * 62, y: 110 + r * 56, s: .36 }); }
    return s + txt('300 pessoas que moram sozinhas', 960, 880, { tam: 52, op: ent(t, 1) }); })],
  M65: a => [fundo(), P(t => ({ pos: [520, 470], s: .4, rosto: feliz }), { nome: 'só' }), P(t => ({ pos: [1260, 470], s: .4, rosto: neutro }), { nome: 'c1' }), P(t => ({ pos: [1460, 470], s: .4, rosto: neutro }), { pers: 'feminina', nome: 'c2' }),
    raw('barras', t => { const k = io(clamp((t - .8) / 1.2));
      return txt('mora sozinho', 520, 750, { tam: 44 }) + txt('casados', 1360, 750, { tam: 44 }) + g(barraH(560, 50, .9 * k, TURQ), { x: 240, y: 820 }) + g(barraH(560, 50, .55 * k, CINZA), { x: 1080, y: 820 }) +
        txt('tempo com amigos e vizinhos', 960, 900, { tam: 36, peso: 400, cor: '#555', op: ent(t, .6) }); })],
  M66: a => { const L = [['talheres', 'comer fora', pw('come', 307.9)], ['pincel', 'aula', pw('aula', 309.6)], ['ingresso', 'eventos', pw('eventos', 310.6)]];
    return [fundo(), raw('ícones', t => L.map(([n, l, w], i) => card(n, l, 480 + i * 480, 540, ent(t, w - a - .2, .4), { w: 340, h: 380 })).join(''))];
  },
  M67: a => [fundo(), raw('≠', t => txt('morar sozinho', 960, 400, { tam: 96, op: ent(t, 0) }) + g(txt('≠', 0, 0, { tam: 150, cor: VERM }), { x: 960, y: 590, s: .6 + .4 * ent(t, .5), op: ent(t, .5) }) + txt('estar sozinho', 960, 780, { tam: 96, op: ent(t, .9) }))],
  M68: a => { const ag = pw('agora', 319.2) - a;
    return [fundo(), raw('pessoas', t => { let s = ic('casa', 960, 560, 2.4); const vira = clamp((t - (ag - .5)) / .6);
      for (let i = 0; i < 5; i++) { const ang = (i / 5) * Math.PI * 2 + .3, ch = vira > 0 ? 1 - io(clamp((t - .4 - i * .1) / 1.6)) * (1 - vira) : clamp(1 - io(clamp((t - .4 - i * .1) / 1.6))) ;
        const r = 260 + 360 * (vira > 0 ? 1 : ch), x = 960 + Math.cos(ang) * r * 1.3, y = 560 + Math.sin(ang) * r * .75;
        s += g(`<circle cy="-40" r="26" fill="${[TURQ, AMBAR, AZUL, VERM, AMAR][i]}" ${S6}/><path d="M-34 40q0 -56 34 -56q34 0 34 56z" fill="${[TURQ, AMBAR, AZUL, VERM, AMAR][i]}" ${S6}/>`, { x, y }); }
      return s + (vira > 0 ? g(`<path d="M0 0h200" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/><path d="M180 -24l30 24l-30 24" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`, { x: 1180, y: 560, op: vira }) + txt('ir buscar', 1300, 680, { tam: 48, op: vira }) : ''); })];
  },
  M70: a => janela(a, .5, null),
  M71: mostraPrint('F7', ['Bas Verplanken e Deborah Roy', 2016, 'Empowering interventions to promote sustainable lifestyles: testing the habit discontinuity hypothesis in a field experiment', 'Journal of Environmental Psychology, 45, 127–134'], 1000),
  M72: a => [fundo(), raw('800', t => { let s = ''; const h = ent(t, .6, .5);
    for (let i = 0; i < 800; i++) { const c = i % 40, r = Math.floor(i / 40), mud = c < 20; s += `<rect x="${300 + c * 33}" y="${110 + r * 30}" width="24" height="24" rx="4" fill="${mud ? (h > .5 ? AMBAR : '#8c8f94') : '#8c8f94'}" opacity="${clamp(t * 3 - i / 400)}"/>`; }
    return s + txt('800 casas', 960, 790, { tam: 60, op: ent(t, .3) }) + txt('metade acabou de se mudar', 960, 870, { tam: 44, peso: 400, cor: AMBAR, op: h }); })],
  M73: a => [fundo(), raw('campanha', t => { const k = io(clamp((t - .4) / 1.4));
    return txt('a mesma campanha para mudar hábitos', 960, 150, { tam: 48, op: ent(t, 0) }) + barras([['se mudou', .85, AMBAR, k], ['não se mudou', .4, CINZA, k]], 640, 840, { w: 220, h: 560, gap: 420 }) +
      txt('funcionou mais', 750, 840 - 560 * .85 * k - 70, { tam: 44, cor: AMBAR, op: ent(t, 1.6) }); })],
  M74: a => { const am = pw('meses', 346) - a;
    return [...janela(a, null, null, false), raw('3', t => { const k = ent(t, am - .4, .5);
      return g(cartao(420, 480) + txt('3', 0, 60, { tam: 300, cor: AMBAR }) + txt('meses', 0, 170, { tam: 80 }), { x: 960, y: 420, s: .9 + .1 * k, op: k }); })];
  },
  M75: a => { const ab = pw('bons', 351.6) - a, ar = pw('ruins', 352.6) - a;
    return [fundo(), raw('cimento', t => { const d = clamp((t - .5) / 2.5);
      let s = `<rect x="200" y="250" width="1520" height="560" rx="20" fill="${lerp(0, 1, d) > .5 ? '#a8a49c' : '#c9c5bd'}" ${S6}/>`;
      for (let i = 0; i < 6; i++) { const bom = i % 2 === 0, x = 340 + i * 230, y = 560 + (bom ? -60 : 60);
        s += g(`<ellipse rx="40" ry="66" fill="#8e8a82"/><circle cx="-26" cy="-84" r="12" fill="#8e8a82"/><circle cx="0" cy="-92" r="12" fill="#8e8a82"/><circle cx="26" cy="-84" r="12" fill="#8e8a82"/>`, { x, y, r: bom ? -8 : 8, op: ent(t, .1 + i * .12) }) +
          g(bom ? ICON.check : `<circle r="40" fill="${VERM}" ${S6}/><path d="M-16 -16l32 32M16 -16l-32 32" stroke="${BRANCO}" stroke-width="12" stroke-linecap="round"/>`, { x: x + 70, y: y - 90, s: bom ? .5 : 1, op: ent(t, bom ? ab - .2 : ar - .2) }); }
      return s + txt(d > .9 ? 'endureceu' : 'secando…', 960, 900, { tam: 52, cor: '#555', op: ent(t, .3) }); })];
  },
  M76: a => { const aa = pw('anos', 359) - a;
    return [fundo(), raw('linha', t => { const k = io(clamp((t - .3) / .9)), k2 = ent(t, aa - .3, .5);
      return `<rect x="200" y="460" width="${1100 * k}" height="160" rx="20" fill="${AMBAR}" ${S6}/>` + txt('3 meses', 750, 565, { tam: 80, op: k }) +
        `<rect x="1320" y="490" width="${400 * k2}" height="100" rx="12" fill="#cfcbc3" ${S6}/>` + txt('3 anos', 1520, 560, { tam: 50, op: k2 }) +
        txt('mudar agora custa menos', 960, 820, { tam: 48, peso: 400, cor: '#555', op: ent(t, aa + .5) }); })];
  },
  M77: a => { const ad = pw('delivery', 363.5) - a;
    return [fundo(), raw('balança', t => { const tilt = -10 * io(clamp((t - ad) / .8)) + 2 * Math.sin(t * 2) * (1 - ent(t, ad));
      const pr = (x, n, l) => `<path d="M${x} 0v120" stroke="${TINTA}" stroke-width="6"/><path d="M${x - 150} 120h300q-20 60 -150 60q-130 0 -150 -60z" fill="${CINZA}" ${S6}/>` + g(I[n], { x, y: 40, s: .9 }) + txt(l, x, 260, { tam: 44 });
      return txt('domingo', 960, 160, { tam: 60, op: ent(t, 0) }) + `<path d="M960 300v560M820 860h280" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>` +
        g(`<path d="M-480 0h960" stroke="${TINTA}" stroke-width="14" stroke-linecap="round"/>` + pr(-460, 'carrinho', 'mercado') + pr(460, 'sacola', 'delivery'), { x: 960, y: 320, r: tilt }); })];
  },
  M80: a => semanas(a, 0, []),
  M81: a => semanas(a, 1, [pw('mercado', 374)]),
  M83: a => semanas(a, 3, [null, null, pw('paga', 378.5)]),
  M86: a => [fundo(), P(t => ({ pos: [600, 540], s: .55, cab: 3, rosto: { gx: 10, sorriso: .1 + .4 * ent(t, 3), ...fala(t, [[.6, 2.2]]) } })),
    P(t => ({ pos: [1320, 540], s: .55, cab: -3, rosto: { gx: -10, sorriso: .7, ...fala(t, [[2.6, 4.2]]) } }), { pers: 'feminina', nome: 'profissional' }),
    raw('falas', t => [[t > .6 && t < 2.4, 820, 230, 1], [t > 2.6 && t < 4.4, 1100, 230, -1]].map(([on, x, y]) => on ? g(`<rect x="-110" y="-60" width="220" height="120" rx="40" fill="${BRANCO}" ${S6}/>` +
      [0, 1, 2].map(j => `<circle cx="${-46 + j * 46}" cy="0" r="12" fill="${TINTA}" opacity="${.3 + .7 * (Math.sin(t * 6 - j) > 0)}"/>`).join(''), { x, y }) : '').join(''))],
  M88: a => { const L = [['solidão', pw('solidao', 399.5)], ['amizade', pw('amizade', 400.9)], ['sociedade', pw('sociedade', 402.7)]];
    return [fundo(), raw('cadeiras', t => L.map(([l, w], i) => { const k = ent(t, i * .12), kl = ent(t, w - a - .2, .4), x = 520 + i * 440;
      return g(I.cadeira, { x, y: 500 + (1 - k) * 30, s: 2.2, op: k }) + g(txt(String(i + 1), 0, 0, { tam: 90, cor: AMBAR }), { x, y: 200, op: kl }) + txt(l, x, 850, { tam: 56, op: kl }); }).join(''))];
  },
  M90: a => [fundo(), raw('trilha', t => {
    let s = `<path d="M420 760Q960 520 1500 620" fill="none" stroke="#c9b48f" stroke-width="40" stroke-linecap="round"/>` + g(`<rect x="-120" y="-60" width="240" height="140" fill="${MAD}" ${S6}/><path d="M-150 -50L0 -150L150 -50Z" fill="${MADE}" ${S6}/><rect x="-26" y="10" width="52" height="70" fill="${MADE}" ${S6}/>`, { x: 380, y: 680 }) +
      ic('predio', 1580, 560, 1.4) + txt('Concord', 1580, 740, { tam: 40 });
    for (let i = 0; i < 3; i++) { const u = clamp((t - .2 - i * .7) / 2.6), e = io(u), x = lerp(1500, 520, e), y = 620 + (760 - 620) * e * e - Math.sin(Math.PI * e) * 150;
      s += g(`<circle cy="-40" r="22" fill="${[TURQ, AMBAR, AZUL][i]}" ${S6}/><path d="M-28 30q0 -48 28 -48q28 0 28 48z" fill="${[TURQ, AMBAR, AZUL][i]}" ${S6}/>`, { x, y: y - 30 - Math.abs(Math.sin(t * 8 + i)) * 6, op: u > 0 ? 1 : 0 }); }
    return s; })],
};

const ids = (process.argv[2] || Object.keys(C).join(',')).split(',');
const pr = new Proj(), jobs = [];
for (const id of ids) {
  const [a, b] = span(id), c = pr.comp(id, b - a);
  pr.layers(c, C[id](a));
  if (process.argv[3]) jobs.push(...process.argv[3].split(';').map(s => frame(id, s === 'm' ? (b - a) * .7 : +s, `${HERE}/prev/${id}.png`)));
  else { fs.mkdirSync(`${V}/midia/motion`, { recursive: true }); jobs.push(video(id, `${V}/midia/motion/${id}.mp4`)); }
}
fs.mkdirSync(`${HERE}/prev`, { recursive: true });
await pr.run(jobs);
