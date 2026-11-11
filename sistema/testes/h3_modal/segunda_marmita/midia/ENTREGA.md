# A segunda marmita

`final.mp4` — reel vertical 1080×1920, 24 fps, H.264 High/yuv420p, AAC 48 kHz. Vídeo de 51,125 s (1.227 frames), sincronizado à narração de 51,137 s; diferença de 12 ms por arredondamento a quadro. Container e stream AAC chegam a 51,200 s por cauda de codificação/filtragem. Ampliação do material original 480×832, sem alegação de detalhe 1080p nativo.

Seis cenas ClipProj4B + H3 Turbo6, narração sintética em português e legendas queimadas em área segura. Cenas desaceleradas a 0,833×; último quadro sustentado com zoom suave de até 2,5% para acompanhar a fala. Cena03 usa somente os primeiros dois segundos válidos do original, preservando a marmita; o trecho defeituoso posterior foi excluído. Cena04 reaproveita exclusivamente a geração baseada em `04_o_professor_v3.png`.

Som original dos clipes H3 descartado. Trilha original sintetizada localmente, sem samples de terceiros, discreta e com ducking. Voz criada com Fish Audio Drama3: **Built with Fish Audio**. Crédito também em metadata `comment` do MP4, sem card ou acréscimo de duração.

Validação: ffprobe contou 1.227 frames em 1080×1920/24; decodificação ffmpeg completa sem erros; blackdetect sem intervalos pretos; loudness integrado −14,1 LUFS, LRA 2,2 LU, true peak −1,3 dBFS após AAC. Folha `contato_final.jpg` inspecionada: texto dentro da área segura, sem título grande ou sobreposição nos rostos. Pequenas variações de mãos/expressões inerentes aos clipes permanecem; não houve nova GPU de montagem nem publicação.

Reprodução: `python sistema/testes/h3_modal/segunda_marmita/midia/montar_reel.py --render`. EDL, ASS/SRT, fontes tratadas, trilha, ffprobe e logs de validação ficam nesta pasta.
