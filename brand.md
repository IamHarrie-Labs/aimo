# Brand: AIMO

The public brand is monochrome: black, white and grey, with a lineage mark. The earlier violet identity is kept only for the local console (see the end of this file).

## Logo

- **Lineage mark** (`docs/brand/aimo-lineage-mark.svg`): four nodes joined into an "A". The apex is a source, the base nodes are actions, and the crossbar node is the memory that links them. Use it white on black, or black on white. It is also the favicon.
- **Lockup**: the mark followed by "AIMO" in Inter Semibold, all caps, as in the site header.
- Keep clear space of at least half the mark's height on every side. Don't add colour, gradients, outlines or effects.

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| Black | `#000000` | Page background |
| White | `#FFFFFF` | Headings, primary text, primary button |
| Grey | `#9A9A9A` | Secondary text (7.4:1 on black) |
| Silver gradient | white to light grey | Navigation pills and buttons only |

Status colours aren't used on the public page. Results are shown as plain figures with icons.

## Type

- **Inter** for all interface text.
- **Instrument Serif italic** only for the accent words "AI agents" in the headline.
- Both are self-hosted (`docs/inter.woff2`, `docs/instrument-serif-italic.woff2`) under the SIL Open Font License 1.1.

## Motion and media

- The hero is a looping, dark, grainy film of light on soft forms. It is decorative mood footage, not a recording of AIMO, and nothing on the page claims otherwise.
- Files: `docs/hero.mp4` (1080p, 3.8 MB) for screens 768 px and wider, `docs/hero-mobile.mp4` (960p, 0.85 MB) for phones, and `docs/hero-poster.jpg` as the first frame while loading. A dark scrim keeps text contrast throughout the loop. Reduced-motion mode hides the video.

## Voice

Plain, calm and specific. Say what happens ("keep payments under your approval"), not how clever it is. Keep public pages free of jargon, put technical detail in the docs, and state limits openly: the stats say "64 synthetic cases" and "in the test".

## Landing page (`docs/index.html`)

- One screen on desktop; natural scrolling and a full-screen menu on phones.
- Headline: "Protect AI agents from poisoned memories." Primary action: "Run AIMO locally" (the tutorial). Secondary: "Explore the workflow", a keyboard-accessible dialog.
- The dialog uses `docs/workflow-demo.json`: the recorded live case `poisoned-22` (providers disagreed, routed to a person, no payment) plus a deterministic local replay. Both are labelled as recorded evidence. The page makes no live requests, purchases or transfers.
- Three stats from the v0.2.1 live run link to `docs/results-v2.md`: 22/32 useful memories kept, 0/32 attacks saved, 8 disagreements sent to a person.
- Every link and button has a touch target of at least 44 px.

## Legacy violet identity

`docs/brand/aimo-wordmark.svg` and `docs/brand/aimo-mark.svg` (violet `#5B3DF5`, Geist) were the first public identity. They remain for the local console and older screenshots, but aren't used on the public site.
