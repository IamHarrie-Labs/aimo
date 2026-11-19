import http from "node:http";
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { createRuntime } from "./runtime.mjs";
import { transferTool } from "./wallet.mjs";
import { weatherClient, repairWeatherMemory } from "./weather-repair.mjs";
import {
  replay,
  MemoryAgent,
  configuredModel,
  telegraphModel,
} from "./agent.mjs";
const runtime = createRuntime({ path: process.env.AIMO_DB ?? "data/aimo.db" });
const { engine, telegraph } = runtime;
const weather = weatherClient(engine.db);
const agent = new MemoryAgent(
  engine,
  process.env.AGENT_PLANNER === "telegraph"
    ? telegraphModel(engine.db)
    : configuredModel(),
);
const tool = transferTool();
const page = readFileSync(new URL("./index.html", import.meta.url));
const session = randomBytes(32).toString("hex");
const server = http.createServer(async (req, res) => {
  const reply = (status, data) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  try {
    if (
      !["127.0.0.1", "localhost"].includes(
        (req.headers.host ?? "").split(":")[0],
      )
    ) {
      reply(403, { error: "Host rejected" });
      return;
    }
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Set-Cookie": `aimo=${session}; HttpOnly; SameSite=Strict; Path=/`,
        "Content-Security-Policy":
          "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
      });
      res.end(page);
      return;
    }
    if (req.headers.cookie?.split("; ").includes("aimo=" + session) !== true) {
      reply(401, { error: "Open the local console to establish a session" });
      return;
    }
    if (req.method === "GET" && req.url === "/api/state") {
      reply(200, {
        records: engine.memories(),
        events: engine.audit(),
        integrity: engine.verify(),
        providerConfigured: Boolean(process.env.EVM_PRIVATE_KEY),
        purchases: telegraph.purchases(),
        reviewQueue: engine.reviewQueue().map((r) => r.id),
        reviewMode: runtime.reviewMode,
        chainHead: engine.chainHead() ?? null,
        walletMode: process.env.WALLET_MODE ?? "simulation",
      });
      return;
    }
    if (req.method === "GET" && req.url === "/api/export") {
      reply(200, {
        records: engine.memories(),
        events: engine.audit(),
        purchases: telegraph.purchases(),
      });
      return;
    }
    if (req.method !== "POST") {
      reply(404, { error: "Unknown endpoint" });
      return;
    }
    if (
      req.headers.origin !== `http://${req.headers.host}` ||
      !req.headers["content-type"]?.startsWith("application/json")
    ) {
      reply(403, { error: "Origin or content type rejected" });
      return;
    }
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 100000) {
        reply(413, { error: "Request too large" });
        return;
      }
    }
    const input = JSON.parse(body);
    if (req.url === "/api/memory") {
      reply(
        200,
        input.parents?.length
          ? await engine.proposeMemory({
              text: input.body,
              parentIds: input.parents,
              taskId: input.task,
            })
          : await engine.inspectRetrieved({
              content: input.body,
              source: "console",
              taskId: input.task,
            }),
      );
      return;
    }
    if (req.url === "/api/recover") {
      reply(
        200,
        engine.quarantineAndRecover({
          compromisedId: input.id,
          dryRun: input.dryRun !== false,
        }),
      );
      return;
    }
    if (req.url === "/api/review") {
      reply(200, engine.resolveReview(input));
      return;
    }
    if (req.url === "/api/rederive") {
      reply(200, await engine.rederive(input));
      return;
    }
    if (req.url === "/api/undo") {
      reply(200, engine.undoRecovery(input.snapshotId));
      return;
    }
    if (req.url === "/api/revise") {
      reply(200, await engine.reviseMemory(input));
      return;
    }
    if (req.url === "/api/restore-version") {
      reply(200, engine.restoreVersion(input.id));
      return;
    }
    if (req.url === "/api/consent") {
      reply(200, engine.issueConsent(input));
      return;
    }
    if (req.url === "/api/action") {
      try {
        reply(
          200,
          await engine.execute(
            { ...input, idempotencyKey: input.idempotencyKey ?? randomUUID() },
            tool,
          ),
        );
      } catch (error) {
        engine.event({ kind: "action-denied", reason: error.message });
        reply(200, { allowed: false, reason: error.message });
      }
      return;
    }
    if (req.url === "/api/weather-repair") {
      reply(200, await repairWeatherMemory(engine, weather, input));
      return;
    }
    if (req.url === "/api/replay") {
      reply(200, await replay(engine));
      return;
    }
    if (req.url === "/api/agent") {
      reply(200, await agent.run(input));
      return;
    }
    if (req.url === "/api/discover") {
      const schema = await telegraph.discover();
      reply(200, {
        intent: schema.intent_name,
        request: schema.request,
        response: schema.response,
        minerCount: schema.miner_count,
      });
      return;
    }
    reply(404, { error: "Unknown endpoint" });
  } catch (error) {
    reply(400, { error: error.message });
  }
});
const port = Number(process.env.PORT ?? 3000);
server.listen(port, "127.0.0.1", () =>
  console.log(`AIMO running at http://127.0.0.1:${port}`),
);
