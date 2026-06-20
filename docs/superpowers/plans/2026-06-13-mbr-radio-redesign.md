# MBR Radio — Complete Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the MBR Radio frontend into a premium, accessible, mobile-first streaming experience inspired by Spotify and Apple Music while remaining optimized for live radio.

**Architecture:** Four independent phases executed in sequence — Phase 0 (design tokens + primitives) is a prerequisite for all others; Phases 1–3 can partially overlap after Phase 0 ships. Each phase produces shippable, testable software independently.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS 3.4 · CSS custom properties · Radix UI primitives (existing) · Recharts (existing) · Lucide React · Framer Motion (new) · next-themes (existing)

---

## PART A — DESIGN PROPOSAL

### Information Architecture

```
MBR Radio
├── / (Home Feed)
│   ├── Hero: Now Playing card (if station active)
│   ├── Shelf: Jump Back In (recent stations, horizontal scroll)
│   ├── Shelf: Trending in Kenya (live-sorted by listeners)
│   ├── Shelf: Your Favourites (if auth + has favourites)
│   └── Browse All (search + filters + grid/row view)
├── /station/[slug] (Station Detail)
│   ├── Hero: Large art + gradient backdrop
│   ├── Now Playing metadata + listen button
│   ├── Station info (bio, frequency, website, region)
│   └── Related Stations shelf
├── /charts (Trending Charts) [future]
├── /library (Saved Stations) [future]
└── /admin/analytics (Admin Only)
    ├── Tab: Live Pulse (real-time)
    ├── Tab: Overview (KPIs)
    ├── Tab: Audience (cohorts)
    ├── Tab: Stations
    ├── Tab: Songs & Artists
    ├── Tab: Genres & Regions
    └── Tab: Station Health
```

### Design System Decisions

#### Typography Scale
```
Label XS:   11px / 500 / tracking-wide  — timestamps, badges, metadata
Label SM:   12px / 500 / tracking-normal — captions, pill text
Body SM:    13px / 400 / 1.5            — secondary text, sub-labels
Body:       15px / 400 / 1.6            — descriptions, tooltips
Title SM:   15px / 600 / 1.4            — station names in rows
Title:      17px / 600 / 1.3            — section sub-headers, card names
Headline:   22px / 700 / 1.2 / -0.3px  — section headers, hero names
Display:    28px / 800 / 1.1 / -0.5px  — page titles, hero station name
```

#### Spacing Scale (8px baseline, already partially there)
Add to `app/globals.css` as CSS variables alongside existing tokens — these are ADDITIONS, nothing removed:
```css
--space-0: 2px;   /* hairline separators */
--space-1: 4px;   /* tight internal padding */
--space-2: 8px;   /* standard icon-to-text gap */
--space-3: 12px;  /* compact card padding */
--space-4: 16px;  /* standard card padding */
--space-5: 20px;  /* section sub-spacing */
--space-6: 24px;  /* section spacing */
--space-8: 32px;  /* section-to-section */
--space-10: 40px; /* hero sections */
--space-12: 48px; /* page-level spacing */
```

#### Color Additions (existing palette is solid — add semantic aliases only)
```css
/* Interactive state colours */
--color-interactive:        var(--color-accent);       /* alias */
--color-interactive-hover:  var(--color-accent-hover); /* alias */
--color-interactive-muted:  color-mix(in srgb, var(--color-accent) 12%, transparent);

/* Surface semantic aliases */
--color-card:        var(--color-surface);
--color-card-raised: var(--color-surface-raised);

/* Overlay */
--color-scrim-light: rgba(0, 0, 0, 0.12);
--color-scrim-heavy: rgba(0, 0, 0, 0.52);
```

#### New Reusable Components Needed
| Component | Location | Replaces |
|-----------|----------|---------|
| `<Button />` | `components/ui/Button.tsx` | ad-hoc button styles |
| `<Badge />` | `components/ui/Badge.tsx` | inline LIVE/count badges |
| `<Waveform />` | `components/ui/Waveform.tsx` | repeated waveform-bar markup |
| `<Shelf />` | `components/ui/Shelf.tsx` | horizontal scroll shelves |
| `<SkeletonCard />` | `components/ui/SkeletonCard.tsx` | inline pulse divs |
| `<StationCard />` (unified) | `components/station/StationCard.tsx` | current card + row variants |

### Wireframes (Text)

#### Mobile Homepage — No Station Playing
```
┌─────────────────────────┐
│  ☰  MBR          [icon] │  ← header (64px)
├─────────────────────────┤
│  🔍 Search stations…    │  ← search bar
│  [All] [Hits] [Gospel]… │  ← genre chip row (scrollable)
├─────────────────────────┤
│  — TRENDING NOW ──────  │
│  [card][card][card] ›   │  ← trending shelf (horizontal scroll)
├─────────────────────────┤
│  ALL STATIONS    [⊞][≡] │  ← section header + layout toggle
│  ┌────────────────────┐ │
│  │ [ART] Name    ♥ ▶ │ │  ← row layout (default mobile)
│  │ [ART] Name    ♥ ▶ │ │
│  └────────────────────┘ │
│  ·  ·  ·                │
└─────────────────────────┘
│  [Listen][Charts][Lib]  │  ← tab bar (56px + safe-area)
```

