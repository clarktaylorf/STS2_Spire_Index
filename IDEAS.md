# SpireIndex — Ideas Backlog

---

## 💡 Tier List: Facemash-Style Voting System

**The concept:** Instead of a static tier list, build a head-to-head card voting system (inspired by Facemash). Players do 3 quick matchup votes per day. Over time, ELO rankings emerge organically from community data.

**Why it works for STS:**
- 500+ cards = weeks of data accumulation before rankings stabilize (good retention hook)
- Head-to-head feels more natural than star ratings for cards — context matters
- 3 votes/day creates a daily habit loop

**The mechanic:**
- Two cards appear side by side (filtered to same class)
- Click the one you'd rather have in a run
- ELO score updates server-side
- After 3 votes: "Come back tomorrow" with a countdown timer

**Open questions to revisit:**
1. Login method — GitHub OAuth, anonymous fingerprint, or email? (Tradeoff: friction vs. data quality)
2. Where does ELO data live? Needs a backend — Vercel serverless + Supabase or PlanetScale (both free-tier, Vercel-compatible)
3. Class-specific matchups only, or allow cross-class comparisons?
4. Show live rankings immediately, or only after you've voted?

**Status:** Idea only — no action yet. Revisit when tier list page is on deck.
