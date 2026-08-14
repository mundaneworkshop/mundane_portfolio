# Standing workflow: HTML verification

> After building HTML prototypes, save to project folder, verify visually + interactively in-browser, flag glitches with fixes. (type: feedback — a standing process preference.)

**Rule:** After creating/updating an HTML prototype change:

1. Save the file.
2. Open/exercise it (headless browser, or ask the user to reload if headless isn't available).
3. Take screenshots (visual validation).
4. Test interactions with clicks/gestures (interactive validation).
5. If a glitch is found: flag it, propose a fix, ask approval before implementing.
6. If no glitches: hand over the verified file.

**Why:** Eliminates the manual hand-check loop. The user should get verified changes with issues pre-identified and fixes queued, not discovered after handoff.

**How to apply:** Every HTML change goes through this flow. Glitch = something that breaks layout, doesn't respond to input, or behaves unexpectedly. Visual hiccups (pixel-off spacing) = fix silently if obvious, flag if uncertain about intent.
