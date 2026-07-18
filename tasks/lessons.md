# Lessons Learned

## 2026-04-25: Haiku 4.5 is NOT a drop-in replacement for Sonnet 4.6 on the caption path
- Bake-off on 12 representative photos showed Haiku 4.5 mis-identified species on at least one (husky → "black and white cat") and produced more generic, less-grounded punchlines.
- Sonnet 4.6 referenced specific objects in the photo more reliably (the bread slice on the cat, the blanket on the dog, the drain by the yelling cat); Haiku frequently fell back to generic "you said you'd be home" tropes that work for any pet.
- Speed: Haiku averaged ~2.1s vs Sonnet ~4.2s (2x faster) and ~3x cheaper per call.
- Verdict: keep Sonnet 4.6 for caption + convo generation. Cost savings are real but not worth the brand risk of a husky being called a cat.
- The pet-DETECTION step (binary yes/no) stays on Haiku — that's not species-sensitive.
- Bake-off tooling lives in `scripts/bake-off.mjs` + `bake-off-results/viewer.html` for re-running when newer Haiku versions ship.

## 2026-02-15: The product is whatmypetthinks.com, NOT petsubtitles
- The repo folder is called "Pet Subtitles" and the old GitHub URL says "petsubtitles" — but the actual product/domain is **whatmypetthinks.com**
- This is defined in `lib/imageCompositor.ts` as `BRAND_URL = "whatmypetthinks.com"`
- Always refer to the product by its real name, not the repo name
- When deploying, the correct alias is whatmypetthinks.com
