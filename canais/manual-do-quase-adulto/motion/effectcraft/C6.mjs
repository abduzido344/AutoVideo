import { Proj, personagem, rig, camPose, cam, shapeL, G, rr, ell, poly, tr, io, out, sm, piscar, add, frame, video, HERE, OUT, C, LW } from './kit.mjs';
import { quartoMesa, mesaFrente, cadernoMesa, mesaCima, maoCima, dk, quadDk, sombra } from './mesa.mjs';

const CF = { a: [960, 590], p: [960, 540], s: 1.45 };
const AZUL = '#34507a';
const capaCima = (nm, x, y, k = 1) => [sombra('Sombra ' + nm, rr(x - 250 * k + 18, y - 330 * k + 18, 500 * k, 660 * k, 18), 25, 12),
  shapeL(nm, [G('elástico', rr(x + 150 * k, y - 330 * k, 22 * k, 660 * k, 4), '#1f2f4a'), G('capa', rr(x - 250 * k, y - 330 * k, 500 * k, 660 * k, 18 * k), AZUL, [C.ink, LW])])];

const FOTO = [1.55, 2.45];
const flash = t => FOTO.reduce((a, f) => Math.max(a, 1 - Math.abs(t - f) / .08), 0);
const p1 = () => {
  const tremor = t => [3 * Math.sin(t * 5.1), 4 * Math.sin(t * 3.7 + 1) + 6 * flash(t)];
  const tel = t => add([960, 540], tremor(t));
  return [...mesaCima(), ...capaCima('Caderno', 960, 600, 1.15),
    sombra('Sombra do celular', rr(810, 280, 370, 600, 40), 30, 30),
    shapeL('Celular', [G('foco', rr(-60, -60, 120, 120, 6), null, ['#ffffff', 4]),
      G('prévia caderno', rr(-150, -200, 300, 400, 10), AZUL, [C.ink, 3]), G('prévia mesa', rr(-230, -410, 460, 820, 28), MADP),
      G('tela', rr(-246, -426, 492, 852, 36), '#111'), G('celular', rr(-262, -444, 524, 888, 52), '#17191c', [C.ink, LW])], { pos: tel, rot: t => 1.5 * Math.sin(t * 2), scale: 66 }),
    shapeL('Flash', [G('f', rr(-230, -410, 460, 820, 28), '#ffffff')], { pos: tel, rot: t => 1.5 * Math.sin(t * 2), scale: 66, op: t => 85 * flash(t) }),
    shapeL('Mão E', maoCima(true), { pos: t => add(tel(t), [-178, 120]), rot: 62, scale: 80 }),
    shapeL('Mão D', maoCima(true), { pos: t => add(tel(t), [178, 120]), rot: -62, scale: [-80, 80] })];
};
const MADP = '#b9946b';

const fecha = tr([[0, 0], [.45, 0], [1.05, 1, io]]), empurra = tr([[0, 0], [1.4, 0], [2.2, 1, io]]);
const reage = t => { const f = fecha(t), e = empurra(t), k = 1 - f, borda = dk(1010 + 170 * k + 300 * e, .5 - .15 * e);
  const solta = tr([[0, 0], [2.25, 0], [2.7, 1, io]])(t);
  return { pos: [960, 880], s: .56, cab: 3 * sm((t - 1.1) / .4) - 3 * solta, resp: 1,
    punho: { E: dk(860 + 20 * f, .52), D: solta > 0 ? add(add(borda, [26, -40]), [-120 * solta, 30 * solta]) : add(borda, [26, -40 + 18 * Math.sin(Math.PI * f) * -1]) },
    polo: { E: [420, 1100], D: [1000, 1100] }, encurta: { D: [1, .8] },
    mao: { E: 'apoio', D: f > 0 && f < 1 ? 'pega' : 'apoio' }, giroMao: { E: 10, D: -20 },
    rosto: { gx: 6 * e, gy: 16 - 14 * solta, open: piscar(t, [.3, 2.6]), lid: .25 + .1 * sm((t - 1.1) / .3), brow: 2, smile: .3 + .5 * sm((t - .9) / .5), mw: 1.1 } };
};
const p2 = () => { const q = camPose(reage, CF), P = rig(q), f = t => fecha(t), e = t => empurra(t);
  const fone = cam([shapeL('Celular na mesa', [G('celular', quadDk(700, .4, 70, .35), '#17191c', [C.ink, 4])])], CF);
  return [...quartoMesa(CF), personagem(q, { P, nome: 'P2', ordem: ['pernaE', 'pernaD', 'tênisE', 'tênisD', 'tronco', 'cabeça', 'rosto', ...mesaFrente(CF), ...fone,
    ...cadernoMesa(1010, .5, { aberto: t => 1 - f(t), desloca: t => [300 * e(t), -.15 * e(t)] }, CF), 'mãoE', 'braçoE', 'mãoD', 'braçoD'] })]; };

const SH = [['P1 · close de cima', 3, p1], ['P2 · reação frontal', 3, p2]];
const pr = new Proj(); let t0 = 0; const cs = [];
for (const [n, d, f] of SH) { const c = pr.comp('C6 ' + n, d); pr.layers(c, f()); cs.push([c, t0, t0 + d]); t0 += d; }
pr.layers(pr.comp('C6', t0), cs.map(([c, a, b], k) => ({ name: SH[k][0], comp: c, t0: a, t1: b })));
const arg = process.argv[2];
await pr.run(arg ? arg.split(',').map(s => frame('C6', +s, `${HERE}/prev_${s}.png`)) : [video('C6', `${OUT}/C6.mp4`)]);
