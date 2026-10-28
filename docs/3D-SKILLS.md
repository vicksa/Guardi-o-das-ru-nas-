# Skills específicas de 3D

Fonte: https://github.com/CloudAI-X/threejs-skills — commit `0e181866f095b5f06d005133876e926515390d95`, licença MIT preservada em `.agents/skills/THREEJS-SKILLS-LICENSE.txt`. Instaladas no escopo deste repositório, sem alterar configurações globais.

| Skill                  | Aplicação nesta revisão                                    |
| ---------------------- | ---------------------------------------------------------- |
| threejs-fundamentals   | Organização da cena em ambiente, atores e renderização     |
| threejs-geometry       | Geometria chanfrada, perfis torneados e merge por material |
| threejs-materials      | Materiais PBR de pedra, metal e vidro mágico               |
| threejs-lighting       | Luz principal, recorte, IBL e sombras de contato           |
| threejs-textures       | Albedo em sRGB; normal map sem conversão de cor            |
| threejs-animation      | AnimationMixer, esqueleto e transições de ações            |
| threejs-loaders        | GLTFLoader assíncrono e erro de carregamento recuperável   |
| threejs-performance    | Estatísticas por quadro, redução de draw calls e modo leve |
| threejs-postprocessing | RenderPass → bloom → OutputPass, desligável no modo leve   |
| threejs-asset-pipeline | Seleção de animações, prune, inspeção e validação glTF     |

O pacote documenta Three.js r186. O jogo permanece na r180: só foram usadas APIs presentes na versão instalada e verificadas pelo TypeScript/build. Exemplos de APIs novas como SunLight ou RenderPipeline não foram copiados.

As skills orientam o trabalho; não são modelos 3D nem garantia automática de qualidade. A revisão mudou os recursos e a renderização: mago KayKit CC0 com rig e 12 animações, guardião articulado, materiais com mapa de cor/normal, arquitetura com perfis e chanfros, vegetação por frondes e iluminação com contraste. Renderizadores por software e dispositivos de toque iniciam em modo leve; nesse modo, a resolução do canvas tem largura máxima de 960 pixels (480 em renderizadores por software), sem reduzir a resolução dos controles HTML. Fonte e licença dos recursos em ASSETS.md.
