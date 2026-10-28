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

## Site público

A publicação inicial em https://guardiao-das-ruinas.vercel.app/ foi exercitada em navegador sem autenticação. A missão inteira foi vencida com entradas normais: pegar o bloco com E, encaixar no pedestal, atravessar com avanço/pulo, carregar e soltar magias e usar escudo. Não houve acesso a estado interno, teletransporte ou alteração de HP/dano. A inspeção de desenvolvimento não está exposta no build público.

Uma segunda sessão carregou uma fotografia de duas mãos por câmera sintética e executou os modelos reais em modo compatível. Verificou `2/2`, entrada na missão e encerramento de todas as tracks ao desligar a câmera. Nenhum erro JavaScript nem requisição para outra origem foi observado nessa sessão. Isso continua sendo validação com imagem de teste, não uma webcam física.

## Revisão de arte 3D — 28/10/2026

- Dez skills MIT de Three.js instaladas com origem e versão registradas em `3D-SKILLS.md`.
- Mago KayKit CC0 com rig e 12 animações; GLB reduzido de 3.589.240 para 751.876 bytes. O validador glTF não encontrou erros; registrou avisos de hierarquia de meshes com skin herdados do modelo. Transformações e animações são verificadas no navegador.
- 20 testes unitários aprovados, incluindo integridade do GLB, esqueleto, animações necessárias e limite de tamanho. Build e formatação aprovados.
- Revisão visual encontrou e corrigiu rochas acima do piso e orientação do cajado. O cajado acompanha a posição da mão; o piso permanece livre para leitura do mago e do enigma.
- Materiais com cor/normal, pedra chanfrada, pilares torneados, frondes, guardião articulado, luz ambiente pré-filtrada e bloom opcional. O modo leve mantém os recursos artísticos, limita a largura do canvas a 960 pixels (480 em software), desenha a até 30 FPS (15 em software) sem limitar a leitura de entrada ou os passos da simulação e inicia automaticamente em renderizadores por software.

A execução da missão detectou que ações curtas podiam ser drenadas em um quadro sem passo de física. A leitura que consome pegar/lançar agora ocorre somente quando há pelo menos um passo acumulado. Isso preserva os eventos de teclado e mãos sem alterar dano, vida ou regras da missão.

### Resultado final da revisão

- 13 testes Chromium aprovados em uma execução completa: animações, materiais, erro de download do personagem, missão inteira, derrota/reinício, permissões, cancelamento, reconhecimento normal/compatível, preservação da webcam, perda/retorno de mãos e toque simultâneo em retrato/paisagem.
- A missão completa usa comandos normais, carga real das magias e impacto dos projéteis, com HP/dano originais. O teste aguarda cada impacto antes do próximo lançamento.
- Modo de qualidade inspecionado a 800×600: sombras e bloom ativos, sem erros JavaScript; `renderer.info` registrou 334 chamadas e 560.872 triângulos no quadro completo. O teste do modo leve exige menos de 220 chamadas e preservação dos normal maps. Essas amostras não medem desempenho de uma GPU física.
- Capturas de título, jogo, pausa, vitória, derrota, preparação da câmera, 390×844 e 844×390 revisadas. Controles e prévia permanecem acessíveis; o mago contrasta com o piso e os alvos do enigma continuam visíveis.
