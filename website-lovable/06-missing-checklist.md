# Missing Info Checklist

> Items needed before website can launch. Updated 2026-03-29 with concrete actions, time estimates, dependencies, and execution order.

## 🔴 Must have (cannot launch without)

| # | Item | Status | Next Action | Time Est. | Dependencies | AI? | Notes |
|---|---|---|---|---|---|---|---|
| 1 | **WhatsApp number** | ❌ | Buy a prepaid HK SIM card (e.g. CMHK or 3HK from 7-Eleven, ~HK$50). Insert into spare phone. Register WhatsApp Business with it. Set business name to "蟹助手 3NexGen", add logo as profile pic. Copy the wa.me/{number} link. | 45 min | None (physical task) | No — requires buying SIM and phone verification | wa.me/{number} — use a separate SIM, not personal |
| 2 | **Telegram handle** | ❌ | Open Telegram, message @BotFather, send `/newbot`, name it "蟹助手 客服" with username `@nexgen3_bot`. Then create a public Telegram channel `@nexgen3hk` for announcements. Save the bot token for future Tally.so notification integration. | 10 min | None | Partially — human must interact with BotFather, but steps are scripted | e.g. @nexgen3hk or @clawhk |
| 3 | **Instagram handle** | ❌ | Create a new Gmail (e.g. nexgen3hk@gmail.com). Sign up for Instagram with username `clawhk.hk` or `3nexgen.hk`. Convert to Business Account (Settings > Account > Switch to Professional). Link to a Facebook Page (create one named "蟹助手 3NexGen" if none exists). Set profile pic to logo. | 30 min | #5 (logo) for profile pic, but account can be created first | No — requires email/phone verification and Meta account linking | Need IG business account for insights and contact button |
| 4 | **Domain** | ✅ | DONE. `3nexgen.com` already purchased on Cloudflare. Remaining: configure Cloudflare Pages project and set custom domain to `3nexgen.com`. In CF dashboard: Pages > Create project > Connect Git > set build command `npm run build`, output dir `dist`, add custom domain. | 15 min (Pages setup only) | Website build ready (#6 screenshots, #5 logo integrated into code) | Partially — human must click through CF dashboard, but an AI can write the deploy script | `3nexgen.com` on Cloudflare |
| 5 | **Logo** | ❌ | Option A (fast): Use an AI image generator (Midjourney, DALL-E, or Ideogram) with prompt: "Minimalist logo, orange crab icon holding a chat bubble, dark background, clean vector style, text '蟹助手' in modern Chinese typography". Generate 4 variants, pick best. Export as SVG + PNG (512x512 for favicon, 1024x1024 for general use). Option B: Commission on Fiverr (~US$30, 2-3 days). | 30 min (AI) or 3 days (Fiverr) | None | Yes — AI image generation. Human picks final choice. | Minimum: text logo "蟹助手" + crab icon. Needed for favicon, OG image, social profiles. |
| 6 | **Telegram chat screenshots** | ❌ | Open your own OpenClaw Telegram instance. Have 3-5 realistic conversations showcasing: (a) general Q&A, (b) memory recall ("you told me last week..."), (c) web search results, (d) Cantonese-friendly responses. Take phone screenshots (not desktop — mobile looks better on website). Crop to show just the chat, no status bar. Export as PNG, 1080px wide. | 60 min | A working OpenClaw instance with Mem0 memory populated | No — requires real conversations on a real instance, and editorial judgment on which look best | For Hero section + Social Proof section. 4-6 screenshots minimum. |
| 7 | **Tally.so form** | ❌ | Go to tally.so, sign up (free tier is fine). Create form titled "聯絡我們 Contact Us" with fields: Name (text), Email (email), WhatsApp number (phone, optional), Tier interest (dropdown: 新手上路/智能管家/全能大師/未決定), Message (long text). In Integrations tab: connect Google Sheets (auto-logs responses) and add email notification to your inbox. Publish and copy embed URL. | 20 min | None | Partially — AI can draft the form structure, human must create account and configure integrations | Free tier supports unlimited forms. Add Telegram notification via webhook later. |

## 🟡 Nice to have (can launch without, add later)

| # | Item | Status | Next Action | Time Est. | Dependencies | AI? | Notes |
|---|---|---|---|---|---|---|---|
| 8 | Beta user quotes | ❌ | Recruit 3-5 friends/family. Install OpenClaw on their VPS (or share your instance). Let them use it for 1-2 weeks. Then ask: "What do you like most?" and "Would you recommend it?". Format quotes as: "Quote text" -- Name, occupation. Use placeholder quotes for Phase 0 launch. | 2-3 weeks (calendar time), 2 hrs active work | Working onboarding pipeline or manual install capability | No — requires real human users and real feedback | Use placeholder text for initial launch, swap in real quotes later |
| 9 | Memory recall screenshot | ❌ | In your OpenClaw instance, set up a scenario: tell the bot your preferences over several days (e.g. "I like Japanese food", "My budget is $200"). Then ask "What restaurants would I like?" and screenshot the response that references your stored preferences. Crop and export as PNG 1080px wide. | 20 min | Working OpenClaw + Mem0 instance with history | No — requires interacting with real instance | Shows the Mem0 memory feature in action |
| 10 | Search result screenshot | ❌ | In your OpenClaw instance, ask a search-heavy question like "What are the best ramen shops in Tsim Sha Tsui?" or "Latest iPhone 17 news". Screenshot the response showing cited web results. Crop and export as PNG 1080px wide. | 15 min | Working OpenClaw + SearXNG instance | No — requires real instance with SearXNG running | Shows the self-hosted search feature |
| 11 | OG image | ❌ | Create a 1200x630px image in Canva (free) or Figma. Layout: dark background (#0a0a0a), logo on left, tagline "你的私人 AI 助手" on right, "3nexgen.com" at bottom. Export as PNG. Add to website as `<meta property="og:image">`. Test with opengraph.xyz. | 20 min | #5 (logo) | Yes — AI can generate via image tools, or use Canva template. Human reviews. | Critical for social sharing on LIHKG, WhatsApp, Telegram |
| 12 | Privacy diagram | ❌ | Create a simple side-by-side diagram. Left: "ChatGPT" with arrows showing data going to OpenAI servers (red). Right: "蟹助手" with arrows showing data staying on your own VPS via proxy (green). Tools: Excalidraw (free), Figma, or AI-generated. Export as SVG or PNG. | 30 min | None | Yes — AI can generate the diagram with a drawing tool or code (e.g. Mermaid/SVG). Human reviews. | Powerful trust signal for privacy-conscious HK users |

## 🟢 Later

| # | Item | Status | Next Action | Time Est. | Dependencies | AI? | Notes |
|---|---|---|---|---|---|---|---|
| 13 | Multi-language | ❌ | Implement i18n using `react-i18next`. Extract all Chinese strings into JSON locale files. Add English translations. Add language toggle to navbar. | 4-6 hrs | Stable website codebase (post-launch) | Yes — AI can do the i18n refactor and generate translation files | Phase 0 = Chinese only. Add English when targeting non-Cantonese HK residents. |
| 14 | Installation counter | ❌ | Add a live counter component that calls CF Worker endpoint `GET /api/stats/installs` (needs new endpoint). Display as "已幫 XX 位用戶安裝". Use `react-countup` for animation. Hardcode initial number if < 10 installs. | 2 hrs | CF Worker stats endpoint + real customer data | Yes — AI can build the component and API endpoint | Add when you have real install numbers to show |
| 15 | LIHKG screenshots | ❌ | After posting on LIHKG, monitor for positive discussions. Screenshot good threads/comments. Crop to show the positive sentiment. Add to social proof section. | 15 min per screenshot | Active LIHKG presence + positive threads | No — requires monitoring real forum activity | Add after marketing launch on LIHKG |
| 16 | Video demo | ❌ | Screen-record a 30-60 second demo on phone: open Telegram, send a message to OpenClaw bot, show the response, show memory recall. Edit with CapCut (free). Export as MP4 and upload to IG Reels + embed on website. | 2 hrs | Working OpenClaw instance, #5 (logo for watermark) | No — requires real device recording and editing judgment | IG Reel format: 9:16 vertical, < 60 seconds |

---

## Execution Order

Optimal sequence considering dependencies and parallel work. Items that can run in parallel are grouped.

### Phase 0: No dependencies (start immediately, in parallel)

| Step | Item | Why first |
|---|---|---|
| 1 | #5 Logo | Blocks profile pics for #1, #2, #3, and OG image #11. Use AI generation for speed. |
| 2 | #7 Tally.so form | Zero dependencies, 20 min, unblocks website integration. |
| 3 | #2 Telegram handle | Zero dependencies, 10 min, quick win. |
| 4 | #1 WhatsApp number | Zero dependencies but requires physical SIM purchase. Do on next convenience store trip. |

### Phase 1: After logo is ready

| Step | Item | Why now |
|---|---|---|
| 5 | #3 Instagram account | Needs logo for profile pic. Can create account first, add pic when ready. |
| 6 | #11 OG image | Needs logo. Quick Canva job. |
| 7 | #12 Privacy diagram | No hard dependency, but good to batch with #11 since both are visual assets. |

### Phase 2: Requires working OpenClaw instance

| Step | Item | Why now |
|---|---|---|
| 8 | #6 Telegram chat screenshots | Needs real conversations. Spend 1 hour creating diverse demo chats. |
| 9 | #9 Memory recall screenshot | While you have the instance open, capture memory demo. |
| 10 | #10 Search result screenshot | While you have the instance open, capture search demo. |

### Phase 3: Final assembly and launch

| Step | Item | Why now |
|---|---|---|
| 11 | #4 Cloudflare Pages deploy | All assets ready. Do final Lovable build, then deploy. |
| 12 | #8 Beta user quotes | Start recruiting beta users at launch. Use placeholders initially. |

### Phase 4: Post-launch

| Step | Item | Why now |
|---|---|---|
| 13 | #14 Installation counter | Need real data first. |
| 14 | #16 Video demo | After system is stable and polished. |
| 15 | #15 LIHKG screenshots | After marketing posts go live. |
| 16 | #13 Multi-language | Only when expanding beyond Cantonese-speaking market. |

---

### Time Budget Summary

| Phase | Total Active Time | Calendar Time |
|---|---|---|
| Phase 0 (parallel) | ~1.5 hrs | 1 day |
| Phase 1 (visuals) | ~1.5 hrs | 1 day |
| Phase 2 (screenshots) | ~1.5 hrs | 1 day (needs working instance) |
| Phase 3 (deploy) | ~30 min | 1 day |
| **Total to launch** | **~5 hrs active work** | **~4 days** |
