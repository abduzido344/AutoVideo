"""Pinta os vértices de um GLB projetando a imagem de frente (a mesma usada no modal_3d.py). Local, sem GPU.

Uso: python sistema/pipeline/cor3d.py malha.glb imagem.png saida.glb
Visível de frente → cor da imagem; escondido (costas, nuca) → cor espalhada dos vizinhos visíveis pela malha.
"""
import sys
import numpy as np
import trimesh
from PIL import Image
from scipy import ndimage, sparse

malha = trimesh.load(sys.argv[1], force="mesh")
im = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(np.float32)
H, W, _ = im.shape

borda = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
mascara = ndimage.binary_fill_holes(np.abs(im - np.median(borda, 0)).max(2) > 45)
rotulos, n = ndimage.label(mascara)
mascara = np.isin(rotulos, np.nonzero(np.bincount(rotulos.ravel()) > 2000)[0][1:])
_, (iy, ix) = ndimage.distance_transform_edt(~mascara, return_indices=True)
cheia = im[iy, ix]

ys, xs = np.nonzero(mascara)
(x0, y0, _), (x1, y1, _) = malha.bounds
s = (ys.max() - ys.min()) / (y1 - y0)
cx_img = (xs.min() + xs.max()) / 2


def pixel(p):
    u = np.clip(np.round(cx_img + (p[:, 0] - (x0 + x1) / 2) * s), 0, W - 1).astype(int)
    v = np.clip(np.round(ys.min() + (y1 - p[:, 1]) * s), 0, H - 1).astype(int)
    return u, v


pts, _ = trimesh.sample.sample_surface(malha, 400_000, seed=1)
zbuf = np.full((H, W), -np.inf)
u, v = pixel(pts)
np.maximum.at(zbuf, (v, u), pts[:, 2])
zbuf = ndimage.maximum_filter(zbuf, 3)

u, v = pixel(malha.vertices)
visivel = (malha.vertices[:, 2] >= zbuf[v, u] - 0.04 * (y1 - y0)) & (malha.vertex_normals[:, 2] > 0.1)
cor = (cheia[v, u] / 255) ** 2.2
a, b = malha.edges_unique.T
viz = sparse.coo_matrix((np.ones(2 * len(a)), (np.r_[a, b], np.r_[b, a])), shape=(len(cor),) * 2).tocsr()
viz = sparse.diags(1 / np.maximum(viz.sum(1).A1, 1)) @ viz
cor[~visivel] = cor[visivel].mean(0)
for _ in range(4000):
    cor[~visivel] = (viz @ cor)[~visivel]
malha.visual = trimesh.visual.ColorVisuals(malha, vertex_colors=np.c_[cor * 255, np.full(len(cor), 255)].astype(np.uint8))
malha.export(sys.argv[3])
print(f"{visivel.mean():.0%} dos vértices pintados pela frente → {sys.argv[3]}")
