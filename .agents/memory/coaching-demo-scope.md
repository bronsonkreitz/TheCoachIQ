---
name: CoachIQ demo scope
description: Product context and intentional limits from the user's CoachIQ brief
---

CoachIQ is an ENTI 333 class project supporting Baseball, Soccer, Football, Basketball, and Hockey. All teams, players, and stats are fictional demo data, and every page must disclose that.

**Why:** The user supplied this product scope in their PRD.

**How to apply:** Preserve the demo disclosure and class credit when extending or redesigning the product. Do not introduce real team data, accounts, payments, live sports APIs, or video processing unless the user changes the scope. The requested persistence is local to the browser.

Treat an edit being applied and an edit being persisted as separate outcomes. Immediate edit confirmations should describe the change, not promise that it survived a browser write.

**Why:** Browser restrictions and quota limits can reject a write after the edit handler has already completed; reading the last save result inside that handler can falsely claim the new edit is saved. Editing must remain available even when persistence fails.

**How to apply:** Report browser-save success only for the latest successfully written snapshot, with a visible non-blocking warning and retry path when saving fails.
