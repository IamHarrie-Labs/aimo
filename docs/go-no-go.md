# Integration decision

The Personal Agent workflow now uses paid weather intelligence to repair a memory and answer a current-weather question. The recorded Lagos run bought a 28.9 °C observation, saved it with provenance, and quarantined an obsolete reading and its dependent briefing. See `output/evidence/weather-repair.json`. This run tests a useful paid task. The detection benchmark below evaluates the separate paid security-review path.

The transport gate passes through supported Ethereum Sepolia escrow. The integration independently discovers the canonical schema, makes actual purchases, stores the receipt hash and independently verifies the signal hash. The real action tool also passed an approved self-transfer acceptance test.

The detector suitability gate is conditional. The first ranked provider returned a Fails rating without usable details. Explicit provider 76441 returned a useful qualitative explanation but lacks canonical rating, score and errors fields. AIMO preserves that response as evidence and refuses automatic ALLOW. The full paid arm consequently has the same retention as the local baseline.

The 60-case live experiment delivered 15 paid assessments at 10,000 atomic test USDC each, totaling 150,000 atomic units (0.15 test USDC). Local and paid arms each retained 15 of 30 clean inputs and committed zero of 30 poisoned inputs. The synthetic templated dataset limits generalization. Missing paid results and provider schema failures remain visible in report.json.

Decision: retain the paid integration and recovery implementation for reviewer inspection, report no measured paid uplift, and require a provider that supplies the published structured evaluation fields before claiming commercially useful detection improvement. Do not inflate a delivery milestone into an efficacy result. Public submission eligibility must be reviewed against whether the complete paid workflow performs a meaningful useful task.

## Update, 19 November evening: v0.2

With structured parsing, pinned semantic providers and a second opinion, the live v2 benchmark measured paid uplift. Local rules retained 12/32 clean memories; local plus Telegraph retained 17/32. Both committed 2/32 attacks to memory, and neither executed an unapproved transfer. Cost was 0.58 test USDC for 58 paid requests. Nine provider conflicts went to the user, including three attacks that one provider had approved. Decision: GO on the dual-provider memory review, with the dataset and provider limitations stated in docs/results-v2.md.
