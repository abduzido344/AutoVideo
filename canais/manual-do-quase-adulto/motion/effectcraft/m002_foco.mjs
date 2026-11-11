import fs from 'fs';
process.env.MW = '1080'; process.env.MH = '1920';
const { Proj, video, frame, HERE, clamp, io, out } = await import('./kit.mjs');
const { PAPEL, TINTA, TURQ, AMBAR, CINZA, VERM, AZUL, AMAR, BRANCO, ICON, ent, lerp, raw, fundo, txt, g, surge, cartao, barra, barraH, aba } = await import('./mg.mjs');

const V = `${HERE}/../../shorts/002_foco_47_segundos`, OUTD = `${V}/midia/motion`;
const PAL = JSON.parse(fs.readFileSync(`${V}/audio/palavras.json`, 'utf8'));
const pw = (a, s) => PAL.find(([x, t]) => t >= a - .05 && x.toLowerCase().replace(/[.,]/g, '').startsWith(s))[1] - a;
const S6 = `stroke="${TINTA}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const SC = { M01: [0, 1.6], M02a: [1.6, 3.6], M02b: [3.6, 5.86], M03: [9.5, 12.59], M04: [12.59, 14.2], M05a: [14.2, 17.4], M05b: [17.4, 20.0],
  M06: [20.0, 23.08], M07: [23.08, 25.5], M08: [25.5, 28.07], M09: [29.9, 31.7], M10: [31.7, 34.9], M11: [36.8, 38.55] };

const qb = (p, c, q, k) => [0, 1].map(i => (1 - k) ** 2 * p[i] + 2 * (1 - k) * k * c[i] + k * k * q[i]);
const CUR = `<path d="M0 0V66L17 51L30 79L43 73L30 46H52Z" fill="${BRANCO}" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>`;
const cursor = (p, t, tc) => { const pr = tc == null ? 1 : 1 - .15 * Math.sin(Math.PI * clamp((t - tc) / .2)), u = tc == null ? -1 : (t - tc) / .45;
  return (u >= 0 && u <= 1 ? `<circle cx="${p[0]}" cy="${p[1]}" r="${20 + 60 * out(u)}" fill="none" stroke="${AMAR}" stroke-width="8" opacity="${1 - u}"/>` : '') + g(CUR, { x: p[0], y: p[1], s: pr }); };
const linhas = (w, n, y0, cor = '#d8d5cf') => Array.from({ length: n }, (_, i) => `<rect x="${-w / 2 + 40}" y="${y0 + i * 52}" width="${(w - 80) * [1, .86, .94, .6, .9, .75][i % 6]}" height="22" rx="11" fill="${cor}"/>`).join('');
const janela = (w, h, tit, cor) => `<rect x="${-w / 2 + 8}" y="${-h / 2 + 12}" width="${w}" height="${h}" rx="18" fill="#000" opacity=".12"/>` +
  `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="18" fill="${BRANCO}"/><path d="M${-w / 2} ${-h / 2 + 70}V${-h / 2 + 18}q0 -18 18 -18H${w / 2 - 18}q18 0 18 18V${-h / 2 + 70}Z" fill="${cor}"/>` +
  [0, 1, 2].map(i => `<circle cx="${-w / 2 + 36 + i * 30}" cy="${-h / 2 + 35}" r="9" fill="${BRANCO}" opacity=".85"/>`).join('') +
  txt(tit, -w / 2 + 140, -h / 2 + 48, { tam: 36, peso: 700, anc: 'start', cor: TINTA }) + linhas(w, Math.floor((h - 120) / 52), -h / 2 + 110) +
  `<path d="M${-w / 2} ${-h / 2 + 70}H${w / 2}" ${S6}/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="18" fill="none" ${S6}/>`;
const monitor = `<rect x="440" y="1180" width="200" height="90" fill="#b9b6b0" ${S6}/><rect x="340" y="1262" width="400" height="30" rx="12" fill="#b9b6b0" ${S6}/>` +
  `<rect x="44" y="324" width="992" height="872" rx="30" fill="#2a2d33" ${S6}/><rect x="70" y="350" width="940" height="820" rx="10" fill="#dfe6ee"/>`;
const tela = t => surge(monitor, t, 0, { dy: 20 });
const cam = (L, d) => raw('cam', t => { const s = 1 + .02 * t / d; return `<g transform="translate(540 760) scale(${s}) translate(-540 -760)">${L.map(f => f(t)).join('')}</g>`; });
const T = (s, x, y, tam, cor = TINTA, peso = 800) => `<text x="${x}" y="${y}" font-family="Segoe UI" font-weight="${peso}" font-size="${tam}" fill="${cor}" text-anchor="middle">${s}</text>`;
const pop = (body, t, t0, x, y, d = .5) => { const k = ent(t, t0, d); return k <= 0 ? '' : g(body, { x, y: y + (1 - k) * 30, s: .9 + .1 * k, op: k }); };
const IMG = {}, img = (f, w) => { const b = IMG[f] ||= fs.readFileSync(f), iw = b.readUInt32BE(16), ih = b.readUInt32BE(20), h = w * ih / iw;
  return { h, svg: `<rect x="${-w / 2 - 22}" y="${-h / 2 - 8}" width="${w + 44}" height="${h + 30}" rx="14" fill="#000" opacity=".14"/><rect x="${-w / 2 - 30}" y="${-h / 2 - 22}" width="${w + 60}" height="${h + 44}" rx="14" fill="#fff" ${S6}/>` +
    `<image href="data:image/png;base64,${b.toString('base64')}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}"/>` }; };

const C = {
  M01: (a, d) => [cam([t => { const k = ent(t, .02, .5), f = 47 / 60 * clamp((t - .05) / 1.2), R = 330, Cc = 2 * Math.PI * R;
    return g(`<circle r="${R}" fill="${BRANCO}" stroke="#d8d5cf" stroke-width="26"/><circle r="${R}" fill="none" stroke="${TURQ}" stroke-width="26" stroke-linecap="round" stroke-dasharray="${Cc * f} ${Cc}" transform="rotate(-90)"/>`, { x: 540, y: 760, s: .9 + .1 * k, op: k }) +
      pop(`<text x="0" y="120" font-family="Segoe UI" font-weight="900" font-size="340" fill="${TINTA}" text-anchor="middle">47<tspan font-size="150" font-weight="700"> s</tspan></text>`, t, pw(a, 'quarenta') + .02, 540, 760); }], d)],
  M02a: (a, d) => [cam([tela, t => surge(janela(720, 480, 'Planilha', TURQ), t, pw(a, 'atenção'), { x: 470, y: 690 }),
    t => { const k = ent(t, pw(a, 'tela'), .4); return k ? g(cursor([0, 0], t), { x: 560, y: 770, op: k }) : ''; }], d)],
  M02b: (a, d) => { const tp = pw(a, 'pular'), to = pw(a, 'outra'), A = [560, 770], B = [700, 990];
    return [cam([tela, t => g(janela(720, 480, 'Planilha', t < to ? TURQ : '#cfccc6'), { x: 470, y: 690 }),
      t => surge(janela(640, 400, 'Mensagens', t < to ? '#cfccc6' : AMBAR), t, tp, { x: 610, y: 940 }),
      t => cursor(qb(A, [700, 560], B, io(clamp((t - tp - .1) / (to - tp - .1)))), t, to)], d)]; },
  M03: (a, d) => { const tc = pw(a, 'outra'), tp = pw(a, 'percebe'), N = ['Relatório', 'Vídeos', 'Chat', 'Loja'], act = t => t < tc ? 0 : 1;
    const browser = t => { const tabs = N.map((n, i) => { const k = i ? ent(t, tp + (i - 1) * .15, .4) : 1; return k ? g(aba(n, 216, act(t) === i ? BRANCO : '#cfccc6'), { x: 210 + i * 218, y: 432 + (1 - k) * 20, op: k }) : ''; });
      const ord = [...tabs.keys()].filter(i => i !== act(t)).concat(act(t));
      const kv = ent(t, tc, .5), corpo = act(t) ? g(`<rect x="-380" y="-250" width="760" height="420" rx="14" fill="#2a2d33"/><path d="M-40 -100L60 -40L-40 20Z" fill="${BRANCO}"/>` + linhas(760, 2, 200), { x: 540, y: 820 + (1 - kv) * 30, op: kv })
        : g(linhas(760, 10, -260), { x: 540, y: 830 });
      return `<rect x="96" y="396" width="888" height="760" rx="18" fill="#cfccc6" ${S6}/>` + ord.map(i => tabs[i]).join('') +
        `<rect x="100" y="462" width="880" height="690" fill="${BRANCO}"/><path d="M96 462H984" ${S6}/><rect x="130" y="486" width="820" height="56" rx="28" fill="#ece8e1" stroke="${TINTA}" stroke-width="4"/>` + corpo +
        `<rect x="96" y="396" width="888" height="760" rx="18" fill="none" ${S6}/>`; };
    return [cam([tela, t => surge(browser(t), t, .0, { dy: 20 }), t => cursor(qb([560, 840], [400, 560], [428, 440], io(clamp((t - tc + .55) / .55))), t, tc)], d)]; },
  M04: (a, d) => [cam([t => surge(cartao(720, 620, { r: 26 }) + `<path d="M-360 -192V-284q0 -26 26 -26H334q26 0 26 26V-192Z" fill="${VERM}" ${S6}/><circle cx="-200" cy="-310" r="16" fill="${TINTA}"/><circle cx="200" cy="-310" r="16" fill="${TINTA}"/>`, t, .02, { x: 540, y: 760 }),
    t => pop(T('2004', 0, 0, 260, TINTA, 900), t, pw(a, 'dois'), 540, 900)], d)],
  M05a: (a, d) => { const I = img(`${OUTD}/print_topo.png`, 1000);
    return [cam([t => { const k = ent(t, 0, .7); return g(I.svg, { x: 540, y: 640 + (1 - k) * 40, s: 1 + .04 * t / d, op: k }); },
      t => surge(cartao(660, 210, { r: 24 }) + `<rect x="-330" y="-105" width="16" height="210" rx="6" fill="${AMAR}"/>`, t, pw(a, 'gloria'), { x: 540, y: 1080 }),
      t => pop(T('Gloria Mark', 0, 0, 76), t, pw(a, 'gloria') + .08, 540, 1075),
      t => pop(T('UC Irvine', 0, 0, 50, '#555', 600), t, pw(a, 'uc'), 540, 1145)], d)]; },
  M05b: (a, d) => { const I = img(`${OUTD}/print_trecho.png`, 1000), s0 = 1000 / 1220, F = [-500 + s0 * 578, -I.h / 2 + s0 * 152], tm = pw(a, 'média');
    return [raw('trecho', t => { const k = io(clamp((t - pw(a, 'publicou')) / 1.1)), s = 1 + .38 * k, gk = io(clamp((t - tm) / .6));
      const hl = gk > 0 ? `<rect x="${-500 + s0 * 378}" y="${-I.h / 2 + s0 * 126}" width="${s0 * 402 * gk}" height="${s0 * 52}" rx="6" fill="${AMAR}" opacity=".5"/>` : '';
      return `<g transform="translate(${540 + lerp(0, -F[0], k) * s} ${720 + lerp(0, -F[1], k) * s}) scale(${s})">${I.svg}${hl}</g>`; }),
    raw('cred', t => txt('Gloria Mark · UC Newsroom, 2024', 540, 1060, { tam: 40, peso: 600, cor: '#555', op: ent(t, .2) }))]; },
  M06: (a, d) => { const tf = pw(a, 'meio'), H = 640;
    return [cam([t => surge(g(barra(240, H, 1, AZUL), { x: 200, y: 1180 }) + T('2:30', 320, 1180 - H - 40, 120) + T('2004', 320, 1270, 64, '#555', 700), t, .02, { dy: 30 }),
      t => { const k = io(clamp((t - tf) / 1.0)), v = Math.round(lerp(150, 47, k)), h = H * lerp(1, 47 / 150, k), e = ent(t, .12, .5);
        return g(g(barra(240, H, h / H, k > 0 ? VERM : CINZA), { x: 640, y: 1180 }) + T(`${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`, 760, 1180 - h - 40, k > .5 ? 170 : 120, k > .5 ? VERM : TINTA, 900) + T('hoje', 760, 1270, 64, '#555', 700), { y: (1 - e) * 30, op: e }); }], d)]; },
  M07: (a, d) => { const ti = pw(a, 'interrupção');
    return [cam([t => { const k = Math.min(lerp(.08, .74, clamp(t / (ti + .3))), lerp(.08, .74, clamp(ti / (ti + .3)))), sh = t > ti ? 8 * Math.sin((t - ti) * 40) * Math.exp(-(t - ti) * 5) : 0;
      return surge(g(cartao(840, 360, { r: 26 }) + txt('Relatório', -360, -70, { tam: 60, peso: 800, anc: 'start' }) + txt(`${Math.round(k * 100)}%`, 360, -70, { tam: 52, peso: 700, anc: 'end', cor: '#555' }) +
        g(barraH(720, 50, k, t > ti ? CINZA : TURQ), { x: -360, y: 60 }), { x: sh }), t, .02, { x: 540, y: 860 }); },
      t => { const k = ent(t, ti, .5); return k ? g(cartao(780, 170, { r: 30 }) + g(ICON.sino, { x: -300, y: -8, s: .9 }) + txt('Nova mensagem', -220, 18, { tam: 54, peso: 800, anc: 'start' }) + `<circle cx="320" cy="0" r="18" fill="${VERM}"/>`, { x: 540, y: 600 - (1 - k) * 80, op: k }) : ''; }], d)]; },
  M08: (a, d) => { const th = pw(a, 'hora'), R = 300;
    return [cam([t => { const k = io(clamp((t - .15) / (th - .15))), an = 180 * k, r = an * Math.PI / 180, ex = R * .92 * Math.sin(r), ey = -R * .92 * Math.cos(r);
      const sec = k > .001 ? `<path d="M0 0V${-R * .92}A${R * .92} ${R * .92} 0 ${an > 180 ? 1 : 0} 1 ${ex} ${ey}Z" fill="${AMBAR}" opacity=".75"/>` : '';
      const tic = Array.from({ length: 12 }, (_, i) => `<path d="M0 ${-R + 22}V${-R + (i % 3 ? 44 : 62)}" stroke="${TINTA}" stroke-width="${i % 3 ? 6 : 10}" stroke-linecap="round" transform="rotate(${i * 30})"/>`).join('');
      return surge(`<circle r="${R}" fill="${BRANCO}" stroke="${TINTA}" stroke-width="10" stroke-linejoin="round"/>` + sec + tic + `<path d="M0 0L0 ${-R * .8}" stroke="${TINTA}" stroke-width="14" stroke-linecap="round" transform="rotate(${an})"/><path d="M0 0L0 ${-R * .5}" stroke="${TINTA}" stroke-width="18" stroke-linecap="round" transform="rotate(${an / 12})"/><circle r="20" fill="${TINTA}"/>`, t, .02, { x: 540, y: 700 }); },
      t => pop(T('quase', 0, 0, 64, '#555', 700), t, pw(a, 'quase'), 540, 1100), t => pop(T('30 min', 0, 0, 170, VERM, 900), t, pw(a, 'meia'), 540, 1270)], d)]; },
  M09: (a, d) => { const tb = pw(a, 'olhar');
    return [cam([t => { const b = 1 - .95 * Math.sin(Math.PI * clamp((t - tb) / .26)), gx = 60 * io(clamp((t - tb - .2) / .4)), gy = 30 * io(clamp((t - tb - .2) / .4));
      return surge(`<clipPath id="olho"><path d="M-320 0Q0 -280 320 0Q0 280 -320 0Z"/></clipPath><g transform="scale(1 ${b})"><path d="M-320 0Q0 -280 320 0Q0 280 -320 0Z" fill="${BRANCO}"/>` +
        `<g clip-path="url(#olho)"><circle cx="${gx}" cy="${gy}" r="112" fill="${AZUL}" ${S6}/><circle cx="${gx}" cy="${gy}" r="52" fill="${TINTA}"/><circle cx="${gx + 34}" cy="${gy - 36}" r="20" fill="${BRANCO}"/></g>` +
        `<path d="M-320 0Q0 -280 320 0Q0 280 -320 0Z" fill="none" stroke="${TINTA}" stroke-width="10" stroke-linejoin="round"/></g>`, t, .02, { x: 540, y: 700 }); },
      t => pop(T('1 s', 0, 0, 240, TURQ, 900), t, pw(a, 'um'), 540, 1180)], d)]; },
  M10: (a, d) => { const tv = pw(a, 'voltar');
    return [cam([t => surge(txt('olhar', 120, 560, { tam: 64, peso: 800, anc: 'start' }) + g(barraH(840, 70, .02, TURQ), { x: 120, y: 640 }) + txt('1 s', 230, 664, { tam: 64, peso: 900, anc: 'start', cor: TURQ }), t, .02, { dy: 30 }),
      t => surge(txt('voltar', 120, 860, { tam: 64, peso: 800, anc: 'start' }) + g(barraH(840, 70, Math.max(.02, clamp((t - tv) / 1.4)), VERM), { x: 120, y: 940 }), t, tv - .1, { dy: 30 }),
      t => pop(T('até 30 min', 0, 0, 150, VERM, 900), t, pw(a, 'bem'), 540, 1210)], d)]; },
  M11: (a, d) => { const tc = pw(a, 'ciência');
    return [cam([t => pop(T('Manual do Quase Adulto', 0, 0, 62, TINTA, 800), t, 0, 540, 560, .4),
      t => { const on = t >= tc, k = ent(t, .06, .45), kc = ent(t, tc, .35);
        return k ? g(`<rect x="-300" y="-80" width="600" height="160" rx="80" fill="${on ? TURQ : VERM}" ${S6}/>` + (on ? g(ICON.check, { x: -190, s: .7 * (.8 + .2 * kc), op: kc }) + T('Seguindo', 50, 28, 76, BRANCO) : T('Seguir', 0, 30, 84, BRANCO)), { x: 540, y: 800 + (1 - k) * 30, s: (.9 + .1 * k) * (on ? 1 - .05 * Math.sin(Math.PI * clamp((t - tc) / .2)) : 1), op: k }) : ''; },
      t => { const k = ent(t, .1, .4); return k ? g(cursor(qb([860, 1180], [880, 900], [620, 840], io(clamp((t - .15) / (tc - .2)))), t, tc), { op: k }) : ''; }], d)]; },
};

const pr = new Proj(), ids = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : Object.keys(SC), jobs = [];
fs.mkdirSync(`${HERE}/prev`, { recursive: true }); fs.mkdirSync(OUTD, { recursive: true });
for (const id of ids) {
  const [a, b] = SC[id], c = pr.comp(id, (Math.round(b * 24) - Math.round(a * 24)) / 24);
  pr.layers(c, [fundo(PAPEL), C[id](a, b - a)]);
  if (process.argv[3]) jobs.push(...process.argv[3].split(';').map((s, j) => frame(id, s === 'm' ? (b - a) * .75 : s === 'e' ? b - a - .05 : +s, `${HERE}/prev/m002_${id}_${j}.png`)));
  else jobs.push(video(id, `${OUTD}/${id}.mp4`));
}
await pr.run(jobs);
