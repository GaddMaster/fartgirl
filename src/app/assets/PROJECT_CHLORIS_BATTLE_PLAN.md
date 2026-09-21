# PROJECT CHLORIS — Battle Plan

Series: **PROJECT CHLORIS**
Window: **2026-09-20 → 2027-09-19**
Cadence: **3 comic pages / day** = 1,095 posts
Files: `project_chloris.js` (`shared` + `pages[]`) and `imagine_baseline.js`

## What the coins actually are

**Fart Boy** is the parent meme. Solana. Inspired by Adam Wallace’s kids’ book (Tidy Town). Original dev rugged it. **@Coins_Kid** called it around **$8.7k MC**, community CTO’d it, ran as high as ~**$200M**. Kid still holds.

**Fart Girl** is the sister / sidekick token. Same joke universe. Also rugged, also CTO’d, smaller. Kid has called her Fart Boy’s sister and said he still holds. This comic rides that weather. It does not copy the children’s book.

Kettle City is original. Fart Boy here is Subject Zero, rare guardian, same age band.

## Locked decisions

- Tone: Invincible / early Spider-Man
- Power look: stylized luminous emerald gas (never toilet-brown)
- Fart Boy: rare guardian
- Lead: Lena Cole, 20, barista at The Drip, Crane Street, Kettle City
- True flight starts Day 218
- Prime (Voss’s finished weapon) is Day 328

## Why daily posts work

Spider-Man’s engine is the bill. Every third page can be the diner.

## The year in 12 uneven arcs

| Arc | Days | Job |
|---|---|---|
| 1 The Fall | 1–24 | Origin. Chamber. First bad save. First silhouette. |
| 2 Amateur Hour | 25–52 | Job vs suit. First public rumor. |
| 3 The Smell of Money | 53–80 | Protection crew at The Drip. |
| 4 Reclaimers | 81–112 | Aetherion retrieval. He watches, no help. |
| 5 Masks at The Drip | 113–140 | Cam + Rhee closing in. |
| 6 Nox | 141–175 | First powered rival. First Boy save. |
| 7 I Clock Out | 176–198 | She quits. Fire on Crane Street. |
| 8 PROJECT CHLORIS | 199–230 | Cost of overuse. **D218 first flight.** Boy is already in the air. He does not help. |
| 9 The Brother on the Roof | 231–258 | One conversation. Warning: do not go back under. |
| 10 Voss Protocol | 259–300 | Containment weather. Voss calls her Two. |
| 11 The Chamber Below | 301–335 | She goes back. D319 he pulls her out. **D328 PRIME** — he is losing, she flies in, they barely win. |
| 12 Bloom | 336–365 | Weather that learned hunger. Last save. Empty tower. |

## Fart Boy schedule

- D18 silhouette
- D91 watches Reclaimers, stays put
- D156 saves her from Nox
- D218 first flight — beside her in the sky, did not help
- D241 one talk, leaves in a cloud
- D319 extracts her from the Chamber
- D328 Prime — he is losing, she saves them both
- D358 last save vs Bloom
- D365 he is not there

## App / Mongo

Collection: `pages`. One document per post.

Seed from `project_chloris.js`: loop `pages`, insert, then delete the array from the JS file. Keep `shared` and `imagine_baseline.js`.

Next page: `{ complete: false, series: "project-chloris" }` sort `{ order: 1 }`.
After a successful generate + post: set `complete: true`.

Imagine string: `imagineBaseline.prompt.full` + `state_lines[page.state]` + `page.imagePrompt`.
Attach Blob refs in `page.refImageIds`.

## Hand-written days (do not overwrite lightly)

1–3, 18, 91, 156, 217–219, 241, 319, 327–329, 358, 365.

## Year Two seed

The Bloom is awake. Voss is not dead. Cam almost has her face. Boy’s cloud does not come back for a long time.
