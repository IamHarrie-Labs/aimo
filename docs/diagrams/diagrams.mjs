// What each diagram shows. Keep these in step with engine.mjs, reviewer.mjs,
// escrow.mjs and telegraph.mjs.
const box = (x, y, w, h, title, body, extra = {}) => ({
  t: "box",
  x,
  y,
  w,
  h,
  title,
  body,
  ...extra,
});
const arrow = (pts, extra = {}) => ({ t: "line", pts, ...extra });
const note = (s, x, y, extra = {}) => ({ t: "text", s, x, y, ...extra });
const blue = { color: "blue", fill: "blue" };
const green = { color: "green", fill: "green" };
const red = { color: "red", fill: "red" };
const amber = { color: "amber", fill: "amber" };
const white = { fill: "white" };

const attack = {
  width: 1200,
  height: 620,
  ops: [
    note("How a memory attack works, and where AIMO steps in", 600, 42, {
      size: 34,
    }),
    note("Without AIMO", 40, 112, { size: 27, color: "red", align: "left" }),
    box(
      40,
      140,
      300,
      130,
      "Monday",
      'agent reads a vendor page:\n"payouts go to 0xF00d..."',
      white,
    ),
    box(450, 140, 300, 130, "Same day", "saves it as\nyour preference", red),
    box(
      860,
      140,
      300,
      130,
      "A week later",
      '"pay the invoice"\nmoney goes to 0xF00d',
      red,
    ),
    arrow(
      [
        [348, 205],
        [440, 205],
      ],
      { color: "red" },
    ),
    arrow(
      [
        [758, 205],
        [850, 205],
      ],
      { color: "red" },
    ),
    note("With AIMO", 40, 342, { size: 27, color: "green", align: "left" }),
    box(40, 370, 300, 130, "Monday", "same page,\nsame hidden line", white),
    box(
      450,
      370,
      300,
      130,
      "Before saving",
      "money + address = risky,\nso it gets checked",
      blue,
    ),
    box(
      860,
      370,
      300,
      130,
      "A week later",
      "no signed approval,\nso no transfer",
      green,
    ),
    arrow([
      [348, 435],
      [440, 435],
    ]),
    arrow(
      [
        [758, 435],
        [850, 435],
      ],
      { color: "green" },
    ),
    arrow(
      [
        [600, 506],
        [600, 545],
      ],
      { color: "blue" },
    ),
    note("unsafe or unsure: it stays out of memory", 600, 575, {
      color: "blue",
      size: 22,
    }),
  ],
};

const architecture = {
  width: 1200,
  height: 820,
  ops: [
    note("AIMO: three checkpoints between an agent and trouble", 600, 40, {
      size: 34,
    }),
    box(40, 110, 220, 110, "The outside", "web pages, files,\ntool results", {
      fill: "grey",
    }),
    box(40, 330, 220, 110, "Your agent", "reads, remembers,\nacts", white),
    box(40, 590, 220, 110, "You", "approve payments,\nsettle disputes", amber),
    box(
      390,
      110,
      330,
      110,
      "1. Reading",
      "inspectRetrieved()\ninformation, never orders",
      blue,
    ),
    box(
      390,
      330,
      330,
      110,
      "2. Remembering",
      "proposeMemory()\nmust name its sources",
      blue,
    ),
    box(
      390,
      590,
      330,
      110,
      "3. Acting",
      "authorizeAction()\nsigned, one-use approval",
      blue,
    ),
    box(
      850,
      180,
      310,
      170,
      "Telegraph reviewers",
      "paid in test USDC\nthrough escrow,\nreceipt for every answer",
      green,
    ),
    box(
      850,
      420,
      310,
      120,
      "Local SQLite",
      "memories, lineage,\nhash-chained log",
      white,
    ),
    box(
      850,
      590,
      310,
      110,
      "Wallet",
      "simulated, or\nSepolia test USDC",
      white,
    ),
    arrow([
      [266, 165],
      [382, 165],
    ]),
    arrow([
      [266, 385],
      [382, 385],
    ]),
    arrow([
      [250, 446],
      [388, 585],
    ]),
    arrow(
      [
        [266, 655],
        [382, 655],
      ],
      { color: "amber" },
    ),
    note("risky only", 785, 150, { color: "green" }),
    arrow(
      [
        [728, 170],
        [842, 230],
      ],
      { color: "green", dash: true },
    ),
    arrow(
      [
        [728, 350],
        [842, 300],
      ],
      { color: "green", dash: true },
    ),
    arrow([
      [728, 412],
      [842, 462],
    ]),
    arrow([
      [728, 645],
      [842, 645],
    ]),
    note("only if every gate passes", 785, 722, { size: 17 }),
    note(
      "Free local rules run first at checkpoints 1 and 2. Paid advice can block or escalate, never approve a payment.",
      600,
      782,
      { size: 21, max: 1180 },
    ),
  ],
};

