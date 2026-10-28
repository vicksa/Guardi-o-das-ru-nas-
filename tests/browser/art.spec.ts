import { test, expect } from "@playwright/test";
test("rigged mage loads and blends locomotion, jump, shield and spell animations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#start-keys").click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__ruins.world.character.current),
    )
    .toBe("Idle");
  expect(
    await page.evaluate(() => {
      let count = 0;
      (window as any).__ruins.world.character.model.traverse((o: any) => {
        if (o.isSkinnedMesh) count++;
      });
      return count;
    }),
  ).toBeGreaterThan(0);
  await page.keyboard.down("KeyW");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__ruins.world.character.current),
    )
    .toBe("Running_A");
  await page.keyboard.up("KeyW");
  await page.keyboard.down("Space");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__ruins.world.character.current),
    )
    .toBe("Jump_Idle");
  await page.keyboard.up("KeyW");
  await page.keyboard.up("Space");
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__ruins.sim.player.grounded),
      { timeout: 20000 },
    )
    .toBe(true);
  await page.keyboard.down("KeyK");
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const r = (window as any).__ruins;
          return {
            animation: r.world.character.current,
            shield: r.sim.shield,
            command: r.sim.command,
            status: r.sim.status,
          };
        }),
      { timeout: 15000 },
    )
    .toMatchObject({ animation: "Blocking", shield: true, status: "playing" });
  await page.keyboard.up("KeyK");
  await page.keyboard.down("KeyJ");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__ruins.world.character.current),
    )
    .toBe("Spellcasting");
  await page.keyboard.up("KeyJ");
  expect(
    await page.evaluate(
      () => (window as any).__ruins.world.character.mixer.time,
    ),
  ).toBeGreaterThan(0.4);
  await page.screenshot({ path: "test-results/art-character.png" });
  expect(errors).toEqual([]);
});
test("low quality keeps detailed materials and bounds frame-wide draw calls", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#start-keys").click();
  if ((await page.locator("#quality").getAttribute("aria-pressed")) === "false")
    await page.locator("#quality").click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__ruins.world.stats.calls))
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(() => (window as any).__ruins.world.stats.calls),
  ).toBeLessThan(220);
  expect(
    await page.evaluate(() => {
      let count = 0;
      (window as any).__ruins.world.scene.traverse((o: any) => {
        if (o.isMesh && o.material?.normalMap) count++;
      });
      return count;
    }),
  ).toBeGreaterThan(5);
  await page.screenshot({ path: "test-results/art-low-quality.png" });
});
test("a failed character download shows a recovery action instead of an invisible player", async ({
  page,
}) => {
  await page.route("**/art/mage/mage.glb", (r) => r.abort());
  await page.goto("/");
  await expect(page.locator("#gpu-error")).toBeVisible();
  await expect(page.locator("#gpu-error h2")).toContainText("não terminou");
  await expect(page.locator("#gpu-error button")).toBeVisible();
  await expect(page.locator("#start-hands")).toBeDisabled();
});