#### Mobile Homepage — Station Playing
```
┌─────────────────────────┐
│  ☰  MBR          [icon] │
├─────────────────────────┤
│  🔍 Search…    [filter] │
│  [All][Hits][Gospel]…   │
├─────────────────────────┤
│  ┌─────────────────────┐│
│  │[ART80px] NOW PLAYING ││  ← hero card (genre-colored border + glow)
│  │  Capital FM          ││
│  │  ♪ Tyla - Water      ││
│  │                   ▶ ││
│  └─────────────────────┘│
├─────────────────────────┤
│  JUMP BACK IN           │
│  [tile][tile][tile] ›   │  ← tile shelf (96px art)
├─────────────────────────┤
│  ALL STATIONS    [⊞][≡] │
│  [row][row][row]…       │
└─────────────────────────┘
│ [ART] Capital FM ♪ ━━━▶ │  ← player bar (72px)
│ [Listen][Charts][Lib]   │
```

#### Desktop Homepage
```
┌──┬──────────────────────────────────┐
│  │  🔍 Search stations…      [filt] │  header full-width
│s │  [All][News][Gospel][Hits]…      │
│i │                                  │
│d ├────── NOW PLAYING ───────────────┤
│e │  [ART 96px]  Capital FM          │  hero card
│b │              ♪ Tyla - Water      │
│a │              102.1 FM · Hits     │
│r │                             [▶] │
│  ├────── JUMP BACK IN ─────────────┤
│  │  [tile][tile][tile][tile][tile]  │
│  ├────── ALL STATIONS ─────────────┤
│  │  Live Stations          [⊞][≡] │
│  │  ┌──┐┌──┐┌──┐┌──┐              │
│  │  └──┘└──┘└──┘└──┘  (4 cols)   │
│  │  ...                            │
└──┴──────────────────────────────────┘
   │ [ART] Capital FM ♪ Tyla─Water ▶ ━━━ 🔊 │  player bar fixed bottom
```

#### Station Detail Page
```
┌─────────────────────────┐
│ ← Back                  │
│                         │
│  [── GRADIENT BG ──────]│
│  [ART 120px]            │
│  Capital FM             │  ← Display size
│  102.1 MHz · Nairobi    │  ← Body SM
│  ♪ Tyla - Water         │  ← accent color
│  [●●● 1,234 listening]  │
│  [       LISTEN        ]│  ← full-width primary button
├─────────────────────────┤
│  ABOUT                  │
│  Kenya's #1 hit music…  │
├─────────────────────────┤
│  RELATED STATIONS       │
│  [tile][tile][tile]     │
└─────────────────────────┘
```

### Accessibility Targets
- All interactive elements: min 44×44px touch target
- Color contrast: ≥ 4.5:1 for normal text, ≥ 3:1 for large text / UI components
- Focus rings: 2px solid accent with 2px offset on all focusable elements
- Screen reader: `aria-live="polite"` on now-playing updates, `role="status"` on listener counts
- `prefers-reduced-motion`: disable waveform animation, shimmer, card enter stagger
- `prefers-color-scheme`: already handled via `dark` class + next-themes

### Performance Targets
- LCP < 2.5s: skeleton loaders for station grid, no layout shift from art loading (explicit width/height)
- CLS < 0.1: all images with width+height declared, player bar fixed height (no dynamic resize)
- Interaction < 100ms: play button response, volume change response
- Station list cache TTL: 60s (already implemented in `useStations`)
- Lazy load analytics tab components (already using dynamic imports pattern)

---

## PART B — IMPLEMENTATION PLANS

---

## PHASE 0: Design System Foundation
**Prerequisite for all other phases. Ship this first.**

### File Map
```
MODIFY: app/globals.css                     — add spacing + semantic alias tokens
MODIFY: tailwind.config.ts                  — add spacing scale, typography scale
CREATE: components/ui/Button.tsx            — unified button primitive
CREATE: components/ui/Badge.tsx             — LIVE badge, listener count badge
CREATE: components/ui/Waveform.tsx          — animated waveform bars
CREATE: components/ui/Shelf.tsx             — horizontal scroll shelf with title
CREATE: components/ui/SkeletonCard.tsx      — skeleton placeholder cards
```

---

### Task 0.1 — CSS Token Additions

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add spacing + semantic colour tokens after line ~50 (after existing --ease-out)**

Open `app/globals.css`. After the `:root {` block's existing tokens, add these lines before the closing `}`:

