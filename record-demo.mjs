import { chromium } from "@playwright/test";
import { mkdirSync, renameSync } from "node:fs";
mkdirSync("output/video", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: "output/video", size: { width: 1280, height: 900 } },
});
try {
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("http://127.0.0.1:3000");
  await page.waitForTimeout(8000);
  await page.locator("#clean").click();
  await page.locator("#save").click();
  await page.waitForTimeout(8000);
  await page.locator("#poison").click();
  await page.locator("#save").click();
  await page.waitForTimeout(8000);
  await page.locator("#action").click();
  await page.waitForTimeout(8000);
  await page.locator("#replay").click();
  await page
    .locator("#workflowResult")
    .filter({ hasText: "unrelatedMemoryPreserved" })
    .waitFor();
  await page.waitForTimeout(10000);
  await page
    .getByRole("heading", { name: "Memory lineage" })
    .scrollIntoViewIfNeeded();
  await page.waitForTimeout(8000);
  await page.locator("#approve").click();
  await page
    .locator("#approvalResult")
    .filter({ hasText: "complete" })
    .waitFor();
  await page.waitForTimeout(8000);
  const evidence = page.getByRole("heading", { name: "Paid assessments" });
  if (await evidence.count()) {
    await evidence.scrollIntoViewIfNeeded();
    await page.locator("#purchases summary").first().click();
    await page.waitForTimeout(10000);
  }
  const video = page.video();
  await context.close();
  const path = await video.path();
  renameSync(path, "output/video/aimo-demo.webm");
  console.log("Recorded output/video/aimo-demo.webm");
} finally {
  await browser.close();
}
