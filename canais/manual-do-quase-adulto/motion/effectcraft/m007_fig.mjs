import { prota, piscar } from './vetor.mjs';

const K6 = 'stroke="#111" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"';
const oculosRedondo = (y, dx, r) => `<g fill="#fff" fill-opacity=".18" ${K6}><circle cx="${-dx}" cy="${y}" r="${r}"/><circle cx="${dx}" cy="${y}" r="${r}"/></g><path d="M${-dx + r} ${y - 4}q${dx - r} -12 ${2 * (dx - r)} 0" fill="none" ${K6}/>`;
const oculosReto = (y, dx, w, h) => `<g fill="#fff" fill-opacity=".18" ${K6}><rect x="${-dx - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="9"/><rect x="${dx - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="9"/></g><path d="M${-dx + w / 2} ${y - 4}h${2 * dx - w}" ${K6}/>`;

export const FIGURANTES = {
  jorge: { pers: 'vetor', esc: [1.08, 1.06], pescoco: -302,
    cor: { pele: '#8C5A3C', mao: '#6B4430', roupa: '#6b5440', calca: '#b9a27a', tenis: '#5a3a22', detalhe: '#3f4a5c' },
    corpo: `<path d="M-48 -290h96l-8 230h-80z" fill="#cfe0ee" ${K6}/><path d="M0 -282l-16 26l16 150l16 -150z" fill="#8a2f2f" ${K6}/>`,
    frente: `<path d="M-120 -440q-8 -70 34 -104M120 -440q8 -70 -34 -104" fill="none" stroke="#111" stroke-width="34" stroke-linecap="round"/><path d="M-120 -440q-8 -70 34 -104M120 -440q8 -70 -34 -104" fill="none" stroke="#a9a9a9" stroke-width="22" stroke-linecap="round"/>` +
      `<path d="M-114 -432Q-106 -326 0 -314Q106 -326 114 -432Q96 -372 0 -352Q-96 -372 -114 -432Z" fill="#a9a9a9" ${K6}/><path d="M-44 -402q44 -20 88 0q-44 10 -88 0z" fill="#a9a9a9" ${K6}/>` + oculosRedondo(-450, 52, 36) },
  leo: { pers: 'vetor', esc: [.96, .9], pescoco: -302,
    cor: { pele: '#EBCDAE', mao: '#d6b08a', roupa: '#E9C23F', calca: '#4a5a3a', tenis: '#f2f2f2', detalhe: '#c99a1e' },
    frente: [[-112, -455], [112, -455], [-100, -500], [100, -500]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24" fill="#7a4a2a" ${K6}/>`).join('') +
      `<path d="M-122 -486Q-118 -598 0 -600Q118 -598 122 -486Z" fill="#C8473A" ${K6}/><path d="M-10 -598v-14" ${K6}/><path d="M-130 -486Q0 -470 150 -492Q160 -470 140 -462Q0 -448 -130 -466Z" fill="#9e3328" ${K6}/>` +
      [[-72, -410], [-60, -400], [-84, -398], [72, -410], [60, -400], [84, -398]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#b5835a"/>`).join('') },
  dani: { pers: 'feminina', esc: [1, 1.05], pescoco: -235,
    cor: { pele: '#B07850', mao: '#8A5A3C', roupa: '#D9654B', calca: '#2d3e66', tenis: '#f2f2f2', detalhe: '#D9654B' },
    frente: `<circle cx="0" cy="-468" r="44" fill="#2a1a12" ${K6}/><path d="M-90 -350Q-96 -450 0 -452Q96 -450 90 -350Q76 -410 20 -416Q-10 -392 -60 -400Q-82 -384 -90 -350Z" fill="#2a1a12" ${K6}/>` +
      `<circle cx="-94" cy="-296" r="13" fill="none" stroke="#E3A33B" stroke-width="6"/><circle cx="94" cy="-296" r="13" fill="none" stroke="#E3A33B" stroke-width="6"/>` },
  bia: { pers: 'feminina', esc: [1.06, .98], pescoco: -235,
    cor: { pele: '#5C3A28', mao: '#4a2e20', roupa: '#3D7FB8', calca: '#2D2D2D', tenis: '#E3A33B', detalhe: '#3D7FB8' },
    corpo: `<path d="M-80 -232q80 40 160 0l6 34q-86 44 -172 0z" fill="#E3A33B" ${K6}/><path d="M40 -206l18 90l-30 4z" fill="#E3A33B" ${K6}/>`,
    atras: `<circle cx="0" cy="-372" r="140" fill="#1a1210" ${K6}/><circle cx="-110" cy="-300" r="62" fill="#1a1210" ${K6}/><circle cx="110" cy="-300" r="62" fill="#1a1210" ${K6}/>`,
    frente: `<path d="M-86 -372Q-80 -452 0 -454Q80 -452 86 -372Q60 -420 0 -418Q-60 -420 -86 -372Z" fill="#1a1210" ${K6}/>` + oculosReto(-342, 40, 62, 44) },
};

export const figurante = (nome, f) => { const F = FIGURANTES[nome], pe = F.pers === 'feminina' ? 472 : 494;
  const L = prota(t => { const q = f(t); return { tronco: 0, cab: 0, ...q, pecas: { cabelo: null, cabeloTras: null }, rosto: { pisca: piscar(t, [1.7, 4.2, 6.6]), ...(q.rosto || {}) } }; }, { pers: F.pers, variante: F.cor, nome });
  return { name: nome, raw: t => { const q = f(t), s = q.s ?? .5, [x, y] = q.pos, fy = y + pe * s, r = (q.tronco || 0) + (q.cab || 0);
    const ac = b => b ? `<g transform="translate(${x} ${y}) scale(${s}) rotate(${r} 0 ${F.pescoco})">${b}</g>` : '';
    return `<g transform="translate(${x} ${fy}) scale(${F.esc[0]} ${F.esc[1]}) translate(${-x} ${-fy})">${ac(F.atras)}${L.raw(t)}${F.corpo ? `<g transform="translate(${x} ${y}) scale(${s}) rotate(${q.tronco || 0})">${F.corpo}</g>` : ''}${ac(F.frente)}</g>`; } };
};