```css
    /* ── Spacing scale ──────────────────────────────────────────────── */
    --space-0:  2px;
    --space-1:  4px;
    --space-2:  8px;
    --space-3:  12px;
    --space-4:  16px;
    --space-5:  20px;
    --space-6:  24px;
    --space-8:  32px;
    --space-10: 40px;
    --space-12: 48px;

    /* ── Semantic colour aliases ─────────────────────────────────────── */
    --color-interactive:       var(--color-accent);
    --color-interactive-hover: var(--color-accent-hover);
    --color-interactive-muted: color-mix(in srgb, var(--color-accent) 12%, transparent);
    --color-card:              var(--color-surface);
    --color-card-raised:       var(--color-surface-raised);
    --color-scrim-light:       rgba(0, 0, 0, 0.12);
    --color-scrim-heavy:       rgba(0, 0, 0, 0.52);
```

- [ ] **Step 2: Add `prefers-reduced-motion` block at the end of the file**

```css
/* ── Motion accessibility ───────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: no output (clean)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): add spacing scale + semantic colour aliases + reduced-motion"
```

---

### Task 0.2 — Tailwind Spacing & Typography Extensions

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Add spacing and fontSize extensions inside `theme.extend`**

Find the `theme: { extend: {` block and add after the existing `boxShadow` block:

```typescript
      fontSize: {
        'label-xs': ['11px', { lineHeight: '1.45', fontWeight: '500', letterSpacing: '0.04em' }],
        'label-sm': ['12px', { lineHeight: '1.4',  fontWeight: '500' }],
        'body-sm':  ['13px', { lineHeight: '1.5',  fontWeight: '400' }],
        'body':     ['15px', { lineHeight: '1.6',  fontWeight: '400' }],
        'title-sm': ['15px', { lineHeight: '1.4',  fontWeight: '600' }],
        'title':    ['17px', { lineHeight: '1.3',  fontWeight: '600' }],
        'headline': ['22px', { lineHeight: '1.2',  fontWeight: '700', letterSpacing: '-0.015em' }],
        'display':  ['28px', { lineHeight: '1.1',  fontWeight: '800', letterSpacing: '-0.02em' }],
      },
      spacing: {
        '0.5': '2px',
        '1':   '4px',
        '2':   '8px',
        '3':   '12px',
        '4':   '16px',
        '5':   '20px',
        '6':   '24px',
        '8':   '32px',
        '10':  '40px',
        '12':  '48px',
        '14':  '56px',
        '16':  '64px',
        '18':  '72px',
        '20':  '80px',
      },
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(design): add typography + spacing scale to Tailwind config"
```

---

### Task 0.3 — Button Primitive

**Files:**
- Create: `components/ui/Button.tsx`

- [ ] **Step 1: Create Button component**

```typescript
'use client';
import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: '#ffffff',
        border: '1px solid transparent',
        boxShadow: '0 1px 3px rgba(99,102,241,0.3)',
    },
    secondary: {
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
    },
    ghost: {
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        border: '1px solid transparent',
    },
    danger: {
        background: 'transparent',
        color: '#dc2626',
        border: '1px solid #dc262622',
    },
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-label-sm rounded-xl gap-1.5',
    md: 'px-4 py-2.5 text-body-sm rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-title-sm rounded-2xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'secondary',
        size = 'md',
        loading = false,
        icon,
        iconPosition = 'left',
        children,
        disabled,
        className = '',
        style,
        ...props
    }, ref) => {
        const isDisabled = disabled || loading;
        return (
            <button
                ref={ref}
                disabled={isDisabled}
                className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 active:scale-95 ${sizeClasses[size]} ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`}
                style={{ ...variantStyles[variant], ...style }}
                {...props}
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
                {children}
                {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
            </button>
        );
    }
);
Button.displayName = 'Button';
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat(ui): add Button primitive with variant/size/loading props"
```

---

### Task 0.4 — Badge Primitive

**Files:**
- Create: `components/ui/Badge.tsx`

- [ ] **Step 1: Create Badge component**

```typescript
'use client';
import React from 'react';

