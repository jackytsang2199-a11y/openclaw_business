<claude-mem-context>

</claude-mem-context>

# Website — CLAUDE.md

ClawHK / 3NexGen website built with Lovable (React + Vite + Tailwind CSS + shadcn/ui).

## Current State
- 14 design iterations completed (01-13 series with E/F variants)
- Design direction settled: Contabo-inspired dark mode, crab theme, professional aesthetic
- Copy voice finalized in `13-prompt-F2-copy-rewrite.md`
- Source code in `src/` — GitHub: `jackytsang2199-a11y/Openclaw_website`
- **Not yet deployed** — needs final Lovable build then Cloudflare Pages deploy

## Workflow
1. Paste `00-knowledge-file.md` into Lovable Knowledge File setting
2. Use latest prompts (08-13 series) — NOT the archived 01-04 prompts
3. Follow `05-build-strategy.md` for Lovable workflow best practices
4. After Lovable: deploy to Cloudflare Pages (domain: `3nexgen.com`)

## Key Files
| File | Purpose |
|------|---------|
| `00-knowledge-file.md` | Brand identity, design system, pricing, copy guidelines (paste into Lovable) |
| `05-build-strategy.md` | Lovable workflow guide + credit-saving tips |
| `06-missing-checklist.md` | Pre-launch checklist |
| `08-13-prompt-*.md` | Current design iterations (use these) |
| `13-prompt-F2-copy-rewrite.md` | **Latest copy** |
| `lovable-changes.md` / `lovable-changes_v2.md` | Consolidated change logs |
| `archive/` | Outdated v1 prompts (01-04) — reference only |

## Language Rules
- All customer-facing copy: 香港書面語 (formal written Chinese)
- No Cantonese slang (嘅、咩、唔、佢)
- English for tech terms (OpenClaw, AI, API, Telegram)
- No emoji for tier names — use: 基本版 Starter, 專業版 Pro, 旗艦版 Elite

## Design System
- Dark mode base with crab-orange accent
- WCAG AA contrast compliance
- Mobile-first responsive
- Components: shadcn/ui primitives
