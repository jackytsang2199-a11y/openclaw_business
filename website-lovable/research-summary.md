# Website Marketing Research Summary

> Date: 2026-03-22
> Purpose: Consolidated findings from 3 research agents to inform website copy, design, and marketing decisions.

---

## 1. Competitor Intelligence

### EZClaw (ezclaw.cloud) — Direct Competitor
- **Headline:** "No servers. No code. No terminal. Just connect Telegram and go."
- **Price:** $49/mo (~HK$380) includes managed hosting + $15 AI credits
- **Setup:** Under 1 minute (paste bot token)
- **Stack:** Vanilla OpenClaw only — NO memory, NO search, NO watchdog, NO VPN
- **Models:** GPT-5.2, Gemini 3 Flash, GLM-5

**Our advantage over EZClaw:**

| | EZClaw | 蟹助手 |
|---|---|---|
| Setup | Paste bot token | We do everything remotely |
| Monthly | ~HK$380 | HK$148-388 (tiered) |
| Memory | ❌ None | ✅ Mem0 + Qdrant |
| Search | ❌ None | ✅ SearXNG (Reddit bypass) |
| Watchdog | ❌ None | ✅ Gateway + VPN failover |
| Browser | ❌ None | ✅ Chromium (Tier 3) |
| Language | English only | 中文 native |
| API costs | $15 credit (overage extra) | All-inclusive |

**Positioning:** EZClaw = "easiest vanilla setup." 蟹助手 = "most capable full stack."

### RunMyClaw.ai / SetupClaw.io
- Research found NO results for these domains — they may not actually exist or have very low traffic.

---

## 2. ChatGPT Pain Points (Marketing Ammunition)

ChatGPT market share dropped **86.7% → 64.5%** (Jan 2025 → Jan 2026). Key complaints:

| Pain Point | User Sentiment | Our Solution |
|---|---|---|
| **Memory limit (100 blocks, silent failures)** | "Most frustrating moment is when it asks you to repeat yourself" | Mem0 + Qdrant — unlimited vector memory |
| **Quality decline (GPT-5 backlash)** | "Shorter, vaguer answers than before" | Smart model routing, best available |
| **Content filtering / refusals** | "Ask anything controversial, get a lecture" | Self-hosted = your rules |
| **Ads in free tier (Feb 2026)** | Trust breach, cancellation trigger | No ads ever |
| **Price ($20/mo Plus, $200/mo Pro) with caps** | "Designed to convert, not to help" | All-inclusive flat fee |
| **Privacy / training data concerns** | "Changing policies, opt-in defaults" | Data stays on your server |
| **HK access blocked (VPN required)** | Every HK user hits "Access Denied" | VPN + VPS handled |

**Key quote:** "ChatGPT's memory has become the critical feature that separates a tool from a true assistant — and ChatGPT's implementation is broken."

---

## 3. What Users Actually Want (Feature Excitement Ranking)

| Rank | Feature | Emotional Response | Our Stack |
|---|---|---|---|
| 1 | **Memory / persistent context** | HIGHEST — "it remembers me" is transformational | ✅ Mem0 + Qdrant |
| 2 | **Real-time search** | HIGH — "answers grounded in current info, not 2023 data" | ✅ SearXNG |
| 3 | **Always-on availability** | HIGH — "Jarvis fantasy" — directive before bed, deliverables in morning | ✅ Watchdog + VPN failover |
| 4 | **Task automation** | MEDIUM-HIGH — "actually doing things, not just chatting" | ✅ Browser (Tier 3) |
| 5 | **Privacy / data control** | MEDIUM — important but not the primary purchase trigger | ✅ Self-hosted |
| 6 | **Custom personality** | NICHE — small but passionate audience | ✅ Tier 3 |

**Key insight:** Lead with MEMORY, not privacy. Memory generates emotional responses. Privacy is a supporting argument.

---

## 4. HK Market Psychology

