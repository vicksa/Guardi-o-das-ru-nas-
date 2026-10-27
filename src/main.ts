import "./style.css";
import {
  neutral,
  GestureController,
  resolveHands,
  type Hand,
  type Command,
} from "./controls";
import { Tracker } from "./tracking";
import { drawHandPreview } from "./hand-monitor";
import { Simulation, type GameEvent } from "./simulation";
import { World } from "./world";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const glyph =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 32 20 20 37 8 20Z M20 11 26 20 20 29 14 20Z"/></svg>';
$("app").innerHTML = `<main id="experience">
<div id="world"></div><div class="vignette"></div>
<header class="topbar"><a class="brand" href="./">${glyph}<span>GUARDIÃO<span>DAS RUÍNAS</span></span></a><nav aria-label="Opções do jogo"><button id="help" class="quiet">COMO JOGAR</button><button id="sound" class="icon-button" aria-label="Ativar sons" aria-pressed="false">SOM <span>OFF</span></button><button id="fullscreen" class="icon-button" aria-label="Tela cheia">⛶</button></nav></header>
<section id="title" class="title-screen"><div class="title-copy"><p class="eyebrow"><i></i> UMA AVENTURA ALÉM DO TOQUE</p><h1>Guardião<br><em>das Ruínas.</em></h1><p class="lead">O mundo esqueceu a magia.<br>Suas mãos ainda se lembram.</p><p class="story">Entre ruínas suspensas no céu, desperte caminhos antigos e enfrente o último guardião.</p><div class="start-actions"><button id="start-hands" class="primary">JOGAR COM AS MÃOS <span>→</span></button><button id="start-keys" class="text-button">EXPLORAR COM TECLADO <span>→</span></button></div><p class="privacy"><span class="lock">◇</span> Sua câmera fica no seu dispositivo.</p></div><div class="world-caption"><span>01 / O SANTUÁRIO SUSPENSO</span><b>Um antigo poder.<br>Um novo gesto.</b><div class="caption-line"></div><small>EXPLORE · ERGA · PROTEJA</small></div><div class="title-footer"><span>3D EXPLORÁVEL <i>✦</i> CONTROLE POR GESTOS</span><span>FEITO PARA SER DESCOBERTO</span></div></section>
<section id="hud" class="hud hidden" aria-label="Estado da missão"><div class="vital"><span class="micro">VITALIDADE</span><div id="hearts" aria-label="5 de 5 vidas"></div></div><div class="mission"><span class="micro">O SANTUÁRIO SUSPENSO</span><p id="objective">Leve o bloco ao pedestal</p><span id="mission-step">01 — DESPERTAR</span></div><button id="pause" class="quiet">PAUSAR <kbd>ESC</kbd></button></section>
<div id="reticle" class="reticle hidden"><i></i></div>
<div id="interaction" class="interaction hidden"><kbd>E</kbd><span>Erguer o bloco</span></div>
<div id="boss" class="boss hidden"><div><span>O ÚLTIMO GUARDIÃO</span><b id="boss-hp">12 / 12</b></div><meter id="boss-meter" min="0" max="12" value="12"></meter></div>
<div id="actionbar" class="actionbar hidden"><div><kbd>W A S D</kbd><span>MOVER / VIRAR</span></div><div><kbd>ESPAÇO</kbd><span>PULAR</span></div><div class="magic-action"><kbd>J</kbd><span>SEGURAR / SOLTAR MAGIA</span><div class="charge-track"><i id="charge-fill"></i></div></div><div><kbd>K</kbd><span>ESCUDO</span></div><div><kbd>E</kbd><span>TELECINESE</span></div></div>
<aside id="hand-panel" class="hand-panel hidden" aria-label="Visão das mãos"><div class="hand-heading"><span>SUAS MÃOS / AO VIVO</span><b id="hand-count">0/2</b></div><div class="camera-frame"><video id="webcam" muted playsinline aria-label="Prévia espelhada da câmera"></video><canvas id="hand-canvas" width="480" height="360"></canvas><span id="camera-wait">AGUARDANDO CÂMERA</span></div><div class="hand-labels"><span id="left-state">ESQ · NÃO DETECTADA</span><span id="right-state">DIR · NÃO DETECTADA</span></div><p id="tracking-status" role="status">Mostre as duas mãos</p><div class="camera-actions"><button id="recenter">CENTRALIZAR</button><button id="swap" aria-pressed="false">TROCAR LADOS</button><button id="compatible">MODO COMPATÍVEL</button><button id="camera-off">DESLIGAR CÂMERA</button></div></aside>
<div id="toast" class="toast hidden" role="status"></div>
<section id="dialog" class="dialog hidden" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-card"><p id="dialog-kicker" class="eyebrow">OS PRIMEIROS GESTOS</p><h2 id="dialog-title">O poder está em você.</h2><div id="dialog-body"></div><div id="dialog-actions"></div></div></section>
<nav id="touch" class="touch hidden" aria-label="Controles de toque"><div class="touch-dpad"><button data-action="forward" aria-label="Avançar">↑</button><button data-action="left" aria-label="Virar à esquerda">←</button><button data-action="back" aria-label="Recuar">↓</button><button data-action="right" aria-label="Virar à direita">→</button></div><div class="touch-abilities"><button data-action="grab">ERGUER</button><button data-action="shield">ESCUDO</button><button data-action="charge">MAGIA</button><button data-action="jump">PULAR</button></div></nav>
<div id="hand-pointer" class="hand-pointer hidden"></div>
<button id="quality" class="quality" aria-pressed="false">MODO LEVE</button>
<div id="gpu-error" class="gpu-error hidden"><h2>O portal precisa de gráficos 3D.</h2><p>Ative a aceleração gráfica do navegador e recarregue. O jogo precisa de WebGL 2 para desenhar o mundo.</p><button onclick="location.reload()" class="primary">TENTAR NOVAMENTE</button></div>
</main>`;
let mode: "hands" | "keys" = "keys";
let latestHands: Hand[] = [];
let trackingReady = false;
let lastHands = 0;
let stableSince = 0;
let waitingHands = false;
let swapped = false;
let loading = false;
let attempt = 0;
let cameraReturn = false;
let keyboard = new Set<string>();
const touchHeld = new Map<number, string>();
let pendingGrab = false,
  pendingCast = false;