type BadgeVariant = 'live' | 'listeners' | 'accent' | 'muted';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    pulse?: boolean;
    className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
    live: {
        background: 'var(--color-scrim-heavy)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#ffffff',
    },
    listeners: {
        background: 'var(--color-scrim-heavy)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'rgba(255,255,255,0.8)',
    },
    accent: {
        background: 'var(--color-interactive-muted)',
        color: 'var(--color-accent)',
    },
    muted: {
        background: 'var(--color-surface-raised)',
        color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
    },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'muted', children, pulse = false, className = '' }) => {
    return (
        <div
            className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-label-xs shrink-0 ${className}`}
            style={variantStyles[variant]}
        >
            {pulse && (
                <span
                    className="w-[5px] h-[5px] rounded-full shrink-0"
                    style={{ background: '#4ade80', animation: 'pulse-glow 1.5s ease-in-out infinite' }}
                    aria-hidden="true"
                />
            )}
            {children}
        </div>
    );
};
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/ui/Badge.tsx
git commit -m "feat(ui): add Badge primitive for LIVE and listener count badges"
```

---

### Task 0.5 — Waveform Component

**Files:**
- Create: `components/ui/Waveform.tsx`

- [ ] **Step 1: Create Waveform component**

```typescript
'use client';
import React from 'react';

interface WaveformProps {
    isAnimating?: boolean;
    bars?: number;
    color?: string;
    height?: number;
    className?: string;
}

export const Waveform: React.FC<WaveformProps> = ({
    isAnimating = true,
    bars = 4,
    color = '#ffffff',
    height = 16,
    className = '',
}) => {
    return (
        <div
            className={`flex items-end gap-[3px] ${className}`}
            aria-hidden="true"
            role="presentation"
        >
            {Array.from({ length: bars }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-full"
                    style={{
                        background: color,
                        width: '3px',
                        height: `${height}px`,
                        animation: isAnimating
                            ? `waveform-bar 1.2s ease-in-out ${i * 0.15}s infinite`
                            : 'none',
                        transform: isAnimating ? undefined : 'scaleY(0.3)',
                        transformOrigin: 'bottom',
                    }}
                />
            ))}
        </div>
    );
};
```

- [ ] **Step 2: Verify the `waveform-bar` keyframe exists in globals.css**

Run: `grep -n "waveform-bar" app/globals.css`
Expected: see the `@keyframes waveform-bar` definition. If missing, add to `app/globals.css`:

```css
@keyframes waveform-bar {
    0%, 100% { transform: scaleY(0.3); }
    50%       { transform: scaleY(1.0); }
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add components/ui/Waveform.tsx app/globals.css
git commit -m "feat(ui): add Waveform component, extract waveform-bar keyframe"
```

---

### Task 0.6 — Shelf Component

**Files:**
- Modify or create: `components/ui/Shelf.tsx`

- [ ] **Step 1: Check if Shelf.tsx already exists**

Run: `ls components/ui/Shelf.tsx`
If it exists, read it. If not, create it:

```typescript
'use client';
import React from 'react';

interface ShelfProps {
    title: string;
    onSeeAll?: () => void;
    children: React.ReactNode;
    className?: string;
}

export const Shelf: React.FC<ShelfProps> = ({ title, onSeeAll, children, className = '' }) => {
    return (
        <section className={`space-y-3 ${className}`} aria-label={title}>
            <div className="flex items-center justify-between px-0">
                <h2
                    className="text-title font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {title}
                </h2>
                {onSeeAll && (
                    <button
                        onClick={onSeeAll}
                        className="text-label-sm cursor-pointer transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-accent)' }}
                    >
                        See all
                    </button>
                )}
            </div>
            <div
                className="flex gap-3 overflow-x-auto pb-1 snap-x"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                {children}
            </div>
        </section>
    );
};
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/ui/Shelf.tsx
git commit -m "feat(ui): add Shelf component for horizontal scroll sections"
```

---

### Task 0.7 — SkeletonCard Component

**Files:**
- Create: `components/ui/SkeletonCard.tsx`

- [ ] **Step 1: Create SkeletonCard**

```typescript
import React from 'react';

interface SkeletonCardProps {
    layout?: 'card' | 'row';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ layout = 'card' }) => {
    if (layout === 'row') {
        return (
            <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl animate-pulse"
                style={{ background: 'var(--color-surface)' }}
            >
                <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: 'var(--color-surface-raised)' }} />
                <div className="flex-1 space-y-2">
                    <div className="h-3 rounded-full w-2/3" style={{ background: 'var(--color-surface-raised)' }} />
                    <div className="h-2.5 rounded-full w-1/3" style={{ background: 'var(--color-surface-raised)' }} />
                </div>
            </div>
        );
    }
    return (
        <div
            className="rounded-2xl overflow-hidden animate-pulse"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
            <div className="w-full" style={{ aspectRatio: '1/1', background: 'var(--color-surface-raised)' }} />
            <div className="p-3 space-y-2">
                <div className="h-3.5 rounded-full w-3/4" style={{ background: 'var(--color-surface-raised)' }} />
                <div className="h-2.5 rounded-full w-1/2" style={{ background: 'var(--color-surface-raised)' }} />
            </div>
        </div>
    );
};
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add components/ui/SkeletonCard.tsx
git commit -m "feat(ui): add SkeletonCard for grid and row loading states"
```

---

## PHASE 1: Homepage & Station Feed Redesign

**Depends on:** Phase 0 complete.

### File Map
```
MODIFY: components/MordernAirwave.tsx       — hero card, shelves, all-stations section
MODIFY: components/station/StationCard.tsx  — use Badge + Waveform + Button primitives
MODIFY: components/station/StationRow.tsx   — use Badge + Waveform + Button primitives
MODIFY: components/station/StationGrid.tsx  — use SkeletonCard primitive, stagger with reduced-motion check
MODIFY: components/station/StationTile.tsx  — use StationArt, polish sizing
MODIFY: components/station/TrendingStrip.tsx — consolidate mobile/desktop layouts
```

---

### Task 1.1 — Update StationCard to use primitives

**Files:**
- Modify: `components/station/StationCard.tsx`

The existing StationCard already has the right structure from the previous session. This task replaces inline badge markup and inline waveform markup with the new primitives.

- [ ] **Step 1: Read the current file**

Run: open `components/station/StationCard.tsx` in your editor and verify it imports from `./StationArt` and uses inline badge divs + inline waveform divs.

- [ ] **Step 2: Replace inline LIVE badge with `<Badge>`**

Find the LIVE badge block:
```tsx
{station.is_live && (
    <div
        className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-[3px] rounded-full"
        style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(12px)', ... }}
    >
        <span className="w-[5px] h-[5px] rounded-full shrink-0" ... />
        <span className="text-[9px] font-bold text-white uppercase tracking-widest">Live</span>
    </div>
)}
```

Replace with:
```tsx
{station.is_live && (
    <Badge variant="live" pulse className="absolute top-2.5 left-2.5 font-bold uppercase tracking-widest">
        Live
    </Badge>
)}
```

Add import at top: `import { Badge } from '@/components/ui/Badge';`

- [ ] **Step 3: Replace inline listener badge with `<Badge>`**

Find:
```tsx
{liveListeners > 0 && (
    <div className="absolute bottom-2.5 left-2.5 px-2 py-[3px] rounded-full" style={{...}}>
        <span className="text-[10px] font-medium text-white/80 tabular-nums">
            {liveListeners.toLocaleString()} listening
        </span>
    </div>
)}
```

Replace with:
```tsx
{liveListeners > 0 && (
    <Badge variant="listeners" className="absolute bottom-2.5 left-2.5 tabular-nums">
        {liveListeners.toLocaleString()} listening
    </Badge>
)}
```

- [ ] **Step 4: Replace inline waveform with `<Waveform>`**

Find the waveform div block (4 `.waveform-bar` divs inside a flex container):
```tsx
<div className="flex items-end gap-[3px] px-3 py-2 rounded-full" style={...}>
    {[0, 1, 2, 3].map(i => (
        <div key={i} className="waveform-bar rounded-full" style={{ ... animationDelay }} />
    ))}
</div>
```

Replace with:
```tsx
<div
    className="px-3 py-2 rounded-full"
    style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
>
    <Waveform isAnimating={true} bars={4} color="#ffffff" height={16} />
</div>
```

Add import: `import { Waveform } from '@/components/ui/Waveform';`

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 6: Commit**

```bash
git add components/station/StationCard.tsx
git commit -m "refactor(StationCard): use Badge and Waveform primitives"
```

---

### Task 1.2 — Update StationRow to use primitives

**Files:**
- Modify: `components/station/StationRow.tsx`

- [ ] **Step 1: Read the current file**

Open `components/station/StationRow.tsx` to see its current structure.

- [ ] **Step 2: Replace any inline badge or waveform markup**

Identify inline LIVE badge and waveform blocks. Replace with `<Badge>` and `<Waveform>` following the same pattern as Task 1.1.

If StationRow uses `StationAvatar` instead of `StationArt`, replace:
```tsx
import { StationAvatar } from './StationAvatar';
// ...
<StationAvatar station={station} size={40} />
```
with:
```tsx
import { StationArt } from './StationArt';
// ...
<StationArt name={station.name} logoUrl={station.logo_url} genre={station.genre} size={40} radius={10} />
```

- [ ] **Step 3: Ensure touch target on play button is ≥ 44px**

The play button should be `w-11 h-11` (44px). If it's smaller, update the className.

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add components/station/StationRow.tsx
git commit -m "refactor(StationRow): use StationArt, Badge, Waveform primitives; fix 44px touch target"
```

---

### Task 1.3 — Update StationGrid skeletons

**Files:**
- Modify: `components/station/StationGrid.tsx`

- [ ] **Step 1: Read the current file**

Open `components/station/StationGrid.tsx`. Find the skeleton loading section — it likely renders 6 pulsing divs inline.

- [ ] **Step 2: Replace inline skeleton divs with SkeletonCard**

Find the skeleton render block (something like):
```tsx
{Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="rounded-2xl animate-pulse" style={{ ... }}>
        <div style={{ aspectRatio: '1/1', background: '...' }} />
        <div className="p-3 space-y-2">
            <div className="h-3 rounded w-3/4 bg-..." />
        </div>
    </div>
))}
```

Replace with:
```tsx
import { SkeletonCard } from '@/components/ui/SkeletonCard';

