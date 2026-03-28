# Prompt F1: Rebrand NexGen, Structure & Removals

> This prompt rebrands the site, applies structural changes, removes sections, and updates layout.
> CSS variables in index.css are already correct — do NOT change them.
> Copy rewrites come in Prompt F2.

---

## 1. Rebranding — NexGen (SITE-WIDE)

Replace ALL instances of the old brand across every file:

| Find | Replace with |
|------|-------------|
| `蟹助手` | `NexGen` |
| `ClawHK` | `NexGen` |
| `clawhk` | `nexgen` |
| `🦀` emoji (everywhere) | Remove entirely, no replacement emoji |
| `clawhk.com` | `3nexgen.com` |
| `info@clawhk.com` | `info@3nexgen.com` |
| `t.me/clawhk` | `t.me/nexgenai` |

Do NOT add a Chinese name. `NexGen` is the brand everywhere, English only.

---

## 2. NexGen Logo (Navbar.tsx, Footer.tsx, Index.tsx)

Replace the `🦀` emoji with this SVG logo mark everywhere it appears.

Create a reusable `NexGenLogo` component:
```tsx
const NexGenLogo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="hsl(217 91% 60%)" />
    <path d="M8 22V10l6 12V10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 16.5l3-3.5 3 3.5M22 13v9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
```

### Navbar.tsx:
- Replace `<span className="text-2xl">🦀</span><span>蟹助手</span>` with `<NexGenLogo /> <span>NexGen</span>`
- Logo fill stays blue in all states; text changes color based on `overHero`

### Footer.tsx:
- Replace `<span className="text-2xl">🦀</span><span>蟹助手</span>` with `<NexGenLogo /> <span>NexGen</span>`

### Index.tsx (Telegram mockup header):
- Replace the `🦀` circle avatar and `蟹助手` name with `<NexGenLogo size={20} />` and `NexGen`

---

## 3. Hero Gradient (Index.tsx)

Change the hero section's inline `background` style:
```
OLD: linear-gradient(135deg, #E8D5C4 0%, #F5C6AA 30%, #E6A889 60%, #D4826A 100%)
NEW: linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #020617 100%)
```

---

## 4. Dark Section Backgrounds (SITE-WIDE)

Replace hardcoded brown-toned dark backgrounds with slate:

| Old | New |
|-----|-----|
| `bg-[#1A1215]` | `bg-[#0F172A]` |
| `bg-[#2A1A1D]` | `bg-[#0F172A]` |
| `text-[#FFFAF5]` (in Footer) | `text-white` |
| `text-[#FFFAF5]/70` | `text-white/70` |
| `text-[#FFFAF5]/40` | `text-white/40` |
| `text-[#FFFAF5]/10` | `text-white/10` |
| `border-[#FFFAF5]/10` | `border-white/10` |
| `bg-[#FFFAF5]/10` | `bg-white/10` |
| `hsl(25 30% 93%)` (section-alt backgrounds) | `hsl(210 15% 95%)` |

---

## 5. Remove FOMO Strip (Index.tsx)

Delete the entire Section 2 (`bg-[#1A1215]`) containing:
```
2026 年，AI 智能體正在取代傳統聊天機器人及大量傳統文書工作。
全球已有超過 200 萬人每週使用開源 AI 智能體。
你還在用受限的 ChatGPT 嗎？
```
Remove completely — no empty container.

---

## 6. Remove Repositioning Bridge (Index.tsx)

Delete the entire Section 3 containing:
```
這不是普通聊天機器人 — 是真正幫你做事的 AI 智能體。
搜尋資料、整理日程、處理文件...
```
Remove completely.

---

## 7. Remove Qualifier Section (Index.tsx)

Delete the entire `適合你嗎？` section with its 4 qualifier items (`qualifiers` data array and all rendering). Remove completely.

---

## 8. Remove WireGuard Entirely (SITE-WIDE)

**Index.tsx** — Remove from `techStackCards`:
```
Remove: { name: "WireGuard", desc: "軍事級 VPN 隧道" }
```

**Technology.tsx** — Remove the entire WireGuard entry from `techSections`:
```
Remove the object with name: "WireGuard", headline: "軍事級 VPN 隧道 — 永不中斷"
```