let handCommand = neutral();
const controller = new GestureController();
let world: World | undefined;
let soundEnabled = false;
let audio: AudioContext | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let lastStatus = "title";
let dwellButton: HTMLButtonElement | null = null,
  dwellStart = 0;
let dialogContext = "";
export const sim = new Simulation(onGameEvent);
try {
  world = new World($("world"), sim);
} catch (error) {
  console.error("3D initialization failed", error);
  $("gpu-error").classList.remove("hidden");
}
const mobile = matchMedia("(pointer: coarse)").matches;
if (mobile) {
  $("start-keys").innerHTML = "JOGAR COM TOQUE <span>→</span>";
  world?.setQuality(true);
  $("quality").setAttribute("aria-pressed", "true");
}
world?.setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
function sound(type: "cast" | "hit" | "bridge" | "hurt") {
  if (!soundEnabled) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.connect(g);
    g.connect(audio.destination);
    o.type = type === "hurt" ? "triangle" : "sine";
    o.frequency.setValueAtTime(
      { cast: 380, hit: 680, bridge: 820, hurt: 130 }[type],
      audio.currentTime,
    );
    o.frequency.exponentialRampToValueAtTime(
      type === "hurt" ? 70 : 1000,
      audio.currentTime + 0.18,
    );
    g.gain.setValueAtTime(0.035, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.3);
    o.start();
    o.stop(audio.currentTime + 0.3);
  } catch {
    /* Audio is optional. */
  }
}
function toast(message: string) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.add("hidden"), 3200);
}
type Action = {
  text: string;
  run: () => void;
  primary?: boolean;
  dwell?: boolean;
};
function modal(
  kicker: string,
  title: string,
  body: string,
  actions: Action[],
  context = "manual",
) {
  dialogContext = context;
  $("dialog-kicker").textContent = kicker;
  $("dialog-title").textContent = title;
  $("dialog-body").innerHTML = body;
  $("dialog-actions").replaceChildren();
  for (const action of actions) {
    const button = document.createElement("button");
    button.textContent = action.text;
    button.className = action.primary ? "primary" : "secondary";
    if (action.dwell) button.dataset.dwell = "true";
    button.onclick = action.run;
    $("dialog-actions").append(button);
  }
  $("dialog").classList.remove("hidden");
  dwellButton = null;
}
function closeDialog() {
  $("dialog").classList.add("hidden");
  dwellButton = null;
  dialogContext = "";
}
function controls() {
  return `<p class="dialog-intro">Uma pequena jornada. Três ilhas, uma passagem adormecida e um guardião. Vá até o bloco luminoso, erga-o e leve-o ao pedestal.</p><div class="control-columns"><div><h3>01 / MÃO ESQUERDA</h3><p><b>Mover e virar</b><br>Para cima: avança. Para baixo: recua.<br>Para os lados: vira. Use movimentos curtos.</p><p><b>Parar</b><br>Volte ao centro ou feche o punho esquerdo.</p></div><div><h3>02 / MÃO DIREITA</h3><p><b>V</b> · Pula, mesmo andando.<br><b>Punho → palma</b> · Carrega e lança magia.<br><b>Palma aberta</b> · Mantém o escudo.<br><b>Pinça</b> · Junte polegar e indicador, com os outros dedos abertos, para erguer ou encaixar o bloco. Desfaça antes de repetir.</p></div></div><p class="keyboard-note"><b>TECLADO</b> W/S avança e recua · A/D vira · Espaço pula · segure J e solte para lançar · K escudo · E telecinese · Esc pausa.</p><p class="modal-note">Na tela de câmera, mantenha as duas mãos separadas e com luz de frente. Só o rosto na câmera não basta. Para escolher os botões principais sem mouse, aponte o indicador direito e segure sobre o botão por 1,5 segundo.</p>`;
}
function clearInput() {
  keyboard.clear();
  touchHeld.clear();
  pendingGrab = pendingCast = false;
  handCommand = neutral();
  sim.cancelInput();
}
function onGameEvent(event: GameEvent) {
  const messages: Partial<Record<GameEvent["type"], string>> = {
    bridge: "O pedestal despertou. A passagem foi restaurada.",
    grab: "O bloco está com você. Aproxime-se do pedestal.",
    place: "Bloco colocado.",
    checkpoint: "Refúgio alcançado · +1 vida",
    fall: "Você retornou ao último refúgio.",
    blocked: "Ataque bloqueado.",
    hurt: "Você foi atingido. Use o escudo ou saia do círculo.",
  };
  if (messages[event.type]) toast(messages[event.type]!);
  if (["cast", "hit", "bridge", "hurt"].includes(event.type))
    sound(event.type as "cast" | "hit" | "bridge" | "hurt");
  if (event.type === "hit")
    toast(
      event.value
        ? `Magia acertou · guardião com ${event.value} de vitalidade`
        : "O guardião caiu.",
    );
  if (event.type === "win" || event.type === "lose") {
    waitingHands = false;
    clearInput();
    modal(
      event.type === "win" ? "O SANTUÁRIO DESPERTOU" : "A JORNADA CONTINUA",
      event.type === "win"
        ? "A magia se lembrou."
        : "Todo poder precisa de prática.",
      event.type === "win"
        ? '<p class="dialog-intro">A passagem voltou a existir. O último guardião repousa. E o céu ainda guarda outras histórias.</p>'
        : '<p class="dialog-intro">O vazio não é o fim. Respire, centralize suas mãos e tente mais uma vez. A câmera continua ligada.</p>',
      [
        {
          text: "JOGAR NOVAMENTE →",
          run: () => begin(mode),
          primary: true,
          dwell: true,
        },
        { text: "VOLTAR AO SANTUÁRIO", run: home },
      ],
      "end",
    );
  }
}
function begin(nextMode: "hands" | "keys") {
  mode = nextMode;
  clearInput();
  controller.calibrate(latestHands);
  sim.start();
  $("title").classList.add("hidden");
  $("hud").classList.remove("hidden");
  $("reticle").classList.remove("hidden");
  closeDialog();
  if (mode === "hands" && !trackingReady) waitForHands();
}
function resume() {
  clearInput();
  if (mode === "hands" && !trackingReady) {
    waitForHands();
    return;
  }
  controller.calibrate(latestHands);
  waitingHands = false;
  sim.resume();
  closeDialog();
}
function useKeys() {
  mode = "keys";
  waitingHands = false;
  controller.reset();
  clearInput(); // Keep the preview alive until the player explicitly turns it off.
  if (sim.status === "paused") sim.resume();
  else if (sim.status !== "playing") begin("keys");
  closeDialog();
  toast(
    mobile
      ? "Controles de toque ativos."
      : "W/S para andar · A/D para virar · Espaço para pular",
  );
}
function home() {
  clearInput();
  waitingHands = false;
  sim.reset();
  sim.status = "title";
  closeDialog();
  $("title").classList.remove("hidden");
  $("hud").classList.add("hidden");
  $("reticle").classList.add("hidden");
}
function pause() {
  if (sim.status !== "playing") return;
  waitingHands = false;
  sim.pause();
  clearInput();
  modal(
    "UM MOMENTO ENTRE AS NUVENS",
    "A magia pode esperar.",
    '<p class="dialog-intro">Sua jornada está pausada. A câmera permanece ligada.</p>',
    [
      { text: "CONTINUAR →", run: resume, primary: true, dwell: true },
      { text: mobile ? "USAR TOQUE" : "USAR TECLADO", run: useKeys },
      { text: "VER CONTROLES", run: showHelp },
      { text: "VOLTAR AO INÍCIO", run: home },
    ],
    "pause",
  );
}
function waitForHands() {
  sim.pause();
  clearInput();
  waitingHands = true;
  modal(
    "VISÃO DAS MÃOS",
    "Devolva suas mãos à câmera.",
    '<p class="dialog-intro">A missão continua sozinha quando as duas mãos estiverem visíveis. Você não precisa clicar de novo.</p><p class="modal-note">Veja a prévia no canto. Separe as mãos, evite contraluz e mantenha as palmas inteiras no enquadramento.</p>',
    [
      {
        text: mobile ? "CONTINUAR COM TOQUE" : "CONTINUAR COM TECLADO",
        run: useKeys,
      },
      { text: "CENTRALIZAR", run: () => controller.calibrate(latestHands) },
    ],
    "waiting",
  );
}
function showHelp() {
  if (sim.status === "playing") sim.pause();
  clearInput();
  modal(
    "MAPA DOS GESTOS",
    "Suas mãos. Sua magia.",
    controls(),
    [
      {
        text: sim.status === "paused" ? "CONTINUAR →" : "VOLTAR →",
        run: () => (sim.status === "paused" ? resume() : closeDialog()),
        primary: true,
        dwell: true,
      },
    ],
    "help",
  );
}
function calibration() {
  modal(
    "ANTES DE ATRAVESSAR",
    "Encontre seu centro.",
    '<p class="dialog-intro">Mostre as duas mãos na altura do peito. Deixe a esquerda confortável, sem esticar o braço. Essa será sua posição neutra.</p><div class="calibration-pair"><span>ESQUERDA<br><b>MOVER / VIRAR</b></span><i>✦</i><span>DIREITA<br><b>MAGIA / AÇÕES</b></span></div><p class="modal-note">Deslocamentos pequenos bastam. A prévia é espelhada. Se os lados estiverem trocados, use Trocar lados no painel.</p>',
    [
      {
        text: cameraReturn ? "CONTINUAR MISSÃO →" : "INICIAR MISSÃO →",
        run: () => (cameraReturn ? resume() : begin("hands")),
        primary: true,
        dwell: true,
      },
      {
        text: "VER TODOS OS GESTOS",
        run: () =>
          modal(
            "MAPA DOS GESTOS",
            "O poder está em você.",
            controls(),
            [
              {
                text: "VOLTAR À PREPARAÇÃO",
                run: calibration,
                primary: true,
                dwell: true,
              },
            ],
            "calibration",
          ),
      },
      { text: mobile ? "USAR TOQUE" : "USAR TECLADO", run: useKeys },
    ],
    "calibration",
  );
}
export const tracker = new Tracker(
  $("webcam") as HTMLVideoElement,
  onHands,
  cameraError,
  (message) => {
    $("tracking-status").textContent = message;
    const p = document.getElementById("loading-status");
    if (p) p.textContent = message;
    if (tracker.cameraActive) $("camera-wait").classList.add("hidden");
    trackingReady = false;
    sim.cancelInput();
    handCommand = neutral();
  },
);
function onHands(input: Hand[], now: number) {
  latestHands = resolveHands(
    swapped
      ? input.map((h) => ({ ...h, side: h.side === "Left" ? "Right" : "Left" }))
      : input,
  );
  trackingReady = latestHands.length === 2;
  lastHands = now;
  if (trackingReady) {
    stableSince ||= now;
  } else {
    stableSince = 0;
    handCommand = neutral();
    if (mode === "hands") sim.cancelInput();
  }
  drawHandPreview($("hand-canvas") as HTMLCanvasElement, latestHands);
  $("hand-count").textContent = `${latestHands.length}/2`;
  const left = latestHands.some((h) => h.side === "Left"),
    right = latestHands.some((h) => h.side === "Right");
  $("left-state").textContent = left
    ? "ESQ · MOVIMENTO"
    : "ESQ · NÃO DETECTADA";
  handCommand = controller.update(latestHands, now);
  $("right-state").textContent = right
    ? `DIR · ${{ none: "MÃO VISÍVEL", open: "ESCUDO", fist: "CARREGANDO", victory: "PULO", pinch: "TELECINESE" }[controller.pose]}`
    : "DIR · NÃO DETECTADA";
  $("tracking-status").textContent = trackingReady
    ? "Duas mãos conectadas"
    : `Mãos visíveis: ${latestHands.length}/2`;
  if (waitingHands && trackingReady && now - stableSince > 250) {
    controller.calibrate(latestHands);
    waitingHands = false;
    sim.resume();
    closeDialog();
  }
}
async function activateCamera(compatibleMode = mobile) {
  if (loading) return;
  loading = true;
  const ticket = ++attempt;
  cameraReturn = sim.status === "playing" || sim.status === "paused";
  if (sim.status === "playing") sim.pause();
  clearInput();
  $("hand-panel").classList.remove("hidden");
  modal(
    "ABRINDO A VISÃO",
    "O portal está se abrindo.",
    '<p id="loading-status" class="dialog-intro" role="status">Autorize a câmera no navegador.</p><p class="modal-note">A imagem fica neste dispositivo. Se estiver no navegador interno do WhatsApp, abra o link diretamente no Chrome ou Safari.</p>',
    [
      {
        text: "USAR MODO COMPATÍVEL",
        run: () => {
          attempt++;
          tracker.stop();
          loading = false;
          void activateCamera(true);
        },
      },
      {
        text: "CANCELAR",
        run: () => {
          attempt++;
          loading = false;
          tracker.stop();
          $("hand-panel").classList.add("hidden");
          if (cameraReturn) {
            mode = "keys";
            sim.resume();
            closeDialog();
          } else home();
        },
      },
    ],
    "loading",
  );
  try {
    if (!(await tracker.start(compatibleMode)) || ticket !== attempt) return;
    mode = "hands";
    $("camera-wait").classList.add("hidden");
    calibration();
  } catch (error) {
    if (ticket !== attempt) return;
    const name = error instanceof Error ? error.name : "";
    cameraError(
      name === "NotAllowedError"
        ? "O navegador não permitiu a câmera. Libere o acesso nas permissões deste site."
        : name === "NotFoundError"
          ? "Nenhuma câmera foi encontrada. Conecte uma webcam ou jogue com teclado/toque."
          : name === "NotReadableError"
            ? "A câmera está em uso por outro aplicativo. Feche-o e tente novamente."
            : error instanceof Error
              ? error.message
              : "Não foi possível abrir a câmera.",
    );
  } finally {
    if (ticket === attempt) loading = false;
  }
}
function cameraError(message: string) {
  trackingReady = false;
  latestHands = [];
  waitingHands = false;
  sim.pause();
  clearInput();
  $("camera-wait").classList.toggle("hidden", tracker.cameraActive);
  $("hand-count").textContent = "0/2";
  drawHandPreview($("hand-canvas") as HTMLCanvasElement, []);
  modal(
    "A CÂMERA PRECISA DE ATENÇÃO",
    "Vamos abrir outro caminho.",
    '<p id="camera-error" class="dialog-intro"></p>',
    [
      {
        text: "TENTAR NOVAMENTE →",
        run: () => void activateCamera(false),
        primary: true,
      },
      { text: "MODO COMPATÍVEL", run: () => void activateCamera(true) },
      { text: mobile ? "JOGAR COM TOQUE" : "JOGAR COM TECLADO", run: useKeys },
    ],
    "camera-error",
  );
  $("camera-error").textContent = message;
}
function physicalCommand(): Command {
  const has = (...keys: string[]) =>
    keys.some((k) => keyboard.has(k)) ||
    [...touchHeld.values()].some((k) => keys.includes(k));
  const c = neutral();
  c.move =
    Number(has("KeyW", "ArrowUp", "forward")) -
    Number(has("KeyS", "ArrowDown", "back"));
  c.turn =
    Number(has("KeyD", "ArrowRight", "right")) -
    Number(has("KeyA", "ArrowLeft", "left"));
  c.jump = has("Space", "jump");
  c.charge = has("KeyJ", "KeyQ", "charge");
  c.shield = has("KeyK", "ShiftLeft", "shield");
  c.cast = pendingCast;
  c.grab = pendingGrab;
  pendingCast = pendingGrab = false;
  return c;
}
function chargeHeld() {
  return (
    keyboard.has("KeyJ") ||
    keyboard.has("KeyQ") ||
    [...touchHeld.values()].includes("charge")
  );
}
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input,textarea")) return;
  if (e.code === "Escape") {
    sim.status === "playing" ? pause() : sim.status === "paused" && resume();
    return;
  }
  if (sim.status !== "playing") return;
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (e.code === "KeyE" && !e.repeat) pendingGrab = true;
  keyboard.add(e.code);
});
window.addEventListener("keyup", (e) => {
  const charged = chargeHeld();
  keyboard.delete(e.code);
  if (charged && !chargeHeld() && sim.status === "playing") pendingCast = true;
});
$("touch").addEventListener("pointerdown", (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-action]",
  );
  if (!button) return;
  e.preventDefault();
  try {
    button.setPointerCapture(e.pointerId);
  } catch {}
  touchHeld.set(e.pointerId, button.dataset.action!);
  if (button.dataset.action === "grab") pendingGrab = true;
});
function releaseTouch(e: PointerEvent) {
  const charged = chargeHeld();
  touchHeld.delete(e.pointerId);
  if (charged && !chargeHeld() && sim.status === "playing") pendingCast = true;
}
window.addEventListener("pointerup", releaseTouch);
window.addEventListener("pointercancel", (e) => {
  touchHeld.delete(e.pointerId);
  if (!chargeHeld()) sim.cancelInput();
});
$("touch").addEventListener("lostpointercapture", releaseTouch);
window.addEventListener("blur", () => {
  if (sim.status === "playing") pause();
  clearInput();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (sim.status === "playing") pause();
    clearInput();
  }
});
window.addEventListener("pagehide", () => tracker.stop());
$("start-hands").onclick = () => void activateCamera();
$("start-keys").onclick = () => begin("keys");
$("help").onclick = showHelp;
$("pause").onclick = pause;
$("recenter").onclick = () => {
  controller.calibrate(latestHands);
  sim.cancelInput();
  toast("Posição neutra atualizada.");
};
$("swap").onclick = () => {
  swapped = !swapped;
  $("swap").setAttribute("aria-pressed", String(swapped));
  controller.reset();
  latestHands = [];
  trackingReady = false;
  stableSince = 0;
  if (mode === "hands" && sim.status === "playing") waitForHands();
  toast("Lados trocados. Mostre as mãos e centralize.");
};
$("compatible").onclick = () => void activateCamera(true);
$("camera-off").onclick = () => {
  attempt++;
  loading = false;
  tracker.stop();
  latestHands = [];
  trackingReady = false;
  handCommand = neutral();
  $("hand-panel").classList.add("hidden");
  mode = "keys";
  waitingHands = false;
  clearInput();
  if (sim.status === "paused") {
    sim.resume();
    closeDialog();
  }
  toast(
    mobile
      ? "Câmera desligada. Use os botões de toque."
      : "Câmera desligada. Use o teclado.",
  );
};
$("sound").onclick = () => {
  soundEnabled = !soundEnabled;
  $("sound").setAttribute("aria-pressed", String(soundEnabled));
  $("sound").innerHTML = `SOM <span>${soundEnabled ? "ON" : "OFF"}</span>`;
  $("sound").setAttribute(
    "aria-label",
    soundEnabled ? "Desativar sons" : "Ativar sons",
  );
  if (soundEnabled) sound("bridge");
};
$("quality").onclick = () => {
  const low = $("quality").getAttribute("aria-pressed") !== "true";
  $("quality").setAttribute("aria-pressed", String(low));
  world?.setQuality(low);
  toast(
    low
      ? "Modo leve: menor resolução e sem sombras."
      : "Qualidade visual restaurada.",
  );
};
$("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $("experience").requestFullscreen();
  } catch {
    toast(
      "O jogo já ocupa a janela. Neste navegador, a tela cheia não está disponível.",
    );
  }
};
let previous = performance.now(),
  lastPair = performance.now();