### Purchase Drivers
- **"抵唔抵" (value-for-money)** — dominant driver, not cheapest price
- **跟風 (bandwagon)** — 76% choose based on reputation, 62% based on track record
- **KOC > KOL** — micro-influencers (10k-50k) have 3-5x higher engagement than macro
- **Risk aversion** — 30% fear data leakage, 22% doubt quality. Refund guarantee converts non-buyers

### Trust Signals (Priority Order)
1. FPS / PayMe payment (signals "real HK business")
2. WhatsApp/Telegram 真人客服 (instant response expectation)
3. 退款保證 ("7 日不滿意全額退款")
4. Specific user numbers (even small: "已服務 50+ 用戶")
5. HK company registration (CR number in footer)
6. Local 852 phone number

### LIHKG Strategy
- **NEVER post ads** — P-badge system catches new accounts, community hostile to 打手
- Post genuine tutorials / experience sharing in natural 廣東話
- Let comments ask "how?" — only mention service in replies
- Build account credibility over weeks before any service mention

---

## 5. Headline & Copy Formulas That Work

### Proven Headline Patterns (with real examples)

| Pattern | Example | Conversion Impact |
|---|---|---|
| **Elimination stack** | "No servers. No code. No terminal. Just..." | Creates relief, removes fear |
| **Ownership** | "Not rent it. Own it." (Open WebUI) | Powerful in HK (rent vs own property) |
| **Time-back** | "Get two hours back every day" (Lindy) | Tangible, measurable benefit |
| **Category creation** | "The Operating System for AI Agents" (Dust) | Positions as something new |
| **Contrast** | "ChatGPT 是租回來的。這個是你自己的。" | Instant differentiation |
| **Question** | "你的 AI 記得你上次說什麼嗎？" | 35% higher engagement |

### Chinese Copy Rules
- Headlines: under 15 characters ideal
- Numbers outperform vague claims ("30 分鐘" beats "快速")
- Benefit-first, not feature-first
- CTA: 4-6 characters max ("立即查詢" / "免費諮詢")

### Memory Marketing Language

**Exciting (use):**
- "It remembers you" (personal, emotional)
- "The longer you use it, the better it knows you"
- "A brain that never forgets"
- "Gets to know you like a friend would"

**Boring (avoid):**
- "Vector database with semantic search"
- "Long-term memory storage"
- "Persistent context window"
- "Data retention capabilities"

---

## 6. Best Demo Format

| Format | Conversion | Recommendation |
|---|---|---|
| Interactive demo | 7.9x higher conversion | Not feasible for Phase 0 |
| Chat mockup / screenshot | 86% of top demos use this | ✅ Best for hero section |
| Short video (30s-2min) | 86% conversion lift | Phase 1 — screen record real Telegram |
| Before/After comparison | Strong for differentiating | ✅ Already in our plan |

**For Phase 0:** Animated Telegram chat mockup in hero (already have). Improve the conversation content to showcase multiple capabilities.

---

## 7. Top 10 Viral AI Taglines (Reference)

| Product | Tagline |
|---|---|
| Lindy | "Get two hours back every day" |
| Open WebUI | "Not rent it. Not depend on it. Own it." |
| Jan.ai | "Personal Intelligence that answers only to you" |
| Dust | "The Operating System for AI Agents" |
| Perplexity | "Where knowledge begins" |
| Cursor | "The best way to code with AI" |
| Limitless | "Personalized AI powered by what you've seen, said, and heard" |
| EZClaw | "No servers. No code. No terminal. Just connect and go." |
| ChatGPT | "Get answers. Find inspiration. Be more productive." |
| AutoGPT | "Accessible AI for everyone" |

---

## Sources

See individual research agent outputs for full source lists. Key sources:
- EZClaw: ezclaw.cloud
- OpenClaw reviews: Hacker News, aimlapi.com, aimaker.substack.com
- HK market: ePrice HK, DotAI, HKT Enterprise, Marketing-Interactive
- ChatGPT backlash: nxcode.io, techradar, piunikaweb, platformer.news
- Conversion data: Navattic, Supademo, Framer
- HK consumer psychology: Ipsos HK, Consumer Council, Go-Globe