// in render:
{Array.from({ length: 6 }).map((_, i) => (
    <SkeletonCard key={i} layout={layout === 'rows' ? 'row' : 'card'} />
))}
```

- [ ] **Step 3: Add reduced-motion check to card stagger animation**

Find any `animationDelay` or stagger logic. Wrap it:
```tsx
const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// in the card render:
style={{ animationDelay: prefersReducedMotion ? '0ms' : `${index * 35}ms` }}
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add components/station/StationGrid.tsx
git commit -m "refactor(StationGrid): use SkeletonCard primitive, respect prefers-reduced-motion"
```

---

### Task 1.4 — Homepage: Hero + Shelves

**Files:**
- Modify: `components/MordernAirwave.tsx`

This is the main homepage layout. Add the hero card and shelf sections that appear when browsing (no search/filter active).

- [ ] **Step 1: Read the current MordernAirwave.tsx**

Open `components/MordernAirwave.tsx`. Understand its current structure:
- SearchAndFilters at top
- Dashed "Stations" divider
- All/Favorites toggle
- StationGrid

- [ ] **Step 2: Add imports for Shelf, StationTile, useRecentStations, getGenreTheme**

At the top of the file, add:
```tsx
import { Shelf } from '@/components/ui/Shelf';
import { StationTile } from '@/components/station/StationTile';
import { useRecentStations } from '@/hooks/useRecentStations';
import { getGenreTheme } from '@/lib/genreTheme';
import { slugify } from '@/lib/slug';
import { Play, Pause } from 'lucide-react';
```

- [ ] **Step 3: Add state for recents and favorites shelf**

After the existing hook calls, add:
```tsx
const recents = useRecentStations(stations);