let accumulator = 0,
  performanceStart = performance.now(),
  renderedFrames = 0,
  adaptiveDone = false,
  shownHp = -1;

function frame(now: number) {
  const dt = Math.min((now - previous) / 1000, 0.15);
  previous = now;
  if (trackingReady) lastPair = now;
  if (
    mode === "hands" &&
    sim.status === "playing" &&
    (now - lastPair > 1000 || now - lastHands > 1200)
  )
    waitForHands();
  if (sim.status === "playing") {
    if (mode === "hands") {
      sim.command = { ...handCommand };
      handCommand.grab = handCommand.cast = false;
    } else sim.command = physicalCommand();
    accumulator = Math.min(0.2, accumulator + dt);
    while (accumulator >= 1 / 60) {
      sim.update(1 / 60);
      accumulator -= 1 / 60;
    }
  } else accumulator = 0;
  world?.frame(dt);
  renderedFrames++;
  if (!adaptiveDone && now - performanceStart > 3000) {
    adaptiveDone = true;
    if (renderedFrames / ((now - performanceStart) / 1000) < 22) {
      world?.setQuality(true);
      $("quality").setAttribute("aria-pressed", "true");
    }
  }
  const playing = sim.status === "playing",
    inGame = sim.status !== "title";
  $("hud").classList.toggle("hidden", !inGame);
  $("reticle").classList.toggle("hidden", !playing);
  $("actionbar").classList.toggle("hidden", !playing || mobile);
  $("touch").classList.toggle("hidden", !playing || mode === "hands");
  $("objective").textContent = sim.objective;
  $("mission-step").textContent = sim.checkpoint
    ? "03 — O GUARDIÃO"
    : sim.bridge
      ? "02 — A TRAVESSIA"
      : "01 — DESPERTAR";
  if (shownHp !== sim.player.hp) {
    shownHp = sim.player.hp;
    $("hearts").innerHTML = Array.from(
      { length: 5 },
      (_, i) => `<i class="${i < sim.player.hp ? "filled" : ""}"></i>`,
    ).join("");
    $("hearts").setAttribute("aria-label", `${sim.player.hp} de 5 vidas`);
  }
  const interaction = playing ? sim.interaction : "";
  $("interaction").classList.toggle("hidden", !interaction);
  $("interaction").querySelector("span")!.textContent = interaction;
  $("interaction").querySelector("kbd")!.textContent =
    mode === "hands" ? "PINÇA" : "E";
  $("charge-fill").style.width = `${sim.charge * 100}%`;
  $("reticle").style.setProperty("--charge", String(sim.charge));
  const showBoss = inGame && sim.checkpoint && sim.guardian.hp > 0;
  $("boss").classList.toggle("hidden", !showBoss);
  ($("boss-meter") as HTMLMeterElement).value = sim.guardian.hp;
  $("boss-hp").textContent = `${sim.guardian.hp} / 12`;
  const labels =
    mode === "hands"
      ? ["ESQ", "V", "PUNHO → PALMA", "PALMA", "PINÇA"]
      : ["W A S D", "ESPAÇO", "J", "K", "E"];
  $("actionbar")
    .querySelectorAll("kbd")
    .forEach((el, i) => {
      if (el.textContent !== labels[i]) el.textContent = labels[i];
    });
  const right = latestHands.find((h) => h.side === "Right");
  const pointer = $("hand-pointer");
  if (mode === "hands" && right && !$("dialog").classList.contains("hidden")) {
    const x =
        Math.max(0, Math.min(1, (1 - right.points[8].x - 0.1) / 0.8)) *
        innerWidth,
      y =
        Math.max(0, Math.min(1, (right.points[8].y - 0.1) / 0.8)) * innerHeight;
    pointer.classList.remove("hidden");
    pointer.style.left = `${x}px`;
    pointer.style.top = `${y}px`;
    const target =
      document
        .elementFromPoint(x, y)
        ?.closest<HTMLButtonElement>('button[data-dwell="true"]') ?? null;
    if (target) {
      if (target !== dwellButton) {
        dwellButton = target;
        dwellStart = now;
      }
      const progress = (now - dwellStart) / 1500;
      pointer.style.setProperty(
        "--progress",
        `${Math.min(1, progress) * 360}deg`,
      );
      if (progress >= 1) {
        dwellButton = null;
        dwellStart = now;
        target.click();
      }
    } else {
      dwellButton = null;
      pointer.style.setProperty("--progress", "0deg");
    }
  } else {
    pointer.classList.add("hidden");
    dwellButton = null;
  }
  lastStatus = sim.status;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Development-only inspection for repeatable input/physics tests. Never shipped.
if (import.meta.env.DEV)
  (window as any).__ruins = {
    sim,
    tracker,
    controller,
    get world() {
      return world;
    },
    get mode() {
      return mode;
    },
    get hands() {
      return latestHands;
    },
  };
