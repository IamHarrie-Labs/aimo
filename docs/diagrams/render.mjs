// Redraws the hand-sketched diagrams in this folder:  node docs/diagrams/render.mjs
// Needs a Chromium-based browser (set BROWSER_CHANNEL, default "msedge").
// The handwriting font is "Ink Free" (ships with Windows); other systems fall
// back to the next cursive font they have.
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { diagrams } from "./diagrams.mjs";

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? "msedge",
});
for (const [name, d] of Object.entries(diagrams)) {
  const page = await browser.newPage({
    viewport: { width: d.width, height: d.height },
    deviceScaleFactor: 1.5,
  });
  await page.setContent(
    `<html><body style="margin:0"><canvas id="c" width="${d.width}" height="${d.height}"></canvas></body></html>`,
  );
  await page.addScriptTag({
    path: fileURLToPath(new URL("./sketch.js", import.meta.url)),
  });
  const overflow = await page.evaluate((ops) => window.drawSketch(ops), d.ops);
  if (overflow.length) console.warn(name, "text overflows:", overflow);
  await page.screenshot({
    path: fileURLToPath(new URL(`./${name}.png`, import.meta.url)),
  });
  await page.close();
  console.log("drew", name);
}
await browser.close();
