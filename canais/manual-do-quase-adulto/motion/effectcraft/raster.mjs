import { parentPort } from 'worker_threads'; import { Resvg } from '@resvg/resvg-js'; import { FONT } from './kit.mjs';
parentPort.on('message', ({ k, svg }) => { const p = new Resvg(svg, { font: FONT }).render().pixels; parentPort.postMessage({ k, p }); });
