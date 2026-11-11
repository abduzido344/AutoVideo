# Teste isolado LTX-2.3 / Modal

Uma B200 sob demanda, sem endpoint permanente, sem volume de pesos e sem integrar ao pipeline de produção.

```powershell
$env:PYTHONIOENCODING='utf-8'
modal run sistema/testes/ltx_modal/teste.py --ok
```

Gera um robô acenando: 121 frames, 24 fps, 1920×1088, com crop central para 1920×1080. Resultado em `resultado/ltx23_1080p.mp4` e `resultado/metricas.json`.

Configuração inicial: LTX-2.3 Distilled, BF16, atenção TORCH_SDPA, 8 passos + 3 de refinamento, sem torch.compile. É uma validação funcional; não reproduz o benchmark NVFP4/compilado de 4,5 segundos do FastVideo.

Os pesos são baixados em CPU durante a construção da imagem. A função GPU tem timeout de 900 segundos, retries=0 e no máximo um container. A execução usa `modal run` e termina ao retornar. O limite não inclui build, fila, inicialização ou recursos auxiliares. B200: US$0,001736/s na tabela consultada em 10/11/2026.

Fontes: https://github.com/hao-ai-lab/FastVideo e https://modal.com/pricing

## Resultado de 10/11/2026

- Execução: https://modal.com/apps/abduzido344/main/ap-HvbTloVDbjIQJujsmWHwYs
- Sucesso: MP4 H.264, 1920×1080, 121 frames, 24 fps, 5,04 s, áudio AAC estéreo 48 kHz, 3,82 MB.
- Carregamento inicial medido: 43,46 s. O encoder Gemma tem carregamento adicional dentro da primeira geração.
- Primeira geração até MP4: 73,14 s. Sem medição aquecida.
- Função remota antes de shutdown: 117,32 s. Inclui carregamento, geração e crop.
- Etapas nos logs: prompt/encoder 16,59 s; geração-base 18,76 s; upscale 0,39 s; refinamento 33,58 s; áudio 0,56 s; decode 2,64 s.
- Pipeline: geração-base 960×544 → upscale e refinamento em 1920×1088 → crop central para 1920×1080.
- Pico de memória alocada observado nos logs: 109,80 GiB na decodificação. Esta configuração não cabe diretamente em H100 de 80 GB sem adaptações.
- Estimativa somente GPU: geração ≈ US$0,127; 117,32 s medidos ≈ US$0,204. Não é cobrança final: faltam imports, shutdown, inicialização, CPU/RAM e build.
- Preparação inicial: download 2min48s; salvar imagem com pesos 96 s. Execução inteira no painel: aproximadamente 9 minutos, incluindo build.
- Confirmado via `modal app list --json`: app `stopped`, zero tasks. Nenhum endpoint permanente ou volume de pesos criado.
- Folha de contato: personagem e oficina visualmente consistentes nos cinco instantes, com braço subindo e cabeça virando. Isso não substitui revisão da fluidez ou do áudio.

O teste valida execução e saída Full HD. Não valida a receita compilada/NVFP4 nem o tempo publicado de 4,5 s. Próximo experimento sugerido: uma configuração otimizada separada, com aquecimento e medições repetidas.

## Teste com referência / GPUs menores

`referencia_robo.png` é o primeiro quadro do vídeo original. A mesma imagem, prompt e seed são usados nas duas placas, com força 1,0 no quadro inicial. São duas gerações por placa: primeira e aquecida, sem torch.compile.

```powershell
$env:PYTHONIOENCODING='utf-8'
modal run sistema/testes/ltx_modal/comparar.py --ok
# Apenas uma placa:
modal run sistema/testes/ltx_modal/comparar.py --gpu l40s --ok
```

RTX PRO 6000: BF16, VAE com tiling, offload do encoder de texto. L40S: lineares FP8, VAE com tiling, encoder e gerador alternados explicitamente entre GPU e RAM. As receitas diferem; isto compara configurações viáveis por placa, não a mesma carga numérica em hardware diferente.

A primeira tentativa da L40S esgotou a memória na leitura do prompt: as flags comuns de offload mantinham o gerador FP8 e o Gemma juntos na GPU. O script agora estaciona o gerador em CPU antes do prompt, move o encoder para CPU após usá-lo e traz o gerador para a GPU só durante cada etapa de denoising. O ajuste é local ao processo de teste, sem modificar o pacote instalado. Dados da falha preservados em `comparacao/l40s/metricas_tentativa1.json`.

Resultados e vídeos ficam em `comparacao/rtx_pro_6000/` e `comparacao/l40s/`. Logs completos em `comparacao_execucao.log` e `l40s_ajuste_execucao.log`.
