---
name: Clinical Mint & Pine
colors:
  surface: '#ebfdf8'
  surface-dim: '#ccded9'
  surface-bright: '#ebfdf8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e5f8f2'
  surface-container: '#dff2ed'
  surface-container-high: '#daece7'
  surface-container-highest: '#d4e6e1'
  on-surface: '#0e1e1b'
  on-surface-variant: '#404946'
  inverse-surface: '#233330'
  inverse-on-surface: '#e2f5ef'
  outline: '#707976'
  outline-variant: '#bfc9c5'
  surface-tint: '#2c685c'
  primary: '#003930'
  on-primary: '#ffffff'
  primary-container: '#0f5146'
  on-primary-container: '#87c2b4'
  inverse-primary: '#96d2c4'
  secondary: '#006c4b'
  on-secondary: '#ffffff'
  secondary-container: '#64f9bc'
  on-secondary-container: '#00714e'
  tertiary: '#003833'
  on-tertiary: '#ffffff'
  tertiary-container: '#00514a'
  on-tertiary-container: '#59c8ba'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b2efdf'
  primary-fixed-dim: '#96d2c4'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#0d5045'
  secondary-fixed: '#68fcbf'
  secondary-fixed-dim: '#45dfa4'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#ebfdf8'
  on-background: '#0e1e1b'
  surface-variant: '#d4e6e1'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  metric-num:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 1.75rem
  space-2xl: 2.5rem
---

## Brand & Style

This design system embodies modern clinical precision, restorative calm, and operational clarity. Engineered for hospital staff, clinical directors, and health informatics teams, the aesthetic eliminates cognitive fatigue during demanding shifts through high-legibility typographic hierarchies, soft-tinted surfaces, and distinct tactile interactive primitives.

The visual style synthesizes **Modern Minimalist Healthcare** with **Tactile Soft Surfaces**:
- **Restorative Cleanliness:** Generous negative space paired with warm, pale mint-tinted canvases creates an environment that feels sterile yet welcoming, reducing monitor-glare stress.
- **Physical Softness:** High-curvature cards (20–24px outer radii) combine with ultra-soft boundary definitions, avoiding razor-sharp industrial edges in favor of organic, approachable boundaries.
- **Utilitarian Action:** High-contrast pine teal grounds essential interactive operations, while pill-shaped tactile controls and circular 45-degree arrow buttons guide navigation seamlessly.

## Colors

The palette is derived from clean clinical greens, deep foliage teal, and soft ambient mint neutrals:

- **Canvas & Surface Architecture:**
  - Background Canvas: `#f2f7f4` (soft therapeutic mint off-white).
  - Primary Surface: `#ffffff` (pure clinical white for cards, panels, and modal layers).
  - Subtle Surface Tint: `#e8f5f1` (light mint wash used for icon pills, inactive toggles, and status badges).
  - Subtle Border: `#e2ede6` (gentle boundary line with low contrast).

- **Brand & Action Tones:**
  - Primary (`#0f5146`): Deep pine green for primary buttons, highlighted selections, and high-emphasis labels.
  - Secondary (`#34d399`): Soft mint teal for active radio accents, gauge rings, and success badges.
  - Tertiary / Metric Accent (`#0d9488`): Mid-teal for secondary data visualizations, progress arcs, and interactive hover highlights.

- **Typography & Content:**
  - Primary Content (`#132320`): Deep pine-charcoal for dense readability without harsh pure-black contrast.
  - Secondary Content (`#516661`): Muted sage-slate for descriptions, subtitles, and inactive metadata.
  - Tertiary / Hint (`#829993`): Light muted tone for units, helper captions, and subtle tick marks.

- **Clinical Status & Alert Roles:**
  - Status Success: `#10b981` (mint emerald) paired with `#e6f7f0` surface.
  - Status Warning/Alert: `#e06a3b` to `#dc2626` (used sparingly for department surge load and critical alerts).

## Typography

Typography prioritizes fast numerical comprehension and calm editorial legibility under variable lighting conditions. 

- **Primary Typeface:** Plus Jakarta Sans provides geometric warmth, tall x-heights, and clear aperture definitions that prevent medical number misreads.
- **Hierarchy Rules:**
  - Metrics (e.g., percentages, bed counts) use `metric-num` at 28px/700 weight, paired directly with muted labels (`87% occupied`).
  - Section headers pair an icon container with `headline-md` or `headline-lg` in `#132320`.
  - Body copy retains adequate line spacing (`1.5` ratio minimum) to keep patient and machine specifications effortless to scan.

## Layout & Spacing

The dashboard employs a fluid, modular grid system configured for complex hospital management layouts:

- **Grid Strategy:**
  - **Desktop (1200px+):** 12-column dynamic layout with `1.5rem` gutters and `2rem` outer page margins. Enables split views with main operational overview (8 columns) and secondary roster/alerts panel (4 columns).
  - **Tablet (768px – 1199px):** 8-column layout with `1.25rem` gutters and `1.5rem` margins. Side panels convert to collapsible sliding drawers or lower horizontal sections.
  - **Mobile (< 768px):** 4-column layout with `1rem` gutters and `1rem` margins. Multi-column metric cards stack into 2-column or full-width blocks.

