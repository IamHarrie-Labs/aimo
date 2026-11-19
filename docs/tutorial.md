# Trace and recover poisoned agent memory

Start AIMO with `npm start` and open the local console. Inspect a factual research note, then inspect an embedded payment preference. The second note is ambiguous because retrieved content attempts to alter future behavior. A local rule can reject an explicit attack. Ambiguity can instead trigger a paid external review.

Telegraph publishes canonical schemas at `/engine/v1/intents`. AIMO checks the selected Intent has providers and a request schema before buying. It first buys a `TEXT_CLASSIFICATION_GENERAL` answer (category and confidence). If that answer is uncertain, or if it allows text that mentions wallets, payments, approvals or secrets, AIMO buys a second opinion from `SECURITY_REVIEW_GENERAL`, a different Intent with its own provider pool. Two safe answers retain the memory. Two unsafe answers keep it out. A disagreement goes to the user. A missing answer or failed payment keeps the memory quarantined. Identical requests reuse the stored answer instead of paying again.

Each retained summary carries its parent records and original source IDs. Summarizing a poisoned note cannot remove inherited quarantine. At the tool boundary, a separate deterministic check verifies signed approval scope, expiry and one-use status. An assessment never substitutes for user approval.

Run the delayed replay. It advances a labeled simulated timeline, attempts an unauthorized action, and recovers contaminated descendants. It also imports a historical missed write to exercise recovery after persistence, disables a dependent scheduled task and preserves a separate good memory.

Open decision history to inspect source hashes, provider evidence and action results. Export evidence for a local reviewer. For a public demonstration use only the included synthetic fixtures. A memory export contains original text.

Run `npm run eval` to reproduce the three-arm experiment. Local rules currently overblock several clean preference-like examples. The offline Telegraph arm has identical retention because no paid review runs. Use `npm run eval:live` with a funded burner only after the probe works. Read its generated cost and false-positive counts before making performance claims.

To integrate another agent, import `createAimo` from `sdk.mjs`, call `inspectRetrieved` on every incoming tool result, call `proposeMemory` with all source IDs, and invoke consequential tools only through `execute`. Keep approval issuance in a trusted operator interface. Runtime code must provide complete provenance links.

An independent reviewer can help by trying a new clean preference, a paraphrased delayed instruction and a recovery involving multiple derived notes. Report exact inputs, software version, network, observed output and whether a paid call occurred. This is a concrete contribution even when it reveals a failure.
