# Arte, modelos e licenças

O mago, o guardião, ilhas, vegetação, colunas, portais, bloco e efeitos são geometria procedural original, definida em `src/world.ts`. As animações usam transformações de grupos e regras do jogo; não são sprites, modelos de franquias ou downloads de personagens. Céu é uma textura gerada no navegador. Sons são sintetizados com Web Audio. Marca SVG original em `public/mark.svg`.

- Three.js: MIT, licença copiada de `node_modules/three/LICENSE` para `public/licenses/Three-MIT.txt`.
- IBM Plex Mono, Google Fonts: SIL Open Font License, `public/fonts/mono.ttf`; licença em `public/licenses/IBMPlexMono-OFL.txt`. Títulos usam a fonte serif do sistema.
- MediaPipe Tasks Vision e runtimes WASM: Apache 2.0, `public/licenses/MediaPipe-Apache-2.0.txt`. Modelo Hand Landmarker float16 v1: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task . SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.
- TensorFlow.js Core/Converter/WASM 4.22.0 e Hand Pose Detection 2.0.1: Apache 2.0, `public/licenses/TensorFlowJS-Apache-2.0.txt`.
- Modelos compatíveis detector-lite/landmark-lite v1: catálogo oficial https://www.kaggle.com/models/mediapipe/handpose-3d . Os JSON e shards são locais em `public/models/tfjs`.
- `tests/fixtures/hands.jpg`: fotografia do repositório oficial TensorFlow.js Models, Apache 2.0: https://github.com/tensorflow/tfjs-models/blob/master/hand-pose-detection/test_data/hands.jpg . Só usada em testes; não faz parte dos recursos públicos do jogo.

A infraestrutura de rastreamento e o desenho dos landmarks foram adaptados do projeto Game-air do mesmo proprietário. Não foram copiados seus personagens, sprites ou ilustrações. Modelos e runtimes permanecem locais, sem upload dos quadros capturados.