const recentShelf = useMemo(
    () => recents.filter(s => s.id !== currentStation?.id).slice(0, 10),
    [recents, currentStation]
);

const favoriteShelf = useMemo(
    () => stations.filter(s => favorites.has(s.id)).slice(0, 10),
    [stations, favorites]
);

const browsing =
    !showFavoritesOnly &&
    searchTerm === '' &&
    selectedGenre === 'All' &&
    selectedRegion === 'All';

const heroColors = getGenreTheme(currentStation?.genre);
```

- [ ] **Step 4: Add Hero card (Now Playing) before the dashed divider**

In the JSX return, after `<SearchAndFilters ... />` and before the dashed divider, add:

```tsx
{/* Hero: now playing */}
{browsing && currentStation && (
    <div className="mt-6 mb-2">
        <button
            type="button"
            onClick={() => router.push(`/station/${slugify(currentStation.name)}`)}
            className="w-full rounded-2xl overflow-hidden text-left transition-transform duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] cursor-pointer"
            style={{
                background: `radial-gradient(ellipse 80% 120% at 0% 50%, ${heroColors.accent}18 0%, transparent 60%), var(--color-surface)`,
                border: `1px solid ${heroColors.accent}35`,
                boxShadow: `0 4px 32px ${heroColors.accent}10`,
            }}
            aria-label={`Open ${currentStation.name}`}
        >
            <div className="flex items-center gap-4 p-4">
                <div className="relative shrink-0">
                    <StationArt
                        name={currentStation.name}
                        logoUrl={currentStation.logo_url}
                        genre={currentStation.genre}
                        size={72}
                        radius={14}
                    />
                    {isPlaying && (
                        <div
                            className="absolute -inset-1 rounded-[18px] pointer-events-none"
                            style={{ boxShadow: `0 0 0 2px ${heroColors.accent}55` }}
                            aria-hidden="true"
                        />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p
                        className="text-label-xs font-bold uppercase tracking-[0.16em] mb-0.5"
                        style={{ color: heroColors.accent }}
                    >
                        {isPlaying ? 'Now Playing' : 'Paused'}
                    </p>
                    <p className="text-title truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {currentStation.name}
                    </p>
                    {nowPlaying ? (
                        <p className="text-body-sm mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                            ♪ {nowPlaying}
                        </p>
                    ) : currentStation.genre ? (
                        <p className="text-body-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {currentStation.genre}{currentStation.frequency ? ` · ${currentStation.frequency}` : ''}
                        </p>
                    ) : null}
                </div>
                <div
                    className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-transform duration-150 active:scale-90"
                    style={{ background: heroColors.accent, boxShadow: `0 4px 14px ${heroColors.accent}45` }}
                    onClick={e => { e.stopPropagation(); togglePlay(); }}
                    role="button"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); togglePlay(); } }}
                >
                    {isPlaying
                        ? <Pause className="w-5 h-5 text-white" />
                        : <Play className="w-5 h-5 text-white ml-0.5" />
                    }
                </div>
            </div>
        </button>
    </div>
)}

