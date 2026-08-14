# TODO: bind text to design-system type tokens

> For a future rebuild: every text element should bind to a DS font/type token and allow style swaps — not yet done in the current index.html.

When/if the portfolio is rebuilt on a proper stack (was scoped as Vercel + a headless CMS + a component framework — see case-study-direction.md and holotable-editor-and-glb.md), every editable text element should be tied to a font/type token from the design system, not just a free string. The editor should let the designer change both the copy AND the text's type style (e.g. H1 → H2 → body), pulling from the Figma type tokens (Chakra Petch / Space Grotesk / Space Mono — see visual-language-direction.md).

In the current `index.html`, copy is inline-editable but styles are hardcoded CSS — that's the known gap this note tracks. Supports the standing maximize-customization.md principle.
