# Lovable Build Strategy & Workflow

> How to use Lovable efficiently for the 蟹助手 website.

## Build Order

| Stage | Action | File to use |
|---|---|---|
| 0 | Paste Knowledge File into Lovable settings | `00-knowledge-file.md` |
| 1 | Build Pricing Page | `01-prompt-pricing.md` |
| 2 | Build Landing Page | `02-prompt-landing.md` |
| 3 | Build FAQ Page | `03-prompt-faq.md` |
| 4 | Build Contact Page | `04-prompt-contact.md` |
| 5 | Visual tweaks + polish | Use Visual Edit (free) |

## Key Rules

1. **One page per prompt** — never build multiple pages at once
2. **Use Plan Mode first** (60-70% of time) — say "Investigate but don't write code yet" before implementing
3. **Pin stable versions** — after each working page, pin it in version control
4. **Visual Edit for small tweaks** — colors, fonts, spacing, text = FREE (no credits)
5. **Max 2 fix attempts per error** — if still broken, revert to last stable version
6. **Draft prompts externally** — refine in Claude/ChatGPT first, paste final version into Lovable
7. **Add guardrails** — explicitly tell Lovable what NOT to modify when editing
8. **Repeat context** — AI doesn't remember earlier prompts; repeat important constraints

## Credit-Saving Tips

- Use Plan Mode to brainstorm before spending credits on implementation
- Batch small changes together into one prompt
- Use Visual Edit tool (free) for text, color, font, layout tweaks
- Debug outside Lovable (VSCode) — saves 50-70% credits
- Set a 2-attempt limit per error, then revert

## Post-Lovable Workflow

```
Lovable (~80%) → Download ZIP → Claude Code (~20%) → Cloudflare Pages

Claude Code tasks:
├── Fine-tune Chinese copy
├── Embed Tally.so form (if Lovable can't)
├── Add Cloudflare Pages config
├── Verify mobile responsive
└── Add OG meta tags
```

## Future Changes

```
Small changes (copy, prices, FAQ) → Claude Code directly → re-upload to CF Pages
Large changes (layout, new sections) → Back to Lovable → re-download → CC adjustments → upload
```
