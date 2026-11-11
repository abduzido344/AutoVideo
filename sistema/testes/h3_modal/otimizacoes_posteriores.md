# Testes posteriores — proposta enviada pelo usuário

Registrado em 10/11/2026. Não altera o baseline atual; nenhuma execução autorizada por este registro.

1. Encoder menor: testar Qwen3-VL-4B/8B com as projeções de adaptação ClipProj, mantendo o restante fixo. Não é uma troca direta de qualquer Qwen-4B. Comparar aderência ao prompt, identidade e custo total; economia no encoder não significa que todo o H3 caiba em 6–8 GB.
2. Turbo LoRA Larry v4-600 EMA: comparar 6 e 8 passos com o baseline FL2VA; validar carregamento e scheduler na implementação escolhida. Não confundir LoRA do modelo base com FastH3-QAD-v2 destilado.
3. Duas passagens: gerar em 480p/768p, ampliar latentes H3 com ferramenta compatível e refinar. Comparar também upscale simples. Denoise 0,35 é hipótese inicial, não valor universal; verificar preservação de mãos, rostos e estabilidade temporal.

Usar mesma cena, referência e seed, alterando um componente por vez. Registrar tempo frio/quente, memória, custo por clipe e avaliação visual. Testes adiados até concluir o primeiro baseline.

Fontes primárias verificadas:

- https://huggingface.co/NicoLab28/ClipProj-MiniMax-H3
- https://github.com/nicolab28/ComfyUI-ClipProj
- https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora
- https://github.com/rockerBOO/h3-latent-upscaler

As alegações de desempenho e qualidade nesses projetos são dos autores e ainda não foram reproduzidas aqui.