- **Component Spacing Rules:**
  - Internal card padding is standardized at `1.25rem` (20px) on mobile and `1.75rem` (28px) on desktop to provide spacious separation between controls, illustrations, and metric charts.
  - Pill badges and interactive action bars preserve a compact `0.375rem` to `0.5rem` gap between sibling items.

## Elevation & Depth

Visual hierarchy uses clean planar layering rather than dramatic drops, reinforcing clinical cleanliness:

- **Surface Layer 0 (Canvas):** `#f2f7f4` flat, non-reflective base.
- **Surface Layer 1 (Cards & Modules):** Pure `#ffffff` container with a hairline stroke (`1px solid #e2ede6`) and an ultra-diffused ambient shadow:
  - `box-shadow: 0 4px 20px -2px rgba(19, 35, 32, 0.04), 0 2px 6px -1px rgba(19, 35, 32, 0.02);`
- **Surface Layer 2 (Floating Action Buttons & Popovers):** Raised interactive tools (e.g., circular directional shortcuts, floating filters):
  - `box-shadow: 0 8px 24px -4px rgba(19, 35, 32, 0.08), 0 2px 8px -2px rgba(19, 35, 32, 0.04);`
- **Ghost Depth for Inset Containers:** Pill track toggles and calendar slot backgrounds use `#edf5f1` or `#f8faf8` with no drop shadow, grounding them directly into the parent card.

## Shapes

The design system embraces high-radius curvature to project friendliness and modernity:

- **Cards & Primary Modules:** Outer boundary curves range from `1.25rem` (20px) to `1.5rem` (24px) (`rounded-2xl` to `rounded-3xl`), eliminating clinical harshness.
- **Buttons, Badges, & Chips:** Pure pill geometry (`rounded-full` / `9999px`) creates smooth, ergonomic interaction targets.
- **Directional Shortcut Buttons:** Perfect circular enclosures (`rounded-full`, 36px–40px diameter) housing clean directional icons.
- **Calendar & Schedule Slots:** Soft rounded rectangles (`0.5rem` to `0.75rem` / 8–12px) preventing dense tabular grids from feeling rigid.

## Components

### Buttons
- **Primary Action Button:** Full pill contour (`rounded-full`), solid pine `#0f5146` fill, crisp `#ffffff` text (`label-md`), 10px 20px padding. Hover: `#093c34`. Active: subtle transform scale (0.98). Zero ambient glow.
- **Secondary / Ghost Button:** Full pill contour, `#ffffff` surface, 1px solid `#d5e4dc` border, `#132320` text. Hover: `#e8f5f1` fill with `#0f5146` text.
- **Tactile Circular Action Button:** 36x36px or 40x40px pure circle, `#ffffff` surface with `1px solid #e2ede6`, containing a dark charcoal/teal 45-degree arrow icon (`↗`). Hover: `#f2f7f4` fill with subtle elevation lift.

### Chips & Segmented Controls
- **Filter Chips:** Pill shape with `#f0f7f4` background, `#516661` label. Selected state: solid `#132320` or `#0f5146` with `#ffffff` text.
- **Segmented Toggle (e.g., Bed / Room):** Inset soft-mint pill tray (`#edf5f1`, 4px inner padding) with an sliding active white pill (`#ffffff`, soft ambient shadow, `#132320` text).

### Status Indicators & Badges
- **Occupancy / Readiness Badges:** Pill-shaped micro-containers (padding 4px 10px). Background `#e8f5f1`, text `#0f5146` (`label-sm`). Includes an optional 6px circular dot indicator.
- **Duty State Badges:** Circular indicator dot (Green `#10b981` for active duty, Amber `#f59e0b` for break, Crimson `#ef4444` for emergency call) followed by text in `#516661`.

### Data Gauges & Visualizations
- **Radial Capacity Meters:** Rounded arc tracks with pale sage track background (`#e2ede6`) and vibrant clinical teal active fills (`#0f5146` or `#0d9488`).
- **Volume & Density Bar Graphs:** Vertical pill rods (height 12–24px, width 3–4px) transitioning from muted mint `#d1e5dc` (idle) to deep teal `#0f5146` (active) and brick orange `#e06a3b` (surge).

### Form Elements & Inputs
- **Calendar Date Stepper:** Integrated pill cluster with month indicator dropdown and pagination chevrons (`<` `>`). Active day highlight: mint gradient vertical pill with indicator dot.
- **Search & Text Input:** Rounded-full or rounded-xl (12px), `#f7faf8` base, `#e2ede6` border. Focus ring: 2px solid `#0f5146` at 20% opacity.

### Medical Cards & Schedule Tiles
- **Personnel / Patient Tile:** Clean horizontal layout inside staff card with 40px circular avatar, name in `headline-sm`, subtitle role in `label-sm`, and trailing specialty department badge.
- **Equipment Detail Card:** Clean hero image showcase flanked by specification pills, quick telemetry badges, and direct action links.