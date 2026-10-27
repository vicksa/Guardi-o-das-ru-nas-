# Verificação

História verificada: abrir o jogo → entrar por teclado/toque ou autorizar a câmera → interpretar controles → mover o mago no mundo 3D → levar o bloco ao pedestal → atravessar a ponte e o vão → enfrentar o guardião → vencer/reiniciar. Não há API de jogo nem banco: captura e inferência acontecem no dispositivo; a Vercel serve arquivos estáticos.

## Evidências e limites

- Testes unitários cobrem reconhecimento de gestos, movimentos curtos, movimento/pulo simultâneos, carga/liberação de magia, perda de mão, plataformas, ponte, telecinese, salto sem dupla decolagem no ar, queda, refúgio, dano, escudo, telegráficos, vitória, pausa e reinício.
- Testes de navegador percorrem entradas comuns pela interface e usam modelos reais com uma fotografia de duas mãos, via canvas/captureStream. Não comprovam a webcam física do usuário, precisão sob pouca luz ou desempenho em todos os telefones.
- O teste da missão completa não modifica vida, posição, objetivos ou dano. O teste isolado de derrota ajusta a posição/vida para reproduzir a queda sem esperar várias tentativas; o da câmera usa o mesmo gatilho para verificar que seu MediaStream continua vivo ao reiniciar.
- No ambiente de teste, o desenho 3D usa GPU emulada e é mais lento que uma GPU física. O modo leve e o passo fixo evitam que a física dependa da quantidade de quadros desenhados. Isso não é uma medição de desempenho de aparelhos físicos.
- Capturas de título, jogo, pausa, derrota, vitória, câmera e telas estreitas são inspecionadas segundo a skill local de revisão visual.

## Resultado — 27/10/2026

- 19 testes unitários aprovados.
- 10 testes Chromium aprovados, incluindo a vitória com a vida e o dano originais, por entradas normais de teclado. O percurso foi ajustado para controles por visão: o vão ficou menor e há 160 ms de tolerância após sair da borda e 180 ms de buffer de salto. Ainda há apenas uma decolagem por apoio.
- Câmera normal e compatível reconheceram duas mãos fotografadas enquanto o mundo 3D era renderizado. O teste do modo compatível também trocou os quadros por preto, exigiu pausa por perda de mãos e retomada automática ao restaurar a imagem. Morrer/reiniciar preservou o mesmo stream e suas tracks vivas; desligar encerrou as tracks.
- Teclado, toque com dois ponteiros, pulo andando, permissão negada, conexão pendente/cancelamento, pausa, refúgio, vitória e derrota aprovados. Viewports móveis: 390×844 e 844×390; preparo da câmera também inspecionado em retrato.
- Build TypeScript/Vite aprovado. O chunk compatível de TensorFlow.js mantém o aviso de tamanho superior a 500 kB e é carregado sob demanda.
- Capturas de abertura, fase, enigma, vitória, derrota, pausa e câmera revisadas. Um gradiente discreto foi acrescentado ao cabeçalho para manter seus controles legíveis sobre a lua clara; não altera gameplay.

O fluxo é inteiramente cliente → modelos locais/regras → renderização Three.js. Nenhuma imagem é enviada à API. A imagem de teste não valida movimentos de mãos reais nem limitações de webcams físicas.
