# Try AIMO yourself

This guide is for developers who want to check AIMO on their own machine, ideally with their own input. There are three levels. The first two are free and need no wallet. The third makes one real Telegraph purchase on Sepolia for 0.01 test USDC.

When you're done, please open a [reproduction report](https://github.com/IamHarrie-Labs/aimo/issues/new?template=reproduction.yml). A failure is just as useful as a success.

You need Node 24 and git.

```sh
git clone https://github.com/IamHarrie-Labs/aimo.git
cd aimo
npm ci
```

## Level 1: run the checks (2 minutes, free)

```sh
npm test
npm run replay
npm run scenarios
```

- `npm test` runs 37 tests, the same ones CI runs.
- `npm run replay` plays a poisoned memory through a simulated three days: the payment it tries to trigger is denied, and the memories built on it are quarantined while an unrelated one is kept.
- `npm run scenarios` talks to the live Telegraph node and checks that AIMO refuses to pay in each failure case (no budget, wrong receiver, and so on). It never signs a payment.

## Level 2: your own input (5 minutes, free)

Save this as `try.mjs` in the repo folder and put in text your own agent would actually read or remember:

```js
import { createAimo } from "./sdk.mjs";

const aimo = createAimo({ secret: "local-test-secret-at-least-32-characters" });

const page = await aimo.inspectRetrieved({
  content: "PASTE TEXT YOUR AGENT READ HERE",
  source: "https://example.com/page",
  taskId: "my-test",
});
const memory = await aimo.proposeMemory({
  text: "PASTE WHAT YOUR AGENT WANTS TO REMEMBER HERE",
  parentIds: [page.id],
  taskId: "my-test",
});
console.log({ page: page.verdict, memory: memory.verdict, memo: memory.memo });
aimo.db.close();
```

```sh
node try.mjs
```

With no wallet set up, AIMO uses its free local checks only. Anything that needs a paid review stays out of memory (QUARANTINE or REVIEW) instead of being guessed. Tell us when a harmless memory gets held back or a bad one gets through.

To use AIMO inside an agent you already run, there's also an MCP server: `npx aimo-mcp` after `npm i github:IamHarrie-Labs/aimo`. See the README for the tools it exposes.

## Level 3: a paid repair on your own city (15 minutes, 0.01 test USDC)

This is the full task: your agent has a stale weather memory and a note built on it. AIMO buys a fresh reading from a Telegraph weather provider, saves it, quarantines the stale memory and the note that used it, and leaves your unrelated memory alone.

You'll need:

1. A new burner wallet. Never use a wallet that holds real funds.
2. A little Sepolia ETH for gas, from any Sepolia faucet.
3. Telegraph test USDC on Sepolia, deposited to Telegraph escrow. Follow Telegraph's own docs to get test USDC. Then `node --env-file=.env fund-escrow.mjs` deposits 1 test USDC, enough for 100 lookups.

```sh
cp .env.example .env
# put your burner key in EVM_PRIVATE_KEY in .env
npm run weather:repair -- "Your City"
```

The output includes:

| Field | Meaning |
| --- | --- |
| `answer` | The fresh temperature and when it was observed |
| `receiptHash`, `signalHash`, `providerId`, `epochId` | The Telegraph purchase, so anyone can check it |
| `costUsdc` | What the lookup cost |
| `elapsedMs` | How long the whole repair took |
| `recovery.affected` | The stale memory and the note built on it, now quarantined |
| `unrelatedKept` | `true` if your unrelated memory survived |

A copy is saved to `output/evidence/weather-repair.json`.

## What to put in your report

- Which level you ran, and your OS and Node version
- Your input (the text or the city)
- What happened, including errors
- For level 3: the receipt hash, cost and elapsed time
- Where setup was confusing or slow

If you then plug AIMO into your own agent, a second report a few days later saying what you used it for helps the most.