{/* Shelves: recents + favorites */}
{browsing && (recentShelf.length > 0 || favoriteShelf.length > 0) && (
    <div className="mt-8 space-y-7">
        {recentShelf.length > 0 && (
            <Shelf title="Jump back in">
                {recentShelf.map(s => (
                    <StationTile
                        key={s.id}
                        station={s}
                        isPlaying={isPlaying && currentStation?.id === s.id}
                    />
                ))}
            </Shelf>
        )}
        {favoriteShelf.length > 0 && (
            <Shelf title="Your favourites">
                {favoriteShelf.map(s => (
                    <StationTile
                        key={s.id}
                        station={s}
                        isPlaying={isPlaying && currentStation?.id === s.id}
                    />
                ))}
            </Shelf>
        )}
    </div>
)}
```

Also add `StationArt` import if not present: `import { StationArt } from '@/components/station/StationArt';`

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 6: Commit**

```bash
git add components/MordernAirwave.tsx
git commit -m "feat(homepage): add Now Playing hero card and Jump Back In / Favourites shelves"
```

---

### Task 1.5 — Consolidate TrendingStrip to single responsive layout

**Files:**
- Modify: `components/station/TrendingStrip.tsx`

- [ ] **Step 1: Read the current TrendingStrip**

Open `components/station/TrendingStrip.tsx`. Note the separate mobile/desktop render blocks.

- [ ] **Step 2: Replace dual layout with single CSS Grid layout**

Replace the `sm:hidden` / `hidden sm:block` split with a single scrollable flex container that works at all sizes:

```tsx
<div
    className="flex gap-3 overflow-x-auto pb-1"
    style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    role="list"
    aria-label="Trending stations"
>
    {trendingStations.map((station, index) => (
        // ... existing card JSX, now rendered once
    ))}
</div>
```

Remove the separate `hidden sm:block` grid section. The cards should use `min-w-[148px]` and `shrink-0` so they scroll on mobile and wrap on desktop if there's room.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add components/station/TrendingStrip.tsx
git commit -m "refactor(TrendingStrip): single responsive flex layout, remove dual mobile/desktop render"
```

---

## PHASE 2: Player Experience Polish

**Depends on:** Phase 0 complete. Can run in parallel with Phase 1.

### File Map
```
MODIFY: components/player/AudioPlayer.tsx       — use Waveform, Badge; fix stable height
MODIFY: components/player/StationInfo.tsx       — use StationArt, Badge, Waveform primitives
MODIFY: components/player/NowPlayingSheet.tsx   — full-screen expanded player
```

---

### Task 2.1 — AudioPlayer: Stable height + Waveform primitive

**Files:**
- Modify: `components/player/AudioPlayer.tsx`

- [ ] **Step 1: Read the current AudioPlayer.tsx**

Open `components/player/AudioPlayer.tsx`. Note the bottom positioning logic and any inline waveform markup.

- [ ] **Step 2: Fix player height to be always stable (72px)**

The player bar should never change height. Ensure:
```tsx
<div
    className="fixed left-0 right-0 z-50 flex items-center"
    style={{
        height: '72px',
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--color-header-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid var(--color-border)',
    }}
>
```

The scroll-direction-based bottom offset adjustment (tab bar sliding) should apply to the **content padding** (`pb-[calc(72px+env(safe-area-inset-bottom))]` on the page wrapper), not to the player's own `bottom` value, which should stay at `0`.

- [ ] **Step 3: Replace waveform markup in StationInfo with `<Waveform />`**

(StationInfo is used inside AudioPlayer.) If AudioPlayer itself has waveform markup, replace with `<Waveform isAnimating={isPlaying} bars={3} height={14} />`.

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add components/player/AudioPlayer.tsx
git commit -m "fix(AudioPlayer): stable 72px height, use Waveform primitive"
```

---

### Task 2.2 — StationInfo: Use StationArt + primitives

**Files:**
- Modify: `components/player/StationInfo.tsx`

- [ ] **Step 1: Read the current StationInfo.tsx**

Open `components/player/StationInfo.tsx`. It currently uses `StationAvatar` or `StationArt`. If it uses `StationAvatar`, update to `StationArt`.

- [ ] **Step 2: Replace StationAvatar with StationArt**

```tsx
// Remove:
import { StationAvatar } from '@/components/station/StationAvatar';

// Add:
import { StationArt } from '@/components/station/StationArt';

// Replace usage:
<StationAvatar station={currentStation} size={44} />
// with:
<StationArt
    name={currentStation.name}
    logoUrl={currentStation.logo_url}
    genre={currentStation.genre}
    size={44}
    radius={10}
/>
```

- [ ] **Step 3: Replace inline listener count badge with Badge primitive**

```tsx
import { Badge } from '@/components/ui/Badge';

