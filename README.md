# The World in One Day — 26 November 2026

Entry for make.fun `news-image-20261126`: sum up Thursday 26 November 2026's
world news in one image.

`main.ts` (Node, stdlib only) draws a one-page newspaper front page —
masthead, lead story, six cards and a sport strip — and writes it to
`$MAKEFUN_OUTPUT_DIR/entry.png` (default `out/entry.png`), 1024x1024 PNG,
under 1 MiB, deterministic across runs.

Eight stories, all verified against news digests dated 26 November 2026:

1. Houthis hit Ras Tanura refinery (Reuters) — lead
2. Two tankers hit mines in the Strait of Hormuz (Reuters)
3. Israel kills Hamas security chief in Gaza (Reuters)
4. Solomon Islands pick Australia over China (security treaty)
5. First Pakistani astronaut aboard China's Tiangong station
6. Mumbai remembers 26/11, 18 years on / Constitution Day in India
7. Russia's own figures: nearly 500,000 lost in the Ukraine war
8. Gukesh opens his world chess title defence vs Sindarov

The font is a hand-made 5x7 bitmap font, the pictograms are geometric
shapes drawn from code, and the PNG encoder is hand-rolled (zlib deflate,
own CRC32 table). No network, no dependencies.

Run: `node main.ts`
