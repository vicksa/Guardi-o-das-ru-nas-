# Arte, modelos e licenças

O guardião, ilhas, vegetação, colunas, portais, bloco e efeitos são geometria procedural original em `src/art/` e `src/world.ts`. O mago desta revisão é um modelo KayKit CC0, com esqueleto e animações, descrito abaixo; não é um personagem de franquia. Céu é uma textura gerada no navegador. Sons são sintetizados com Web Audio. Marca SVG original em `public/mark.svg`.

- Three.js: MIT, licença copiada de `node_modules/three/LICENSE` para `public/licenses/Three-MIT.txt`.
- IBM Plex Mono, Google Fonts: SIL Open Font License, `public/fonts/mono.ttf`; licença em `public/licenses/IBMPlexMono-OFL.txt`. Títulos usam a fonte serif do sistema.
- MediaPipe Tasks Vision e runtimes WASM: Apache 2.0, `public/licenses/MediaPipe-Apache-2.0.txt`. Modelo Hand Landmarker float16 v1: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task . SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`.
- TensorFlow.js Core/Converter/WASM 4.22.0 e Hand Pose Detection 2.0.1: Apache 2.0, `public/licenses/TensorFlowJS-Apache-2.0.txt`.
- Modelos compatíveis detector-lite/landmark-lite v1: catálogo oficial https://www.kaggle.com/models/mediapipe/handpose-3d . Os JSON e shards são locais em `public/models/tfjs`.
- `tests/fixtures/hands.jpg`: fotografia do repositório oficial TensorFlow.js Models, Apache 2.0: https://github.com/tensorflow/tfjs-models/blob/master/hand-pose-detection/test_data/hands.jpg . Só usada em testes; não faz parte dos recursos públicos do jogo.

A infraestrutura de rastreamento e o desenho dos landmarks foram adaptados do projeto Game-air do mesmo proprietário. Não foram copiados seus personagens, sprites ou ilustrações. Modelos e runtimes permanecem locais, sem upload dos quadros capturados.

## Mago com esqueleto — revisão visual

- Autor: Kay Lousberg, KayKit Adventurers Character Pack 1.0.
- Licença CC0: `public/licenses/KayKit-Adventurers-CC0.txt`, copiada do pacote oficial.
- Fonte: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/tree/672074b73ba276876a19e8816ecdc5241817ab47 .
- Modelo original: `addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb`.
- Versão local: `public/art/mage/mage.glb`, com 12 animações selecionadas e dados não usados removidos pelo glTF-Transform 4.5.1. Textura embutida, 751876 bytes. SHA-256: `c1818ded0e9f4ddb821622ef0cbf6fcba6daeeae7f2a56aaeb9d0d46d3b09e05`.
- Reproduzir: `python scripts/prepare_mage.py`. Validar: `npx --yes @gltf-transform/cli@4.5.1 validate public/art/mage/mage.glb`.

Materiais de pedra usam mapas procedurais de cor e normal. A imagem de cor é marcada como sRGB; o normal map permanece como dados. A iluminação inclui ambiente pré-filtrado a partir de RoomEnvironment (Three.js MIT), luz principal e recorte. No modo de qualidade há bloom com conversão de saída aplicada uma única vez; o modo leve preserva a arte e omite esse custo. Nenhum recurso artístico é buscado fora da origem durante a partida.
