import fs from 'fs';
import { Proj, video, frame, HERE, clamp, io, out, piscar } from './kit.mjs';
import { PAPEL, TINTA, TURQ, AMBAR, CINZA, VERM, AZUL, AMAR, BRANCO, ent, sai, vis, lerp, raw, fundo, txt, g, surge, cartao, barra, barraH, imagem, ICON, icone, bateria, nuvem, aba, fonte, boneco } from './mg.mjs';

const V = `${HERE}/../../videos/003_por_que_voce_sonha_grande_e_nao_faz_nada`;
const EDL = fs.readFileSync(`${V}/midia/edl.csv`, 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const span = id => { const i = EDL.findIndex(r => r[2] === `motion/${id}.mp4`); return [+EDL[i][0], +EDL[i + 1][0]]; };
const FONTES = `${V}/midia/fontes`;
const print = f => { const x = fs.readdirSync(FONTES).find(n => n.startsWith(f + '_') || n === f + '.png'); return x && `${FONTES}/${x}`; };
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const pulso = (t, f = 2.2) => 1 + .06 * Math.sin(t * f * Math.PI * 2);
const olhar = t => Math.sin(t * 1.1) * 12;

const mostraPrint = (f, cit) => a => [fundo(), raw('print', t => {
  const p = print(f), k = ent(t, 0, .7);
  if (p) return g(imagem(p, 0, 0, 1240), { x: 960, y: 540 + (1 - k) * 40, s: 1 + .04 * clamp(t / 7), op: k });
  return fonte(...cit, t, 0);
})];

const cartaoIcone = (n, label, t, t0, x, y, { cor = BRANCO, s = 1, destaque = 0 } = {}) => surge(
  cartao(240, 250, { fill: cor }) + (destaque ? `<rect x="-126" y="-131" width="252" height="262" rx="28" fill="none" stroke="${AMBAR}" stroke-width="${10 * destaque}"/>` : '') +
  icone(n, 0, -24, .8) + txt(label, 0, 92, { tam: 36 }), t, t0, { x, y, s });

const cabecaPainel = (a, itens, modo) => {
  const slots = [[-170, -40], [170, -40], [-170, 170], [170, 170]];
  return [fundo(), boneco(t => ({ pos: [564, 1380], s: 1, braco: { E: [8, 2], D: [-8, -2] },
    rosto: modo === 'cheio' ? { gx: 14, brow: 2, browIn: .8, smile: -.3, mo: .15, open: piscar(t, [1.2]) } : { gx: 14, smile: modo === 'um' ? .45 : .1, open: piscar(t, [1.5, 4]) } })),
  raw('painel', t => {
    let s = g(`<circle cx="0" cy="0" r="14" fill="${BRANCO}" ${S6}/>`, { x: 870, y: 360 }) + g(`<circle r="22" fill="${BRANCO}" ${S6}/>`, { x: 920, y: 300 });
    const tremor = modo === 'cheio' ? Math.sin(t * 40) * 6 * clamp((t - .6) / .3) : 0;
    let p = cartao(760, 600) + txt('memória de trabalho', 0, -200, { tam: 40, peso: 600, cor: '#555' });
    slots.forEach(([x, y]) => p += `<rect x="${x - 140}" y="${y - 90}" width="280" height="180" rx="18" fill="none" stroke="#c9c5bd" stroke-width="5" stroke-dasharray="16 12"/>`);
    itens.forEach(([n, t0], i) => { if (i < 4) p += surge(icone(n, 0, 0, .8), t, t0, { x: slots[i][0], y: slots[i][1], dy: -60 }); });
    return s + g(p, { x: 1330 + tremor, y: 560 });
  })];
};

const C = {
  M04: a => {
    const L = [['livro', 'inglês', 17.4], ['capelo', 'faculdade', 18.9], ['maleta', 'emprego', 20.6], ['haltere', 'academia', 22.7], ['cofrinho', 'dinheiro', 24.2]];
    return [fundo(), boneco(t => ({ pos: [960, 870], s: .42, rosto: { gx: olhar(t), gy: -8, brow: 1, browIn: .5, smile: -.1, open: piscar(t, [3.1, 7.2]) } })),
      raw('cartões', t => L.map(([n, l, w], i) => cartaoIcone(n, l, t + Math.sin(t * .8 + i) * 0, w - a - .2, 360 + i * 300, 190 + Math.sin(t * 1.2 + i * 1.3) * 6)).join(''))];
  },
  M07: mostraPrint('F1', ['Gabriele Oettingen e Doris Mayer', 2002, 'The motivating function of thinking about the future: expectations versus fantasies', 'Journal of Personality and Social Psychology, 83(5), 1198–1212']),
  M08: a => {
    const G = [['currículos', 49.1], ['propostas', 51.1], ['salário', 52.4]];
    return [fundo(), boneco(t => ({ pos: [400, 820], s: .4, rosto: { lid: .55, smile: .45, gy: -10, gx: 6 } })),
      raw('sonho e barras', t => {
        let s = surge(g(nuvem(300, 200, [-.9, 1]) + icone('maleta', -40, 0, .6) + `<path d="M60 -50l8 16l18 2l-13 12l4 18l-17 -9l-17 9l4 -18l-13 -12l18 -2z" fill="${AMAR}" ${S6}/>`), t, 0, { x: 560, y: 240 });
        s += surge(`<rect x="0" y="-18" width="36" height="36" rx="6" fill="${TURQ}" ${S6}/>` + txt('quem mais sonhava', 52, 14, { tam: 34, peso: 600, anc: 'start' }) +
          `<rect x="420" y="-18" width="36" height="36" rx="6" fill="${CINZA}" ${S6}/>` + txt('os outros', 472, 14, { tam: 34, peso: 600, anc: 'start' }), t, 0, { x: 920, y: 160 });
        G.forEach(([l, w], i) => { const k = io((t - (w - a)) / .8), x = 920 + i * 300;
          s += g(barra(90, 520, .55 * k, TURQ), { x, y: 860 }) + g(barra(90, 520, .85 * k, CINZA), { x: x + 110, y: 860 }) + txt(l, x + 100, 920, { tam: 36, op: ent(t, w - a - .3) }); });
        return s; })];
  },
  M11: a => [fundo(), raw('postits trás', t => [[-480, -250, -8], [480, -260, 6], [-560, 60, 4], [560, 40, -5], [-420, 330, 7], [430, 320, -6]].map(([x, y, r], i) =>
      surge(g(ICON.postit + txt('!', 0, 26, { tam: 90, cor: VERM }), { s: pulso(t + i * .3, 1.6) }), t, .2 + i * .25, { x: 960 + x, y: 540 + y, r, s: 1.1 })).join('')),
    boneco(t => ({ pos: [960, 740], s: .45, cab: Math.sin(t * 7) * 1.5 * clamp(t - 1), rosto: { gx: olhar(t * 2), brow: 3, browIn: .9, smile: -.35, mo: .2, open: piscar(t, [2.4, 6.1]) } }))],
  M13: a => {
    const like = 76.6 - a, insc = 77.4 - a;
    return [fundo(), boneco(t => { const k = io(t / .7);
      return { pos: [560, 760], s: .5, punhoL: { D: [lerp(900, 1200, k), lerp(1100, 690, k)] }, dobra: { D: 1 }, mao: { E: 'aberta', D: 'aberta' }, giroMao: { D: -70 * k },
        rosto: { gx: 12, smile: .65, brow: 1.5, open: piscar(t, [2.2, 6.4, 9.3]) } }; }),
      raw('botões', t => {
        const kl = ent(t, like - .1, .35), ki = ent(t, insc, .35), pl = 1 - .06 * Math.sin(Math.PI * clamp((t - like) / .3)), pi = 1 - .06 * Math.sin(Math.PI * clamp((t - insc) / .3));
        const b1 = `<rect x="-200" y="-64" width="400" height="128" rx="64" fill="${kl > .5 ? TURQ : BRANCO}" ${S6}/>` + g(ICON.like, { x: -110, y: 4, s: .7 }) + txt('Gostei', 40, 22, { tam: 52, cor: kl > .5 ? BRANCO : TINTA });
        const b2 = `<rect x="-240" y="-64" width="480" height="128" rx="64" fill="${ki > .5 ? '#cfcac2' : VERM}" ${S6}/>` + txt(ki > .5 ? 'Inscrito' : 'Inscrever-se', ki > .5 ? 20 : 0, 22, { tam: 52, cor: ki > .5 ? TINTA : BRANCO }) + (ki > .5 ? g(ICON.sino, { x: -150, y: 0, s: .7 }) : '');
        return surge(b1, t, .3, { x: 1320, y: 440, s: pl }) + surge(b2, t, .6, { x: 1320, y: 650, s: pi });
      })];
  },
  M17: a => cabecaPainel(a, [['livro', 101.0 - a], ['capelo', 103.0 - a], ['maleta', 105.6 - a], ['haltere', 107.0 - a]], 'normal'),
  M18: mostraPrint('F2', ['Nelson Cowan', 2001, 'The magical number 4 in short-term memory: A reconsideration of mental storage capacity', 'Behavioral and Brain Sciences, 24(1), 87–114']),
  M19: a => [...cabecaPainel(a, [['livro', -1], ['capelo', -1], ['maleta', -1], ['haltere', -1]], 'cheio'), raw('transborda', t => {
    const ex = ['cofrinho', 'postit', 'megafone', 'tv', 'cracha', 'livro', 'capelo', 'maleta'];
    return ex.map((n, i) => { const t0 = .8 + i * .12, u = clamp((t - t0) / 1.2), x = 1900 - u * 560 + (i % 3) * 40, y = 200 + i * 80 + 380 * u * u * (i % 2 ? 1 : -.3);
      return t > t0 ? icone(n, x, y, .55, { r: u * (i % 2 ? 90 : -70) }) : ''; }).join('') + txt('12', 1700, 1000, { tam: 120, cor: VERM, op: ent(t, 1.6, .3) }); })],
  M21: mostraPrint('F3', []),
  M22: a => [fundo(), raw('tarefas', t => {
    const fim = 127.0 - a, k = ent(t, fim, .6);
    const c1 = cartao(560, 300) + txt('tarefa terminada', 0, -60, { tam: 44 }) + icone('check', 0, 50, .7 * ent(t, .4, .5));
    const c2 = cartao(560, 300) + `<rect x="-290" y="-160" width="580" height="320" rx="30" fill="none" stroke="${AMBAR}" stroke-width="${8 + 6 * Math.sin(t * 6)}"/>` + txt('tarefa interrompida', 0, -60, { tam: 44 }) +
      [0, 1, 2].map(i => `<circle cx="${-50 + i * 50}" cy="50" r="14" fill="${TINTA}" opacity="${.3 + .7 * (Math.sin(t * 5 - i) > 0)}"/>`).join('');
    return g(surge(c1, t, .1, { x: 560, y: 540 - 20 * k }), { op: 1 - .7 * k }) + surge(c2, t, .4, { x: 1360, y: 540, s: 1 + .06 * k });
  })],
  M23: a => {
    const conta = 135.3 - a, esq = 137.4 - a;
    const B = [['xicara', 700, 230], ['bolo', 960, 150], ['suco', 1220, 230]];
    return [fundo(), boneco(t => ({ pos: [960, 860], s: .42, cab: 3 * Math.sin(t * .9), rosto: { gx: olhar(t) * .6, gy: -12, smile: .2 + .3 * ent(t, esq), open: piscar(t, [2.1, 5.3, 8.8]) } })),
      raw('pedidos', t => {
        let s = B.map(([n, x, y], i) => { const k = Math.min(ent(t, .4 + i * .9), 1 - io((t - esq - i * .12) / .3)); return k > 0 ? g(nuvem(230, 170, [i === 1 ? 0 : i ? -1 : 1, 1]) + icone(n, 0, 0, .65), { x, y, s: k * pulso(t + i, .5), op: clamp(k * 1.5) }) : ''; }).join('');
        s += surge(ICON.conta + `<g opacity="${ent(t, conta + .5, .3)}"><rect x="-56" y="-20" width="112" height="44" rx="8" fill="none" stroke="${TURQ}" stroke-width="7" transform="rotate(-14)"/>${txt('PAGO', 0, 15, { tam: 30, cor: TURQ }).replace('<text', '<text transform="rotate(-14)"')}</g>`, t, conta, { x: 1480, y: 620, s: 1.2 });
        return s; })];
  },
  M24: a => {
    const T = [['inglês', 143.4], ['faculdade', 144.3], ['emprego', 145.5], ['academia', 146.4], ['dinheiro', 147.4]];
    return [fundo(), raw('navegador', t => {
      let s = cartao(1500, 780, { r: 18 }) + `<rect x="-750" y="-390" width="1500" height="96" rx="18" fill="#d7d3cc" ${S6}/>` + [0, 1, 2].map(i => `<circle cx="${-700 + i * 34}" cy="-342" r="10" fill="${[VERM, AMBAR, TURQ][i]}"/>`).join('');
      s += [0, 1, 2, 3].map(i => `<rect x="-640" y="${-200 + i * 110}" width="${[1100, 900, 1200, 700][i]}" height="40" rx="20" fill="#e4e0d9"/>`).join('');
      const extra = clamp((t - (148.4 - a)) / 1), n = T.length;
      T.forEach(([l, w], i) => { const k = ent(t, w - a - .15, .35), wd = lerp(250, 150, extra); s += g(aba(l, wd, i === n - 1 ? BRANCO : '#ece9e3', 1 - extra * .4), { x: -610 + i * (wd + 6) + wd / 2, y: -300 - (1 - k) * 30, op: k }); });
      return g(s, { x: 960, y: 560 }); })];
  },
  M25: a => [fundo(), boneco(t => ({ pos: [600, 1300], s: .95, desce: 6 * clamp(t / 4), cab: -4 * clamp(t / 4), rosto: { gx: 10, gy: 6, lid: .2 + .35 * clamp(t / 4), brow: -1, smile: -.25, open: piscar(t, [1.6, 3.7]) } })),
    raw('bateria', t => { const k = 1 - .18 * Math.min(5, Math.floor(clamp(t / 4) * 5 + .5)) - .02; return g(bateria(Math.max(.08, k)), { x: 1380, y: 520, s: 2.4 }) + txt('você', 1380, 760, { tam: 48, op: .7 }); })],
  M29: a => [fundo(), raw('palavras', t => {
    const p = 167.5 - a, sc = 168.7 - a, r = clamp((t - p - .6) / .35);
    return surge(txt('preguiça', 0, 0, { tam: 120, cor: '#777' }) + `<path d="M-260 -36L${-260 + 520 * r} -36" stroke="${VERM}" stroke-width="16" stroke-linecap="round"/>`, t, p - .1, { x: 960, y: 400 }) +
      surge(txt('sobrecarga', 0, 0, { tam: 150 }), t, sc - .1, { x: 960, y: 640 }) + g(bateria(.06), { x: 960, y: 830, s: 1.1, op: ent(t, sc + .2) });
  })],
  M32: a => {
    const I = [['6h', 'acordar', 179.5], ['', 'academia', 180.9], ['', '1 h de inglês', 182.1], ['', 'mandar currículo', 183.5], ['', 'ler antes de dormir', 184.9]];
    return [fundo(), raw('agenda', t => { let s = cartao(900, 860, { r: 18 }) + `<rect x="-450" y="-430" width="900" height="130" rx="18" fill="${AZUL}" ${S6}/>` + txt('SEGUNDA', 0, -340, { tam: 60, cor: BRANCO });
      I.forEach(([h, l, w], i) => { const y = -220 + i * 128; s += `<path d="M-400 ${y + 60}h800" stroke="#dcd8d0" stroke-width="4"/>` + surge(`<rect x="-380" y="-26" width="44" height="44" rx="8" fill="none" ${S6}/>` + txt((h ? h + ' · ' : '') + l, -310, 14, { tam: 46, peso: 600, anc: 'start' }), t, w - a - .2, { x: 0, y: y + 20, dy: 20 }); });
      return g(s, { x: 960, y: 560, s: 1 + .03 * clamp(t / 7) }); })];
  },
  M37: a => {
    const tl = [['capelo', 215.9, -170], ['cracha', 217.2, 170]];
    return [fundo(), boneco(t => ({ pos: [520, 820], s: .45, cab: -4 * ent(t, 1.5, 1.2), rosto: { lid: .9 * ent(t, 1.5, 1), smile: .55 * ent(t, 2, 1), gy: -8 } })),
      raw('sonho', t => {
        const k = ent(t, 2.6, .8), bar = io((t - (220.3 - a)) / 2.4);
        let in_ = surge(`<rect x="-120" y="-60" width="240" height="120" rx="30" fill="${BRANCO}" ${S6}/><path d="M-40 56l-20 40l50 -40" fill="${BRANCO}" ${S6}/>` + txt('Hello!', 0, 18, { tam: 54 }), t, 214.4 - a - .2, { x: 0, y: -90 });
        tl.forEach(([n, w, x]) => in_ += surge(icone(n, 0, 0, .8), t, w - a - .2, { x: x * 1.6, y: -90 }));
        in_ += g(barraH(560, 46, bar * .92, TURQ), { x: -280, y: 120, op: ent(t, 220 - a) });
        return g(nuvem(1000, 560, [-.75, 1]) + in_, { x: 1260, y: 360, s: k, op: k });
      })];
  },
  M41: a => [fundo(), boneco(t => ({ pos: [820, 790], s: .5, punhoL: { D: [935, 440] }, dobra: { D: 1 }, mao: { E: 'aberta', D: 'pega' }, rosto: { gx: 10, mo: .5 + .3 * Math.sin(t * 9), smile: .3, brow: 2 } }),
    { ordem: ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', 'mãoE', 'braçoE', raw('megafone', t => icone('megafone', 1010, 418, 1.1, { r: -14 })), 'mãoD', 'braçoD'] }),
    raw('ondas', t => [0, 1, 2].map(i => { const u = ((t * .9 + i / 3) % 1); return `<path d="M${1120 + u * 260} ${300 - u * 120}q${60 + u * 60} ${110 + u * 120} 0 ${220 + u * 240}" fill="none" stroke="${TINTA}" stroke-width="6" stroke-linecap="round" opacity="${1 - u}"/>`; }).join(''))],
  M42: mostraPrint('F4', []),
  M43: a => {
    const mc = 244.6 - a;
    return [fundo(), boneco(t => ({ pos: [560, 800], s: .46, punhoL: t > mc ? { E: [330, 330], D: [1054, 330] } : undefined, dobra: { E: -1, D: 1 }, mao: { E: 'aberta', D: 'aberta' }, rosto: { smile: .7, gy: -6, gx: olhar(t) * .5, lid: .25, open: piscar(t, [2.3]) } })),
      raw('aplausos', t => {
        let s = [[-330, -330], [-120, -400], [150, -360], [-420, -60], [300, -140], [-260, 120]].map(([x, y], i) => surge(g(ICON.like, { s: .55 }) + `<circle cx="34" cy="-50" r="18" fill="${VERM}"/>`, t, .3 + i * .45, { x: 560 + x, y: 520 + y, r: (i % 2 ? 8 : -8), t1: mc + 1.8 })).join('');
        const k = 1 - .65 * io((t - 1) / (mc - 1.5));
        s += surge(g(barra(110, 560, k, k < .4 ? VERM : AMBAR), { x: -55, y: 280 }) + txt('esforço', 0, 350, { tam: 40 }), t, .5, { x: 1400, y: 450 });
        s += surge(icone('check', 0, 0, 1.4) + txt('missão cumprida', 0, 170, { tam: 54 }), t, mc - .1, { x: 1080, y: 380 });
        return s; })];
  },
  M46: a => {
    const P = [['papel', 253.0, ''], ['cabeca', 254.6, ''], ['nuvem', 257.1, ''], ['megafone', 259.4, '']];
    return [fundo(), raw('pilha', t => P.map(([n, w], i) => {
      const x = 360 + i * 400, y = 540;
      let b = n === 'cabeca' ? cartao(260, 220) + [[-60, -50], [60, -50], [-60, 50], [60, 50]].map(([u, v]) => `<rect x="${u - 50}" y="${v - 38}" width="100" height="76" rx="10" fill="none" stroke="#bdb8af" stroke-width="5" stroke-dasharray="10 8"/>`).join('')
        : n === 'nuvem' ? nuvem(300, 210, [-1, 1]) + `<rect x="-100" y="20" width="200" height="30" rx="15" fill="#d8d5cf"/><rect x="-100" y="20" width="160" height="30" rx="15" fill="${TURQ}" ${S6}/>`
          : n === 'papel' ? g(ICON.papel + Array.from({ length: 8 }, (_, j) => `<path d="M-60 ${-90 + j * 26}h${100 + (j * 37 % 30)}" stroke="#bbb" stroke-width="6" stroke-linecap="round"/>`).join(''), { s: 1.1 }) : g(ICON.megafone, { s: 1.4 });
      return surge(b, t, w - a - .2, { x, y: y + Math.sin(t * 1.3 + i) * 5 });
    }).join('') + txt('você sente que está andando', 960, 920, { tam: 46, op: 0 }))];
  },
  M48: a => [fundo(), raw('esteira', t => `<rect x="560" y="900" width="800" height="70" rx="20" fill="#3b3e44" ${S6}/>` + Array.from({ length: 9 }, (_, i) => { const x = 600 + ((i * 90 + t * 260) % 720); return `<path d="M${x} 915v40" stroke="#6b6f76" stroke-width="8"/>`; }).join('') +
    `<path d="M640 900L600 520h-40M1280 900L1320 520h40" fill="none" stroke="#8a8e95" stroke-width="18" stroke-linecap="round"/>`),
    boneco(t => { const c = Math.sin(t * Math.PI * 2 * 1.6);
      return { pos: [960, 710 - Math.abs(c) * 8], s: .46, coxa: { E: c > 0 ? 1 - .35 * c : 1, D: c < 0 ? 1 + .35 * c : 1 }, braco: { E: [7 - 10 * c, 4], D: [-9 - 10 * c, -4] }, rosto: { gx: 0, gy: -4, smile: .1, brow: .5 } }; })],
  M51: a => [fundo(), raw('caminho', t => `<path d="M120 900H1800" stroke="#c9c5bd" stroke-width="10" stroke-dasharray="30 22"/>` + icone('bandeira', 1640, 820, 1.2) +
    g(icone('pedra', 0, 0, 1.6), { x: 1150, y: 860 - 600 * (1 - io(clamp((t - (281.9 - a)) / .45))) ** 2, op: t > 281.9 - a ? 1 : 0 })),
    boneco(t => { const ob = ent(t, 282.4 - a); return { pos: [420, 680], s: .42, rosto: { gx: 8 + 6 * ob, gy: -10 + 14 * ob, lid: .5 * (1 - ob), smile: .45 - .5 * ob, brow: 2 * ob, browIn: .5 * ob } }; }),
    raw('sonho', t => surge(nuvem(360, 240, [-1, 1]) + icone('bandeira', 0, 0, .7), t, 278.2 - a, { x: 780, y: 200 }))],
  M52: a => {
    const C4 = [['desejo', 288.9], ['resultado', 289.9], ['obstáculo', 291.2], ['plano', 292.4]], ex = [[0, 'livro', 294.8], [1, 'tv', 297.4]];
    return [fundo(), raw('woop', t => {
      const pk = vis(t, 0, 288.6 - a), p = print('F9');
      let s = p ? g(imagem(p, 0, 0, 1100), { x: 960, y: 540 + (1 - pk) * 30, op: pk, s: 1 + .03 * clamp(t / 5) }) : '';
      C4.forEach(([l, w], i) => { const on = ex.find(e => e[0] === i), ko = on ? ent(t, on[2] - a - .1, .5) : 0;
        s += surge(cartao(360, 440, { fill: ko ? '#fff7e6' : BRANCO }) + txt(l, 0, -150, { tam: 48 }) + (on ? icone(on[1], 0, 40, 1.1 * ko) : `<path d="M-60 40h120" stroke="#d0ccc4" stroke-width="8" stroke-linecap="round"/>`), t, w - a - .2, { x: 300 + i * 440, y: 560, s: 1 + .05 * ko }); });
      return s; })];
  },
  M57: a => [fundo(), raw('encaixe', t => {
    const k = io(clamp((t - 1.2) / .9)), L = `<path d="M0 0H560V70A40 40 0 1 1 560 150V220H0Z" fill="${AZUL}" ${S6}/>`, R = `<path d="M0 0H560V220H0V150A40 40 0 1 0 0 70Z" fill="${AMAR}" ${S6}/>`;
    return surge(g(L + txt('quando eu chegar', 280, 98, { tam: 46, cor: BRANCO }) + txt('cansado…', 280, 158, { tam: 46, cor: BRANCO })), t, 316.5 - a - .2, { x: 400 - 120 * (1 - k), y: 430 }) +
      surge(g(R + txt('…eu faço dez', 290, 98, { tam: 46 }) + txt('minutos de inglês', 290, 158, { tam: 46 })), t, 317.9 - a - .2, { x: 960 + 160 * (1 - k), y: 430 }) +
      icone('check', 960, 820, .8 * ent(t, 2.3, .4));
  })],
  M58: mostraPrint('F5', ['Peter Gollwitzer e Paschal Sheeran', 2006, 'Implementation intentions and goal achievement: A meta-analysis of effects and processes', 'Advances in Experimental Social Psychology, 38, 69–119']),
  M59: a => [fundo(), raw('94', t => {
    const n = Math.round(94 * clamp((t - .2) / 1.2)); let s = '';
    for (let i = 0; i < 94; i++) s += `<circle cx="${200 + (i % 16) * 46}" cy="${300 + Math.floor(i / 16) * 46}" r="16" fill="${i < n ? TINTA : '#d8d5cf'}"/>`;
    s += txt('94 testes', 545, 640, { tam: 56, op: ent(t, 1) });
    const b = io((t - (326.1 - a)) / 1.2);
    s += txt('só a intenção', 1080, 380, { tam: 40, anc: 'start', op: ent(t, 325.3 - a - .3) }) + g(barraH(640, 60, .4 * b, CINZA), { x: 1080, y: 440, op: ent(t, 325.3 - a - .3) });
    s += txt('quando e onde', 1080, 600, { tam: 40, anc: 'start', op: ent(t, 326.1 - a - .3) }) + g(barraH(640, 60, .8 * b, TURQ), { x: 1080, y: 660, op: ent(t, 326.1 - a - .3) });
    return s; })],
  M61: mostraPrint('F6', []),
  M62: a => [fundo(), raw('quebra-cabeça', t => {
    const inv = 342.5 - a - 1.3; let s = '';
    for (let i = 0; i < 9; i++) { const x = 760 + (i % 3) * 140, y = 330 + Math.floor(i / 3) * 140, k = ent(t, .1 + i * .25), j = clamp((t - inv) / .3) * (i % 2 ? 1 : -1) * Math.sin(t * 30 + i) * 10;
      s += k > 0 && !(t > inv && i > 5) ? g(`<rect x="-66" y="-66" width="132" height="132" rx="10" fill="${[AZUL, TURQ, AMBAR][i % 3]}" ${S6}/>`, { x: x + j, y: y + (1 - k) * 30, op: k }) : ''; }
    s += [[-560, -300, -8], [540, -280, 7], [-600, 220, 5], [600, 200, -6]].map(([x, y, r], i) => t > inv + i * .2 ? g(ICON.postit, { x: 960 + x, y: 540 + y, r, s: 1.2 * pulso(t, 3), op: .5 + .5 * (Math.sin(t * 12 + i) > 0) }) : '').join('');
    return s; })],
  M64: a => [fundo(), raw('abas fecham', t => {
    const T = ['inglês', 'faculdade', 'emprego', 'academia', 'dinheiro'];
    let s = cartao(1500, 780, { r: 18 }) + `<rect x="-750" y="-390" width="1500" height="96" rx="18" fill="#d7d3cc" ${S6}/>`;
    T.forEach((l, i) => { const k = 1 - io(clamp((t - .4 - (4 - i) * .4) / .3)); if (k > 0) s += g(aba(l, 250, '#ece9e3'), { x: -610 + i * 256 + 125, y: -300, s: k, op: k }); });
    return g(s, { x: 960, y: 560 }); })],
  M65: a => {
    const fala = [359.3, 359.4, 359.6, 359.8];
    return [fundo(), boneco(t => ({ pos: [560, 860], s: .42, cab: 6 * ent(t, 2.8), rosto: { gy: 10 * ent(t, 2.8), gx: 8, smile: .2 } })),
      raw('passos', t => {
        let s = [1, 2, 3, 4].map((n, i) => surge(`<circle r="60" fill="${i === 0 && t > 2.6 ? TURQ : BRANCO}" ${S6}/>` + txt(n, 0, 24, { tam: 64, cor: i === 0 && t > 2.6 ? BRANCO : TINTA }), t, fala[i] - a + i * .2, { x: 660 + i * 200, y: 170 })).join('');
        s += surge(ICON.papel, t, 3.0, { x: 1400, y: 680, s: 1.4 });
        ['livro', 'capelo', 'maleta', 'haltere', 'cofrinho'].forEach((n, i) => { const t0 = 3.3 + i * .35, u = clamp((t - t0) / .7);
          if (t > t0) s += icone(n, lerp(560, 1400, io(u)), lerp(330, 600 + i * 30, u) - Math.sin(u * Math.PI) * 160, .5 * (1 - .4 * u), { op: 1 - clamp((u - .9) * 10) * 0 }); });
        return s; })];
  },
  M68: a => [fundo(), raw('allen', t => { const p = print('F7');
    return (p ? surge(imagem(p, 0, 0, 760), t, 0, { x: 450, y: 540 }) : '') +
      surge(txt('“A mente serve para ter ideias,', 0, 0, { tam: 58, anc: 'start' }) + txt('não para guardar ideias.”', 0, 80, { tam: 58, anc: 'start' }) + txt('— David Allen', 0, 180, { tam: 40, peso: 400, anc: 'start', cor: '#555' }), t, 372.6 - a - .2, { x: 900, y: 470 }); })],
  M70: a => {
    const L = [['livro', 'inglês'], ['capelo', 'faculdade'], ['maleta', 'emprego'], ['haltere', 'academia'], ['cofrinho', 'dinheiro']], ch = 384.9 - a;
    return [fundo(), raw('destrava', t => {
      const k = io(clamp((t - ch) / 1)), pos = [[560, 300], [1360, 300], [960, 540], [560, 780], [1360, 780]], fim = [[], [1480, 540], [400, 540], [], [940, 540]];
      let s = '';
      if (t < ch + .2) [0, 1, 3, 4].forEach(i => { const u = clamp((t - 1.6 - i * .15) / .5); s += `<path d="M960 540L${lerp(960, pos[i][0], u)} ${lerp(540, pos[i][1], u)}" stroke="${AMBAR}" stroke-width="10" stroke-linecap="round" opacity="${1 - k}"/>`; });
      L.forEach(([n, l], i) => { const sel = i === 2, ini = pos[i], fi = fim[i].length ? fim[i] : ini, op = fim[i].length ? 1 : 1 - k;
        s += g(cartaoIcone(n, l, t, i * .1, 0, 0, { destaque: sel ? ent(t, 1.2) : 0 }), { x: lerp(ini[0], fi[0], k), y: lerp(ini[1], fi[1], k), op }); });
      [[545, 'paga'], [1085, 'paga']].forEach(([x], j) => { const u = ent(t, (j ? 388.6 : 388.1) - a - .3); if (u > .02) s += `<path d="M${x} 540h${230 * u}" stroke="${TINTA}" stroke-width="10" stroke-linecap="round"/><path d="M${x + 230 * u - 20} 520l24 20l-24 20" fill="none" stroke="${TINTA}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="${u}"/>`; });
      return s; })];
  },
  M73: a => [fundo(), raw('aba data', t => { const c = io(clamp((t - (400.3 - a)) / .4));
    return g(aba('faculdade', 520, '#ece9e3') + `<rect x="-120" y="-120" width="240" height="64" rx="12" fill="${AMAR}" ${S6}/>` + txt('depois de junho', 0, -76, { tam: 30 }), { x: 960, y: 560, s: 1.6 * (1 - c), op: 1 - c }) +
      icone('check', 960, 540, 1.2 * c); })],
  M74: a => {
    const C4 = [['desejo', 405.6], ['resultado', 406.6], ['obstáculo', 407.6], ['plano', 408.7]];
    return [fundo(), raw('woop', t => C4.map(([l, w], i) => { const ko = i === 2 ? ent(t, w - a, .5) : 0;
      return surge(cartao(360, 440, { fill: ko ? '#fff1d6' : BRANCO }) + (ko ? `<rect x="-192" y="-232" width="384" height="464" rx="30" fill="none" stroke="${AMBAR}" stroke-width="${12 * ko}"/>` : '') + txt(l, 0, -150, { tam: 48 }) + (i === 2 ? icone('pedra', 0, 50, .9 * ko) : ''), t, i * .2, { x: 300 + i * 440, y: 560, s: 1 + .06 * ko }); }).join(''))];
  },
  M76: a => [fundo(), boneco(t => ({ pos: [1400, 820], s: .44, punhoL: { E: [470, 860] }, dobra: { E: -1 }, mao: { E: 'pega', D: 'aberta' }, rosto: { gx: -10, smile: .2 + .4 * ent(t, 4), gy: 6 } }), {
    ordem: ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', raw('plano', t => { const k = io(clamp((t - 1.6) / 1.8));
      return g(cartao(700, 820, { r: 14 }) + txt(k < .5 ? '2 h de inglês' : '10 min', 0, k < .5 ? -280 : 40, { tam: k < .5 ? 70 : 170 }) + (k < .5 ? Array.from({ length: 10 }, (_, j) => `<path d="M-280 ${-180 + j * 50}h${400 + (j * 53 % 160)}" stroke="#ccc" stroke-width="10" stroke-linecap="round"/>`).join('') : ''),
        { x: lerp(640, 1210, k), y: lerp(520, 790, k), s: lerp(1, .3, k), r: lerp(0, -8, k) }); }), 'mãoE', 'braçoE', 'mãoD', 'braçoD'] })],
  M77: a => [fundo(), raw('clear', t => { const p = print('F8'), k = clamp((t - (426.6 - a)) / 2);
    return (p ? surge(imagem(p, 0, 0, 800), t, 0, { x: 500, y: 540 }) : '') + surge(g(ICON.ampulheta, { r: 180 * io(k) }) + txt('2 minutos', 0, 160, { tam: 56 }), t, 426.4 - a - .3, { x: 1420, y: 480, s: 1.5 }); })],
  M79: a => [fundo(), raw('volume', t => {
    const v = 1 - io(clamp((t - 1.5) / 2));
    let s = [[-560, -300, -8], [520, -300, 7], [-640, 160, 5], [620, 180, -6], [-300, 330, 3], [330, 340, -4]].map(([x, y, r], i) => g(ICON.postit, { x: 960 + x + Math.sin(t * 25 + i) * 6 * v, y: 540 + y, r, s: 1.1, op: .35 + .65 * v })).join('');
    s += g(`<path d="M-40 -30h40l50 -40v140l-50 -40h-40z" fill="${BRANCO}" ${S6}/>` + [1, 2, 3].map(i => `<path d="M${70 + i * 30} ${-30 - i * 16}q${30} ${30 + i * 16} 0 ${60 + i * 32}" fill="none" ${S6} opacity="${clamp(v * 3 - i + 1)}"/>`).join(''), { x: 860, y: 520, s: 1.6 });
    return s + g(barraH(500, 30, Math.max(.02, v), TINTA), { x: 710, y: 760 }); })],
  M81: a => cabecaPainel(a, [['livro', .3]], 'um'),
  M83: a => [fundo(), raw('doze', t => { const u = io(clamp((t - (454.7 - a)) / 3)); let s = `<path d="M1240 500h${380 * u}" stroke="${TURQ}" stroke-width="8" stroke-dasharray="20 16" opacity="${u}"/>`;
    for (let i = 0; i < 12; i++) { const anda = i === 5, x = 520 + (i % 4) * 170 + (anda ? u * 820 : 0), y = 330 + Math.floor(i / 4) * 170;
      s += surge(`<rect x="-62" y="-62" width="124" height="124" rx="16" fill="${anda ? TURQ : '#cfcbc3'}" ${S6}/>`, t, i * .04, { x, y }); }
    return s; })],
  M85: a => {
    const sentado = { coxa: { E: .28, D: .28 }, perna: { E: [5, -5], D: [-5, 5] }, giroPe: { E: 0, D: 0 } };
    const cadeira = x => `<rect x="${x - 150}" y="340" width="300" height="330" rx="40" fill="#8b6f5a" ${S6}/><rect x="${x - 170}" y="640" width="340" height="80" rx="20" fill="#9c7f68" ${S6}/><path d="M${x - 140} 720v200M${x + 140} 720v200" ${S6}/>`;
    return [fundo(), raw('cadeiras', t => cadeira(620) + cadeira(1300) + `<path d="M0 925H1920" stroke="#c9c5bd" stroke-width="6"/>`),
      boneco(t => ({ ...sentado, pos: [620, 700], s: .42, cab: 4 + 2 * Math.sin(t * .8), punhoL: { E: [600, 1110], D: [784, 1110] }, mao: { E: 'apoio', D: 'apoio' }, rosto: { gx: 10, gy: 4, brow: -1, browIn: .4, smile: -.05 + .3 * ent(t, 6), mo: t > 1.4 && t < 4 ? .2 + .2 * Math.sin(t * 10) : 0, open: piscar(t, [2.7, 7.4]) } })),
      raw('profissional', t => { const fala = t > 4.4 && t < 7.4;
        return g(`<rect x="-120" y="-150" width="240" height="310" rx="80" fill="#6f8099" ${S6}/><rect x="-110" y="140" width="220" height="80" rx="30" fill="#3f4652" ${S6}/><path d="M-80 220v130M80 220v130" stroke="#3f4652" stroke-width="56" stroke-linecap="round"/><path d="M-80 220v130M80 220v130" fill="none" ${S6} opacity="0"/>` +
          `<circle cy="-250" r="96" fill="#a5a5a5" ${S6}/><path d="M-96 -262q10 -110 96 -100q96 -6 96 100q-30 -50 -96 -46q-66 -4 -96 46z" fill="#5b4636" ${S6}/><circle cx="-34" cy="-250" r="9" fill="${TINTA}"/><circle cx="34" cy="-250" r="9" fill="${TINTA}"/>` +
          `<path d="M-26 ${-206}q26 ${fala ? 22 + 8 * Math.sin(t * 10) : 14} 52 0" fill="none" ${S6}/><rect x="-40" y="0" width="120" height="150" rx="10" fill="${BRANCO}" ${S6} transform="rotate(-12)"/>`, { x: 1300, y: 560, s: .9 }) +
          [[t > 1.4 && t < 4, 860, 330], [fala, 1060, 210]].map(([on, x, y], i) => on ? g(`<rect x="-110" y="-60" width="220" height="120" rx="40" fill="${BRANCO}" ${S6}/>` + [0, 1, 2].map(j => `<circle cx="${-46 + j * 46}" cy="0" r="12" fill="${TINTA}" opacity="${.3 + .7 * (Math.sin(t * 6 - j) > 0)}"/>`).join(''), { x, y }) : '').join(''); })];
  },
};

const ids = (process.argv[2] || Object.keys(C).join(',')).split(',');
const pr = new Proj(), jobs = [];
for (const id of ids) {
  const [a, b] = span(id), c = pr.comp(id, b - a);
  pr.layers(c, C[id](a));
  if (process.argv[3]) jobs.push(...process.argv[3].split(';').map(s => frame(id, +s, `${HERE}/prev_${id}_${s}.png`)));
  else { fs.mkdirSync(`${V}/midia/motion`, { recursive: true }); jobs.push(video(id, `${V}/midia/motion/${id}.mp4`)); }
}
await pr.run(jobs);
