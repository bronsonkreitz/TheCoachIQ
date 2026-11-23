---
name: Manual statistics semantics
description: How to interpret independent team entries and zero-stat player appearances
---

Manual team totals and player box scores are separate records. An explicitly entered team total takes precedence for team results, trends and practice gaps, without changing player records, rankings or comparisons. The interface must identify this distinction and offer a return to summed player totals.

**Why:** The user requested manual entry for both individual and team stats. A coach may know a team total without having individual box scores; distributing it among players would fabricate player performance.

**How to apply:** Keep team-level consumers consistent about which source they use. Do not erase individual history when entering or correcting a team-only result, and do not silently overwrite manual team totals after a player edit.

An existing all-zero player game line can represent a real appearance.

**Why:** Some football appearances have no recorded counting stats. Dropping unchanged zero lines while saving unrelated stats changes games-played and derived averages.

**How to apply:** Preserve unchanged game lines, including zero-valued ones, when editing another player or team totals.