---

## 9. Remove All Instagram (SITE-WIDE)

- **Contact.tsx**: If Instagram contact card exists, remove it. Keep only WhatsApp + Telegram.
- **Footer.tsx**: Remove any Instagram icon/link.
- **Navbar.tsx**: Remove any Instagram reference.
- Remove any `INSTAGRAM_URL` constant.

---

## 10. Remove Business Hours (Contact.tsx)

Delete any line like: `服務時間：每日 10:00-22:00（包括週末及公眾假期）`

---

## 11. Remove ALL HK Elements — Global Positioning (SITE-WIDE)

### Footer.tsx:
- Remove payment badges `FPS 轉數快` and `PayMe`
- Replace with: `PayPal` · `Bank Transfer` · `Crypto`
- Change `香港 AI 助手安裝服務` → `Your AI, fully loaded.`
- Remove `擁有你自己的私人 AI 系統` (redundant)

### Index.tsx:
- Trust bar: `香港支援` → `真人支援`
- Before/After table: `中文真人 + AI 支援` → `真人團隊 + AI 支援`
- Before/After table header: `找蟹助手` → `找 NexGen`

### FAQ.tsx:
- Payment answer: `FPS 轉數快、PayMe、銀行轉帳和 PayPal（海外客戶）` → `PayPal、銀行轉帳及加密貨幣`
- Remove: `信用卡自動扣款功能即將推出。`
- Device answer: `支援 Raspberry Pi 5、任何 Linux VPS（如 DigitalOcean、Vultr）` → `支援 Raspberry Pi 5 及任何 Linux VPS`

---

## 12. Simplify Pricing Page (Pricing.tsx)

Remove these sections if they exist:
- ChatGPT comparison table
- Monthly fee explanation box
- Add-ons table
- Payment methods section
- Daily cost reframe line

Keep: promo banner, heading + toggle, 3 tier cards, bottom CTA.

---

## 13. Integration Logo Strip (Index.tsx)

If an integration logo section exists:
- **Keep:** WhatsApp, Telegram
- **Discord:** Keep but add `<span className="text-[10px] text-muted-foreground/60">即將推出</span>` below
- **Slack:** Remove entirely

---

## 14. Navbar Scroll Behavior (Navbar.tsx)

Verify `overHero` transparent logic works with the new dark slate hero gradient:
- Over hero: `bg-transparent` with white text
- Scrolled / other pages: solid `bg-background` with normal text

---

## 15. Stat Strip Fix (Index.tsx)

The `Top 50` stat should display as `Top 50` with label `GitHub Global`. Verify it renders correctly (not concatenated as "Top 50Top GitHub Global").

---

## 16. Section Order After Removals (Index.tsx)

After removing FOMO, repositioning bridge, and qualifier, ensure this order:

```
1. Hero (dark slate gradient + Telegram mockup + plugin cards)
2. Credibility Stats + Plugin Ecosystem + Tech Stack Cards
3. Use Cases
4. Before/After Comparison
5. How It Works (dark section)
6. Our Story
7. Trust Bar + Final CTA
```

---

## Summary

| # | Change | Scope |
|---|--------|-------|
| 1 | Rebrand to NexGen | Site-wide |
| 2 | NexGen SVG logo | Navbar, Footer, Index mockup |
| 3 | Hero gradient → dark slate | Index.tsx |
| 4 | Dark sections → slate | Site-wide |
| 5 | Remove FOMO strip | Index.tsx |
| 6 | Remove repositioning bridge | Index.tsx |
| 7 | Remove qualifier section | Index.tsx |
| 8 | Remove WireGuard entirely | Index.tsx, Technology.tsx |
| 9 | Remove Instagram | Site-wide |
| 10 | Remove business hours | Contact.tsx |
| 11 | Remove HK elements, go global | Site-wide |
| 12 | Simplify pricing | Pricing.tsx |
| 13 | Integration logos | Index.tsx |
| 14 | Navbar scroll fix | Navbar.tsx |
| 15 | Stat strip fix | Index.tsx |
| 16 | Section reorder | Index.tsx |