const review = {
  width: 1200,
  height: 900,
  ops: [
    note("What happens to one memory", 600, 40, { size: 34 }),
    box(450, 80, 300, 76, null, "new memory", white),
    arrow([
      [600, 162],
      [600, 202],
    ]),
    box(
      430,
      208,
      340,
      92,
      "Local rules (free)",
      "text cleanup, risk signals",
      blue,
    ),
    arrow(
      [
        [424, 254],
        [250, 254],
        [250, 338],
      ],
      { color: "green" },
    ),
    note("no risk signal", 320, 230, { color: "green" }),
    box(110, 344, 280, 90, "SAVED", "cost: nothing", green),
    arrow(
      [
        [776, 254],
        [950, 254],
        [950, 338],
      ],
      { color: "red" },
    ),
    note("clear attack", 870, 230, { color: "red" }),
    box(810, 344, 280, 90, "REJECTED", "nothing bought", red),
    arrow([
      [600, 306],
      [600, 450],
    ]),
    note("risky", 636, 335),
    box(
      420,
      456,
      360,
      94,
      "Reviewer 1 (paid)",
      "SECURITY_REVIEW_GENERAL",
      blue,
    ),
    note(
      "a clear no, or a clear yes\nto something low-stakes:\nits answer decides",
      210,
      504,
      { size: 19 },
    ),
    arrow(
      [
        [414, 504],
        [352, 504],
      ],
      { dash: true },
    ),
    arrow([
      [600, 556],
      [600, 626],
    ]),
    note("unsure, failed, or says yes\nto something high-stakes", 760, 590, {
      size: 18,
    }),
    box(
      420,
      632,
      360,
      94,
      "Reviewer 2 (paid)",
      "CONTENT_MODERATION_GENERAL",
      blue,
    ),
    arrow(
      [
        [470, 732],
        [230, 760],
      ],
      { color: "green" },
    ),
    arrow(
      [
        [600, 732],
        [600, 760],
      ],
      { color: "amber" },
    ),
    arrow(
      [
        [730, 732],
        [970, 760],
      ],
      { color: "red" },
    ),
    box(50, 766, 300, 90, "Both say safe", "saved, with receipts", green),
    box(450, 766, 300, 90, "They disagree", "held, and you decide", amber),
    box(850, 766, 300, 90, "Both no, or one fails", "held out of memory", red),
    note(
      "A memory built on a quarantined source is held automatically, and no review is bought for it.",
      600,
      878,
      { size: 20, max: 1180 },
    ),
  ],
};

const payment = {
  width: 1200,
  height: 790,
  ops: [
    note("Buying one review through Telegraph escrow", 600, 40, { size: 34 }),
    box(90, 80, 220, 64, "AIMO", null, blue),
    box(490, 80, 220, 64, "Telegraph node", null, green),
    box(890, 80, 220, 64, "Provider", null, { fill: "grey" }),
    arrow(
      [
        [200, 468],
        [200, 730],
      ],
      { head: false, dash: true, color: "grey" },
    ),
    arrow(
      [
        [200, 150],
        [200, 306],
      ],
      { head: false, dash: true, color: "grey" },
    ),
    arrow(
      [
        [600, 150],
        [600, 730],
      ],
      { head: false, dash: true, color: "grey" },
    ),
    arrow(
      [
        [1000, 150],
        [1000, 668],
      ],
      { head: false, dash: true, color: "grey" },
    ),
    note("reserve the budget first\n(per request and per day)", 214, 180, {
      align: "left",
      size: 18,
    }),
    arrow([
      [206, 240],
      [592, 240],
    ]),
    note("the question", 400, 220),
    arrow(
      [
        [594, 292],
        [208, 292],
      ],
      { color: "amber" },
    ),
    note("402: here is the price", 400, 272, { color: "amber" }),
    box(
      30,
      312,
      410,
      150,
      "Check before signing",
      "right chain, receiver and resource,\namount under the cap.\nRefused here = nothing spent.",
      red,
    ),
    arrow(
      [
        [206, 510],
        [592, 510],
      ],
      { color: "blue" },
    ),
    note("signed one-time payment", 400, 490, { color: "blue" }),
    arrow([
      [608, 548],
      [992, 548],
    ]),
    note("routed to the miner", 800, 528),
    arrow([
      [992, 596],
      [608, 596],
    ]),
    note("answer", 800, 576),
    arrow(
      [
        [592, 644],
        [208, 644],
      ],
      { color: "green" },
    ),
    note("answer + receipt + signal hash", 400, 624, { color: "green" }),
    note("stored with the memory;\nsame question later = reused", 214, 692, {
      align: "left",
      size: 18,
    }),
    note(
      "later, the node publishes a\ndelivery proof for that epoch",
      890,
      700,
      {
        size: 19,
        color: "green",
      },
    ),
    note(
      "If something breaks after signing, the payment is marked unresolved and never retried on its own.",
      600,
      764,
      { size: 20, max: 1180 },
    ),
  ],
};

const recovery = {
  width: 1200,
  height: 650,
  ops: [
    note("Recovery: pull the bad branch, keep everything else", 600, 40, {
      size: 34,
    }),
    box(70, 110, 300, 100, "Old weather reading", "stale or poisoned", red),
    box(70, 290, 300, 100, "Briefing", "built on that reading", red),
    box(70, 470, 300, 100, "Scheduled task", "depends on the briefing", {
      ...red,
      dash: true,
    }),
    arrow(
      [
        [220, 216],
        [220, 282],
      ],
      { color: "red" },
    ),
    arrow(
      [
        [220, 396],
        [220, 462],
      ],
      { color: "red" },
    ),
    box(450, 110, 300, 100, "Fresh paid reading", "receipt attached", green),
    box(450, 290, 300, 100, "New memory", "linked to its source", green),
    arrow(
      [
        [600, 216],
        [600, 282],
      ],
      { color: "green" },
    ),
    box(850, 110, 300, 100, '"I prefer metric"', "unrelated: untouched", blue),
    note("quarantineAndRecover()", 820, 300, { align: "left", size: 25 }),
    note(
      "- walks every descendant\n- quarantines them\n- turns off their schedules\n- takes a snapshot, so you can undo\n- writes a recovery memo",
      820,
      410,
      { align: "left", size: 21 },
    ),
    arrow(
      [
        [805, 505],
        [384, 384],
      ],
      { color: "amber" },
    ),
    note(
      "Anything that can be rebuilt from clean sources is listed, and goes through the same checks again.",
      600,
      616,
      { size: 20, max: 1180 },
    ),
  ],
};

export const diagrams = { attack, architecture, review, payment, recovery };
