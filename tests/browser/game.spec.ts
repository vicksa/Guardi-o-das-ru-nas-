import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
async function start(page: Page) {
  await page.goto("/");
  await page.locator("#start-keys").click();
  await expect(page.locator("#hud")).toBeVisible();
}
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__ruins.sim;
    return {
      status: s.status,
      hp: s.player.hp,
      x: s.player.x,
      y: s.player.y,
      z: s.player.z,
      bridge: s.bridge,
      held: s.stone.held,
      checkpoint: s.checkpoint,
      boss: s.guardian.hp,
      charge: s.charge,
    };
  });
}
async function photoCamera(page: Page) {
  await page.route("**/hands-fixture.jpg", (r) =>
    r.fulfill({
      path: path.resolve("tests/fixtures/hands.jpg"),
      contentType: "image/jpeg",
    }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          const image = new Image();
          image.src = "/hands-fixture.jpg";
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const c = canvas.getContext("2d")!;
          c.drawImage(image, 0, 0);
          const stream = canvas.captureStream(15);
          (window as any).fixtureVisible = true;
          const timer = setInterval(() => {
            if ((window as any).fixtureVisible) c.drawImage(image, 0, 0);
            else {
              c.fillStyle = "black";
              c.fillRect(0, 0, canvas.width, canvas.height);
            }
          }, 70);
          const stop = stream.getTracks()[0].stop.bind(stream.getTracks()[0]);
          stream.getTracks()[0].stop = () => {
            clearInterval(timer);
            stop();
          };
          return stream;
        },
      },
    });
  });
}
test("title, 3D renderer, controls, movement, jump, pause and return", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#world canvas")).toBeVisible();
  await page.screenshot({ path: "test-results/title.png" });
  await page.locator("#help").click();
  await expect(page.locator("#dialog-title")).toHaveText(
    "Suas mãos. Sua magia.",
  );
  await page.getByRole("button", { name: "VOLTAR →", exact: true }).click();
  await page.locator("#start-keys").click();
  const before = await snapshot(page);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(450);
  await page.keyboard.down("Space");
  await expect.poll(async () => (await snapshot(page)).y).toBeGreaterThan(0.4);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyW");
  expect((await snapshot(page)).z).toBeLessThan(before.z);
  await page.screenshot({ path: "test-results/play.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator("#dialog-title")).toHaveText(
    "A magia pode esperar.",
  );
  const frozen = await snapshot(page);
  await page.waitForTimeout(250);
  expect(await snapshot(page)).toEqual(frozen);
  await page.screenshot({ path: "test-results/pause.png" });
  await page.getByRole("button", { name: "CONTINUAR →", exact: true }).click();
  expect((await snapshot(page)).status).toBe("playing");
  expect(errors).toEqual([]);
});
test("the complete mission is beatable through ordinary keyboard input", async ({
  page,
}) => {
  test.setTimeout(120000);
  await start(page);
  if ((await page.locator("#quality").getAttribute("aria-pressed")) === "false")
    await page.locator("#quality").click();
  await page.keyboard.down("KeyW");
  await expect
    .poll(async () => (await snapshot(page)).z, { timeout: 12000 })
    .toBeLessThan(4.4);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  await expect.poll(async () => (await snapshot(page)).held).toBe(true);
  await page.keyboard.press("KeyE");
  await expect.poll(async () => (await snapshot(page)).bridge).toBe(true);
  await expect(page.locator("#toast")).toContainText("passagem");
  await page.screenshot({ path: "test-results/puzzle.png" });
  await page.keyboard.down("KeyW");
  await expect
    .poll(async () => (await snapshot(page)).z, {
      timeout: 15000,
      intervals: [50],
    })
    .toBeLessThan(-5.8);
  await page.keyboard.down("Space");
  await expect
    .poll(async () => (await snapshot(page)).checkpoint, { timeout: 12000 })
    .toBe(true);
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyW");
  expect((await snapshot(page)).hp).toBeGreaterThan(0);
  // Face the guardian along the path and cast with normal charge/release inputs.
  for (let i = 0; i < 6 && (await snapshot(page)).boss > 0; i++) {
    await page.keyboard.down("KeyJ");
    await page.waitForTimeout(1100);
    await page.keyboard.up("KeyJ");
    await page.keyboard.down("KeyK");
    await page.waitForTimeout(650);
    await page.keyboard.up("KeyK");
  }
  await expect(page.locator("#dialog-title")).toHaveText(
    "A magia se lembrou.",
    { timeout: 6000 },
  );
  expect((await snapshot(page)).boss).toBe(0);
  await page.screenshot({ path: "test-results/victory.png" });
  await page
    .getByRole("button", { name: "JOGAR NOVAMENTE →", exact: true })
    .click();
  expect(await snapshot(page)).toMatchObject({
    status: "playing",
    hp: 5,
    bridge: false,
    boss: 12,
    z: 8,
  });
});
test("falling to defeat and retry restore the mission", async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const s = (window as any).__ruins.sim;
    s.player.hp = 1;
    s.player.x = 30;
    s.player.y = -9;
  });
  await expect(page.locator("#dialog-title")).toHaveText(
    "Todo poder precisa de prática.",
  );
  await page.screenshot({ path: "test-results/defeat.png" });
  await page
    .getByRole("button", { name: "JOGAR NOVAMENTE →", exact: true })
    .click();
  expect(await snapshot(page)).toMatchObject({
    status: "playing",
    hp: 5,
    bridge: false,
    boss: 12,
  });
});
test("permission denied and pending camera can be recovered with keyboard", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    }),
  );
  await page.goto("/");
  await page.locator("#start-hands").click();
  await expect(page.locator("#camera-error")).toContainText("não permitiu");
  await page.screenshot({ path: "test-results/camera-error.png" });
  await page
    .getByRole("button", { name: "JOGAR COM TECLADO", exact: true })
    .click();
  expect((await snapshot(page)).status).toBe("playing");
});
test("camera permission pending can be cancelled without blocking another mode", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => new Promise(() => {}) },
    }),
  );
  await page.goto("/");
  await page.locator("#start-hands").click();
  await expect(page.locator("#loading-status")).toContainText("permissão");
  await page.getByRole("button", { name: "CANCELAR", exact: true }).click();
  await expect(page.locator("#title")).toBeVisible();
  await page.locator("#start-keys").click();
  expect((await snapshot(page)).status).toBe("playing");
});
test("compatible inference recognizes photographed hands and webcam survives death and retry", async ({
  page,
}) => {
  test.setTimeout(90000);
  await photoCamera(page);
  await page.goto("/");
  await page.locator("#start-hands").click();
  await page
    .getByRole("button", { name: "USAR MODO COMPATÍVEL", exact: true })
    .click();
  await expect(page.locator("#hand-count")).toHaveText("2/2", {
    timeout: 45000,
  });
  await expect(page.locator("#dialog-title")).toHaveText(
    "Encontre seu centro.",
  );
  await page.screenshot({ path: "test-results/camera-ready.png" });
  await page.evaluate(() => {
    (window as any).savedStream =
      document.querySelector<HTMLVideoElement>("#webcam")!.srcObject;
  });
  await page
    .getByRole("button", { name: "INICIAR MISSÃO →", exact: true })
    .click();
  await page.evaluate(() => {
    const s = (window as any).__ruins.sim;
    s.player.hp = 1;
    s.player.x = 30;
    s.player.y = -9;
  });
  await expect(page.locator("#dialog-title")).toHaveText(
    "Todo poder precisa de prática.",
  );
  await page
    .getByRole("button", { name: "JOGAR NOVAMENTE →", exact: true })
    .click();
  await expect(page.locator("#dialog")).toBeHidden();
  expect(
    await page.evaluate(() => {
      const s = (window as any).savedStream as MediaStream;
      return (
        document.querySelector<HTMLVideoElement>("#webcam")!.srcObject === s &&
        s.getTracks().every((t) => t.readyState === "live")
      );
    }),
  ).toBe(true);
  await page.evaluate(() => {
    (window as any).fixtureVisible = false;
  });
  await expect(page.locator("#dialog-title")).toHaveText(
    "Devolva suas mãos à câmera.",
    { timeout: 15000 },
  );
  await page.evaluate(() => {
    (window as any).fixtureVisible = true;
  });
  await expect(page.locator("#dialog")).toBeHidden({ timeout: 15000 });
  expect((await snapshot(page)).status).toBe("playing");
  await page.locator("#camera-off").click();
  expect(
    await page.evaluate(() =>
      ((window as any).savedStream as MediaStream)
        .getTracks()
        .every((t) => t.readyState === "ended"),
    ),
  ).toBe(true);
});
test("native tracking also recognizes two photographed hands in the 3D scene", async ({
  page,
}) => {
  await photoCamera(page);
  await page.goto("/");
  await page.locator("#start-hands").click();
  await expect(page.locator("#hand-count")).toHaveText("2/2", {
    timeout: 45000,
  });
  await expect(page.locator("#dialog-title")).toHaveText(
    "Encontre seu centro.",
  );
  await page.locator("#camera-off").click();
});
for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
])
  test(`touch, simultaneous movement/jump and menus fit ${viewport.width}x${viewport.height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await expect(page.locator("#start-hands")).toBeInViewport({ ratio: 1 });
      await page.screenshot({
        path: `test-results/mobile-title-${viewport.width}.png`,
      });
      await page.locator("#start-keys").click();
      await expect(page.locator('[data-action="jump"]')).toBeInViewport();
      await page
        .locator('[data-action="forward"]')
        .dispatchEvent("pointerdown", {
          pointerId: 1,
          pointerType: "touch",
          bubbles: true,
        });
      await page.waitForTimeout(200);
      await page.locator('[data-action="jump"]').dispatchEvent("pointerdown", {
        pointerId: 2,
        pointerType: "touch",
        bubbles: true,
      });
      await expect
        .poll(async () => (await snapshot(page)).y)
        .toBeGreaterThan(0.3);
      expect((await snapshot(page)).z).toBeLessThan(8);
      await page.locator('[data-action="jump"]').dispatchEvent("pointerup", {
        pointerId: 2,
        pointerType: "touch",
        bubbles: true,
      });
      await page.locator('[data-action="forward"]').dispatchEvent("pointerup", {
        pointerId: 1,
        pointerType: "touch",
        bubbles: true,
      });
      await page.screenshot({
        path: `test-results/mobile-play-${viewport.width}.png`,
      });
      await page.locator("#pause").click();
      await expect(
        page.getByRole("button", { name: "CONTINUAR →", exact: true }),
      ).toBeInViewport();
    } finally {
      await context.close();
    }
  });

test("mobile camera preparation keeps both preview and mission button visible", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await photoCamera(page);
    await page.goto("/");
    await page.locator("#start-hands").click();
    await expect(page.locator("#hand-count")).toHaveText("2/2", {
      timeout: 45000,
    });
    await expect(page.locator("#webcam")).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "INICIAR MISSÃO →", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: "test-results/mobile-camera.png" });
    await page
      .getByRole("button", { name: "INICIAR MISSÃO →", exact: true })
      .click();
    await expect(page.locator("#hud")).toBeVisible();
    await expect(page.locator("#hand-panel")).toBeVisible();
  } finally {
    await context.close();
  }
});
