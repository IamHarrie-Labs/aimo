// A tiny hand-drawn canvas renderer: wobbly double strokes, hatched fills and
// handwritten labels. Seeded, so the same input draws the same picture.
(() => {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const j = (n) => (rand() - 0.5) * 2 * n;
  const INK = "#1f2430";
  const COLORS = {
    ink: INK,
    red: "#b3392f",
    green: "#2f7d4f",
    blue: "#2b5c9e",
    amber: "#9a5f0c",
    grey: "#6b7280",
  };
  const FILLS = {
    red: "#f6d9d3",
    green: "#d8ecd9",
    blue: "#d9e6f6",
    amber: "#f8ebc6",
    grey: "#e8e6df",
    white: "#fffdf7",
  };
  const FONT = '"Ink Free", "Segoe Print", "Comic Sans MS", cursive';
  window.drawSketch = async (ops) => {
    await document.fonts.ready;
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d");
    const overflow = [];
    // ruled paper
    ctx.fillStyle = "#fbf8ef";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(60,90,140,0.07)";
    ctx.lineWidth = 1;
    for (let y = 32; y < canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    const stroke = (pts, color, width, dash) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.setLineDash(dash ? [9, 8] : []);
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[i + 1];
          const w = Math.min(2.4, Math.hypot(x2 - x1, y2 - y1) / 60) + 0.5;
          ctx.moveTo(x1 + j(1.6), y1 + j(1.6));
          ctx.bezierCurveTo(
            x1 + (x2 - x1) * 0.33 + j(w),
            y1 + (y2 - y1) * 0.33 + j(w),
            x1 + (x2 - x1) * 0.66 + j(w),
            y1 + (y2 - y1) * 0.66 + j(w),
            x2 + j(1.6),
            y2 + j(1.6),
          );
        }
        ctx.stroke();
        if (dash) break;
      }
      ctx.setLineDash([]);
    };
    const hatch = (x, y, w, h, color) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 2, y + 2, w - 4, h - 4);
      ctx.clip();
      ctx.strokeStyle = color;
      ctx.lineWidth = 7;
      for (let k = -h; k < w; k += 9) {
        ctx.beginPath();
        ctx.moveTo(x + k + j(2), y + h + 3);
        ctx.lineTo(x + k + h + j(2), y - 3);
        ctx.stroke();
      }
      ctx.restore();
    };
    const text = (s, x, y, size, color, align = "center", max) => {
      ctx.font = `${size}px ${FONT}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      const lines = String(s).split("\n");
      const lh = size * 1.28;
      lines.forEach((line, i) => {
        if (max && ctx.measureText(line).width > max) overflow.push(line);
        const ly = y + (i - (lines.length - 1) / 2) * lh;
        ctx.fillText(line, x, ly);
        ctx.fillText(line, x + 0.5, ly);
      });
    };
    for (const op of ops) {
      const color = COLORS[op.color ?? "ink"];
      if (op.t === "box") {
        const { x, y, w, h } = op;
        if (op.fill) hatch(x, y, w, h, FILLS[op.fill]);
        stroke(
          [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
            [x, y],
          ],
          color,
          1.7,
          op.dash,
        );
        const cx = x + w / 2;
        if (op.title && op.body) {
          text(op.title, cx, y + 26, 23, color, "center", w - 16);
          text(op.body, cx, y + (h + 38) / 2, 18, INK, "center", w - 16);
        } else
          text(
            op.title ?? op.body,
            cx,
            y + h / 2,
            21,
            op.title ? color : INK,
            "center",
            w - 16,
          );
      } else if (op.t === "line") {
        stroke(op.pts, color, 1.9, op.dash);
        if (op.head !== false) {
          const [x1, y1] = op.pts.at(-2);
          const [x2, y2] = op.pts.at(-1);
          const a = Math.atan2(y2 - y1, x2 - x1);
          for (const s of [-1, 1])
            stroke(
              [
                [
                  x2 - 15 * Math.cos(a + s * 0.48),
                  y2 - 15 * Math.sin(a + s * 0.48),
                ],
                [x2, y2],
              ],
              color,
              1.9,
            );
        }
      } else if (op.t === "text")
        text(op.s, op.x, op.y, op.size ?? 19, color, op.align, op.max);
    }
    return overflow;
  };
})();
