# AlpVision — TRT Russian Visual Studio

## Project
Single-page app (index.html + Netlify serverless functions) that generates editorial cover designs for TRT Russian digital content. Deployed at alpvision.netlify.app.

## Stack
- Frontend: Vanilla HTML/CSS/JS (single index.html, ~3300 lines)
- Backend: Netlify Functions (Node.js) — analyze-fast, analyze-deep, editorial-director, generate-bg, search-photo, vision-qc, etc.
- AI: GPT-4o (editorial analysis), DALL-E/gpt-image-1 (image generation), Pexels API (stock photos)
- Export: html2canvas for multi-platform export (Instagram, Twitter, Telegram, YouTube, Facebook, Web)

## Design Skills (loaded from ../.claude/skills/)

### Layer 1: frontend-design
Core design judgment. Enforces anti-slop discipline, brand-grounded direction, category-aware choices. Always start here.
- Refuse: Inter-for-everything, reflex gradients, card-in-card, pure black/white
- Workflow: Ground in brand → State direction → Category check → Build → Verify → Ship

### Layer 2: impeccable
23 commands for production-grade frontend design. Key commands for AlpVision:
- `/impeccable craft` — shape then build a feature end-to-end
- `/impeccable typeset` — improve typography hierarchy
- `/impeccable colorize` — add strategic color
- `/impeccable bolder` — amplify safe/bland designs
- `/impeccable audit` — technical quality checks
- `/impeccable polish` — final quality pass

### Layer 3: design-motion-principles
Motion design from Emil Kowalski + Jakub Krehel + Jhey Tompkins. For AlpVision:
- Context: Media/news tool → Primary: Jakub (polish), Secondary: Emil (speed), Selective: Jhey (empty states)
- Frequency gate: template carousel = frequent → no animation; export = rare → delightful

## Design Direction (TRT Russian editorial covers)
- **Color strategy**: Committed — TRT palette carries 30-60% of surface
- **Type stance**: Editorial — Oswald display + Manrope body + Georgia for serif variants
- **Density**: 4/10 — editorial breathing room
- **Motion**: 2/10 — functional only
- **Variance**: 7/10 — each template must feel genuinely different

## Editorial Cover Philosophy
The goal is The Economist-level covers: each carries a MESSAGE, not just a headline over a photo.
- Every cover must have a visual argument/metaphor
- 30 genuinely different design approaches per article
- Templates must vary in structure, not just color
- Covers should provoke discussion — other media should talk about them