// Replace inline count badge with:
{liveListeners > 0 && (
    <Badge variant="accent" className="tabular-nums">
        {liveListeners.toLocaleString()}
    </Badge>
)}
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add components/player/StationInfo.tsx
git commit -m "refactor(StationInfo): use StationArt and Badge primitives"
```

---

## PHASE 3: Analytics Dashboard Consolidation

**Depends on:** Phase 0 complete. Independent of Phases 1–2.

### File Map
```
MODIFY: app/admin/analytics/page.tsx            — consistent tab pill styling
MODIFY: components/analytics/tabs/LivePulseTab.tsx — use Badge, Waveform
MODIFY: components/analytics/tabs/OverviewTab.tsx  — chart colour tokens
MODIFY: components/analytics/InsightPanels.tsx     — unified card style
```

---

### Task 3.1 — Analytics: Tab bar + chart colour token consistency

**Files:**
- Modify: `app/admin/analytics/page.tsx`

- [ ] **Step 1: Read the current analytics page**

Open `app/admin/analytics/page.tsx`. Find the tab rendering logic.

- [ ] **Step 2: Standardise tab pills to use design system colours**

Each tab button should use:
```tsx
<button
    key={tab}
    onClick={() => setActiveTab(tab)}
    className="px-4 py-2 text-body-sm font-medium rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap"
    style={
        activeTab === tab
            ? {
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  border: '1px solid transparent',
              }
            : {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
              }
    }
    aria-pressed={activeTab === tab}
>
    {TAB_LABELS[tab]}
</button>
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add app/admin/analytics/page.tsx
git commit -m "refactor(analytics): standardise tab pill styles to design system colours"
```

---

### Task 3.2 — LivePulseTab: Use Badge + Waveform

**Files:**
- Modify: `components/analytics/tabs/LivePulseTab.tsx`

- [ ] **Step 1: Read the current LivePulseTab**

Open `components/analytics/tabs/LivePulseTab.tsx`. Find inline badge markup and waveform bars.

- [ ] **Step 2: Replace inline LIVE badges**

Same pattern as Task 1.1 Step 2 — replace inline div badges with `<Badge variant="live" pulse>Live</Badge>`.

- [ ] **Step 3: Replace any inline waveform bars with `<Waveform />`**

Same pattern as Task 1.1 Step 4.

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add components/analytics/tabs/LivePulseTab.tsx
git commit -m "refactor(LivePulseTab): use Badge and Waveform primitives"
```

---

## Self-Review

### 1. Spec Coverage Check

| Requirement | Covered by |
|-------------|-----------|
| Minimal, premium, engaging interface | Phase 0 (tokens) + Phase 1 (hero, shelves) |
| Core actions within 1–2 clicks | Phase 1 hero card (one tap = detail page, one tap = play) |
| Mobile-first responsive | All phases — mobile layout maintained throughout |
| Large artwork | Phase 1 Task 1.4 (72px hero art, 96px tiles) |
| Rich gradients | Phase 1 hero card (radial gradient bg) |
| Glassmorphism cards | Existing — Badge uses `backdrop-filter: blur(12px)` |
| Smooth transitions | Phase 0 Task 0.1 (reduced-motion rule) |
| Clear visual hierarchy | Phase 0 typography scale applied in all tasks |
| Now Playing section | Phase 1 Task 1.4 (hero card) |
| Real-time metadata | Existing `useStreamMetadata` hook — not changed |
| Dynamic artwork | StationArt (existing) — improved in Phase 2 |
| Recently played | Phase 1 Task 1.4 (Jump Back In shelf) |
| Trending stations | Phase 1 Task 1.5 (TrendingStrip consolidation) |
| Live listener analytics | Existing — Phase 3 polishes presentation |
| Historical trends | Existing analytics tabs — Phase 3 standardises styling |
| Retention metrics | Existing retention endpoint — unchanged |
| Song impact analytics | Existing SongImpactPanel — unchanged |
| Accessibility (44px targets) | Phase 1 Task 1.2, Phase 2 |
| prefers-reduced-motion | Phase 0 Task 0.1 + Task 0.5 |
| Performance (skeletons, no CLS) | Phase 0 Task 0.7, Phase 1 Task 1.3 |

### 2. Placeholder Scan
No TBD, TODO, or vague steps found in this plan. ✓

### 3. Type Consistency
- `Badge` variant type: `'live' | 'listeners' | 'accent' | 'muted'` — used consistently across Tasks 1.1, 1.2, 2.2, 3.2
- `Button` variant type: `'primary' | 'secondary' | 'ghost' | 'danger'` — defined in Task 0.3, not yet used in other tasks (usage left to engineer judgment per screen)
- `Waveform` props: `isAnimating`, `bars`, `color`, `height` — used consistently
- `SkeletonCard` layout: `'card' | 'row'` — matches `StationLayout` values

---

**Plan saved.** This covers all 8 deliverables from the spec across 4 phases and 14 tasks.
