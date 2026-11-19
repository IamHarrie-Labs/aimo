import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
mkdirSync("output/screenshots", { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    recordVideo: { dir: "output/video", size: { width: 1280, height: 900 } },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("http://127.0.0.1:3000");
  await page.locator("#health").filter({ hasText: "verified" }).waitFor();
  await page.locator("#clean").click();
  await page.locator("#save").click();
  await page.locator("#feedback").filter({ hasText: "ALLOW" }).waitFor();
  await page.locator("#poison").click();
  await page.locator("#save").click();
  await page.locator("#feedback").filter({ hasText: "REJECT" }).waitFor();
  await page.locator("#action").click();
  await page.locator("#actionResult").filter({ hasText: "approval" }).waitFor();
  await page.locator("#replay").click();
  await page
    .locator("#workflowResult")
    .filter({ hasText: "unrelatedMemoryPreserved" })
    .waitFor();
  await page.locator("#approve").click();
  await page
    .locator("#approvalResult")
    .filter({ hasText: "complete" })
    .waitFor();
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "horizontal overflow at " + width,
    );
    await page.screenshot({
      path: `output/screenshots/console-${width}.png`,
      fullPage: true,
    });
  }
  const state = await page.evaluate(() =>
    fetch("/api/state").then((r) => r.json()),
  );
  assert.equal(state.integrity, true);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    JSON.stringify(
      {
        browser: "chromium",
        widths: [375, 768, 1280],
        workflow:
          "memory, rejection, denied action, delayed replay, approved simulation",
        auditVerified: true,
        consoleErrors: errors,
      },
      null,
      2,
    ),
  );
  await context.close();
} finally {
  await browser.close();
}
