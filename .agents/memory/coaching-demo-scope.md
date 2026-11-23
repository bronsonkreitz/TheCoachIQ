---
name: CoachIQ demo scope
description: Product context and intentional limits from the user's CoachIQ brief
---

CoachIQ began as an ENTI 333 class demo supporting Baseball, Soccer, Football, Basketball, and Hockey. Seeded teams, players and stats are fictional demo data and should be identified accurately.

**Why:** The user supplied this product scope in their PRD.

**How to apply:** Preserve accurate demo disclosures when extending the product, without restoring labels the user removed. Do not introduce payments, live sports APIs or video processing without a new request.

The user requested multiple teams within each sport and selected live read-only dashboard sharing instead of frozen copies. Coach sign-in protects editing; players and parents can use a link without an account, anyone possessing the link can view it, and private coach notes stay excluded.

**Why:** The user explicitly confirmed live updates after these sharing and sign-in consequences were explained.

**How to apply:** This expands the original browser-only scope to allow authenticated, server-persisted coaching teams and live sharing. Preserve existing browser work during migration, keep sharing opt-in, and distinguish fictional seeded demo records from coach-entered team data.

Treat an edit being applied and an edit being persisted as separate outcomes. Immediate edit confirmations should describe the change, not promise that it survived a browser write.

**Why:** Browser restrictions and quota limits can reject a write after the edit handler has already completed; reading the last save result inside that handler can falsely claim the new edit is saved. Editing must remain available even when persistence fails.

**How to apply:** Report browser-save success only for the latest successfully written snapshot, with a visible non-blocking warning and retry path when saving fails.
