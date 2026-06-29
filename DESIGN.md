# Design System & Anti-Vibe-Code Rules

## Font Direction
- **Body:** Geist (already loaded via next/font)
- **Headings:** Instrument Sans (loaded via next/font/google)
- **Monospace:** Geist Mono (already loaded)
- Explicitly banned: Inter, Roboto, system font stacks as primary

## Palette
- **Base:** Dark-dominant (#121317), Light (#fafafa)
- **Accent:** Electric blue (#3b82f6) — applied surgically (CTAs, links, active states)
- **Neutral:** OKLCH-based grays — use lightness shifts (3-5%) instead of borders
- **Semantic:** Emerald for success, amber for pending/warning, red for destructive
- **No purple gradients anywhere**

## Card Rule (priority order for separation)
1. Whitespace first
2. Background lightness shift (3-5%)
3. Soft shadow (`shadow-xs`)
4. Border only if all three above fail

## Forbidden List
- `rounded-2xl` — use `rounded-xl` maximum
- `shadow-lg` — use `shadow-xs` or `shadow-sm`
- Glassmorphism (`backdrop-blur`) as default card treatment
- 48px Lucide icons — max icon size is `size-5`
- Identical 3-card feature rows — use bento grid with varied weights
- Purple gradients on anything
- Emoji in UI (use lucide icons instead)
- Spinners for loading states — use skeleton/shimmer
- Carousels for testimonials — use static grids

## Motion & Animation
- Library: `motion` (formerly framer-motion)
- Animations serve exactly one purpose: feedback, continuity, or hierarchy
- Timing: hover 120ms, state change 200ms, page transitions 300ms, complex max 500ms
- Easing: ease-out for entrances, ease-in for exits, ease-in-out for state changes
- Only animate `transform` and `opacity` (GPU-composited)
- Respect `prefers-reduced-motion` via MotionConfig
- Max 2-3 active motions per screen

## Layout Constants
- 8px baseline grid (spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128)
- Line length: 45-75 characters for body text
- 24x24px minimum touch targets (WCAG 2.2 AA)
- Responsive breakpoints: sm 640, md 768, lg 1024, xl 1280

## Accessibility
- Focus rings: 2px, offset 2px, use `ring` color token
- All interactive elements keyboard accessible
- Color contrast: APCA Lc >= 75 for body, >= 45 for large text
- Alt text on all images
- Semantic HTML over div soup
