# Wear Active Dawn Theme — Customizations

This document describes all Wear Active custom features built on top of Shopify Dawn. It is intended for developers, theme editors, and AI coding agents working in this repository.

---

## Wear Active custom architecture

### `wa-` namespace convention

All Wear Active custom code uses the `wa-` prefix:

- **CSS classes** — e.g. `wa-product-card`, `wa-sticky-atc`, `wa-linked-colors`
- **Custom elements** — e.g. `<wa-sticky-atc>`, `<wa-modal>` (when size chart is enabled)
- **Snippet/asset filenames** — e.g. `wa-components.css`, `snippets/wa-size-chart.liquid`
- **Data attributes** — e.g. `data-wa-sticky-atc-sentinel`

Custom blocks in Dawn core files are wrapped in comments:

```liquid
{%- comment -%} Wear Active custom code start {%- endcomment -%}
...
{%- comment -%} Wear Active custom code end {%- endcomment -%}
```

### Custom asset files

| File | Scope | Purpose |
|------|-------|---------|
| `assets/wa-base.css` | Global | Design tokens and base-level overrides |
| `assets/wa-components.css` | Global | Shared components: swatches, product card hover/polish |
| `assets/wa-product.css` | Product pages | PDP-specific styles (linked swatches, size chart when enabled) |
| `assets/wa-sticky-atc.css` | Product pages | Sticky Add to Cart bar styles |
| `assets/wa-sticky-atc.js` | Product pages | `<wa-sticky-atc>` custom element |
| `assets/wa-modal.js` | Global | `<wa-modal>` custom element (size chart) |
| `assets/wa-product.js` | Product pages | PDP scripts (size chart trigger relocation, ARIA) |

### How assets are loaded

In `layout/theme.liquid`, after Dawn `base.css`:

**All pages**

```liquid
{{ 'wa-base.css' | asset_url | stylesheet_tag }}
{{ 'wa-components.css' | asset_url | stylesheet_tag }}
```

**Product pages only** (`template.name == 'product'`)

```liquid
{{ 'wa-product.css' | asset_url | stylesheet_tag }}
{{ 'wa-sticky-atc.css' | asset_url | stylesheet_tag }}
<script src="{{ 'wa-sticky-atc.js' | asset_url }}" defer="defer"></script>
```

When the size chart feature is enabled, `wa-modal.js` and `wa-product.js` are also loaded (globally and on product pages respectively).

### Rule: avoid modifying Dawn core unless necessary

Prefer:

- New `snippets/wa-*.liquid` files
- New `assets/wa-*` files
- Small, commented integration points in Dawn files

Avoid changing Dawn cart, checkout, payment, or product form logic. Current Dawn touch points:

| Dawn file | Wear Active integration |
|-----------|-------------------------|
| `layout/theme.liquid` | Loads `wa-*` assets |
| `sections/main-product.liquid` | Linked swatches, sticky ATC sentinel/snippet, size chart snippet |
| `snippets/card-product.liquid` | Hover images, `wa-product-card` class, linked swatches |

---

## Size Chart Modal

> **Status:** Implemented on `feature/size-chart-modal` but **reverted** in main history (PR #2). The files below describe the intended implementation. Re-merge from that branch to restore the feature.

### Files involved

| File | Role |
|------|------|
| `snippets/wa-size-chart.liquid` | Size Guide trigger + modal content |
| `snippets/wa-size-chart-field.liquid` | Helper: reads a row field value |
| `snippets/wa-size-chart-format.liquid` | Helper: formats measurement values |
| `assets/wa-modal.js` | Reusable `<wa-modal>` element (teleport, scroll lock, focus) |
| `assets/wa-product.js` | Relocates trigger beside Size option; ARIA sync |
| `assets/wa-product.css` | Size chart trigger, table, modal layout |
| `assets/wa-components.css` | Shared modal overlay/dialog styles |
| `sections/main-product.liquid` | Renders snippet after variant picker |

### Product metafield

- **Namespace/key:** `custom.size_chart`
- **Type:** Metaobject reference → **Size Chart**

### Metaobject: Size Chart

| Field | Type | Purpose |
|-------|------|---------|
| `title` | Single line text | Modal heading |
| `fit_type` | Single line text | e.g. "Runs small", "True to size" |
| `description` | Multi-line text | Intro copy above the table |
| `measurement_image` | File/image | Optional how-to-measure diagram |
| `rows` | List of metaobject references | Points to **Size Chart Row** entries |

> **Note:** The old `size_table` rich text field is **not used**. Tables are built from `rows`.

### Metaobject: Size Chart Row

| Field | Type |
|-------|------|
| `size` | Single line text |
| `chest` | Single line text |
| `waist` | Single line text |
| `hips` | Single line text |
| `length` | Single line text |
| `inseam` | Single line text |

### How to create entries in Shopify admin

1. Go to **Settings → Custom data → Metaobjects**.
2. Create **Size Chart Row** entries (one per size, e.g. S, M, L) with measurement values.
3. Create a **Size Chart** entry:
   - Fill in `title`, `fit_type`, `description`, and optional `measurement_image`.
   - Add all relevant rows to the `rows` list.
4. Go to **Settings → Custom data → Products**.
5. Add a metafield definition:
   - **Name:** Size chart
   - **Namespace and key:** `custom.size_chart`
   - **Type:** Metaobject → Size Chart (one entry)

### How to assign a size chart to a product

1. Open a product in **Shopify admin**.
2. Scroll to **Metafields** (or the Wear Active size chart field if pinned).
3. Select the appropriate **Size Chart** metaobject entry.
4. Save. The Size Guide link appears on the PDP only when this metafield is set.

### Dynamic columns

The table is built in two passes inside `wa-size-chart.liquid`:

1. **Pass 1** — Scan `size_chart.rows.value` and determine which of Chest, Waist, Hips, Length, and Inseam have at least one non-empty value.
2. **Pass 2** — Render only active columns. **Size** is always the first column. Empty cells display `—`.

This keeps tables minimal when a product only needs subset measurements (e.g. tops vs bottoms).

---

## Linked Color Swatches

Links color-variant products so shoppers can switch between sibling products (e.g. Black ↔ Navy) without using Dawn variant swatches for color.

### Files involved

| File | Role |
|------|------|
| `snippets/wa-linked-color-swatches.liquid` | PDP and card swatch list |
| `snippets/wa-linked-color-swatch.liquid` | Single swatch markup |
| `snippets/wa-color-from-product.liquid` | Resolves color name, CSS color, and image |
| `assets/wa-components.css` | Shared swatch styles (card mode) |
| `assets/wa-product.css` | PDP swatch styles |
| `sections/main-product.liquid` | Renders after variant picker (`mode: 'product'`) |
| `snippets/card-product.liquid` | Renders after price (`mode: 'card'`) |

### Product metafield

- **Namespace/key:** `custom.color_siblings`
- **Type:** List of product references
- **Value:** Sibling products that represent other colors of the same style

### Shopify category color field

Primary color source:

```
product.metafields.shopify['color-pattern'].value
```

This reads Shopify Standard Product Taxonomy **Color** metaobjects (`shopify--color-pattern`), using:

- `.label` — color name shown in UI
- `.color` — RGB/hex for swatch fill
- `.image` — optional pattern/image swatch

### Fallback behavior

If category color data is incomplete, resolution falls back in order:

1. **Color/Colour variant option** — uses Dawn swatch data from `product.options_with_values`
2. **`custom.color_hex`** — hex value only (requires a color name from step 1 or category field)

Swatches are **not rendered** when no color name + swatch value (color or image) can be resolved. Products without color data are skipped; the block still shows if the current product or any sibling has valid color data.

### How to link sibling products

1. Create separate products per color (standard Shopify approach).
2. Set the Shopify **Color** category metafield on each product.
3. On each product, edit `custom.color_siblings` and add references to the other color products.
4. Ensure the list is reciprocal (A lists B, B lists A) for a consistent experience.

### PDP vs card behavior

| Context | Mode | Behavior |
|---------|------|----------|
| Product page | `product` | Fieldset with `Color: {name}` label; current product swatch is active; siblings link to their PDPs |
| Product cards | `card` | Compact swatches under price; same link behavior; smaller tap targets on mobile |

---

## Sticky Add to Cart

A fixed bottom bar on product pages that appears after the main buy buttons scroll out of view.

### Files involved

| File | Role |
|------|------|
| `snippets/wa-sticky-add-to-cart.liquid` | Bar markup (thumbnail, title, size, price, button) |
| `assets/wa-sticky-atc.js` | `<wa-sticky-atc>` custom element |
| `assets/wa-sticky-atc.css` | Layout, animation, responsive styles |
| `sections/main-product.liquid` | Buy-buttons wrapper sentinel + snippet render |
| `layout/theme.liquid` | Loads CSS/JS on product pages |

### How visibility works

- An `IntersectionObserver` watches the buy-buttons wrapper (`data-wa-sticky-atc-sentinel`).
- The bar stays **hidden** while buy buttons are in the viewport.
- The bar **shows** only after the buy-buttons block scrolls **above** the viewport (`boundingClientRect.top < 0`), so it does not appear on initial load when the form is below the fold.
- The bar **hides** again when the user scrolls back to the main form.

### Cart drawer hiding behavior

When the Dawn cart drawer opens:

- The sticky bar hides **immediately** (`display: none` via `wa-sticky-atc--drawer-hidden`).
- It stays hidden while `cart-drawer` has the `active` class.
- It reappears only after the drawer fully closes (waits for drawer `transform` / `visibility` transition end, with a 350ms fallback).

Layering: sticky bar `z-index: 100`; cart drawer `z-index: 1000`; modals above `101`.

### Variant synchronization

The sticky bar does **not** duplicate cart logic. It proxies a click to Dawn's `#ProductSubmitButton-{sectionId}`.

State stays in sync via:

- Dawn `PUB_SUB_EVENTS.variantChange` pub/sub
- `MutationObserver` on the main submit button and price block

Synced fields: price HTML, button label, disabled/loading state, thumbnail, and selected **Size** label (desktop).

### Responsive behavior

| Breakpoint | Layout |
|------------|--------|
| Desktop (750px+) | Thumbnail, title, size, price, large Add to Cart button |
| Mobile | Price + full-width Add to Cart button; iPhone safe-area padding |

Animations: slide + fade (disabled under `prefers-reduced-motion`). Uses `aria-hidden`, `inert`, and unique IDs for accessibility.

---

## Product Card Hover Image

Desktop-only fade from featured image to the second product image on collection-style cards.

### Files involved

| File | Role |
|------|------|
| `snippets/wa-product-card-images.liquid` | Primary + optional secondary image markup |
| `snippets/card-product.liquid` | Renders snippet in card media area |
| `assets/wa-components.css` | Opacity fade hover styles |

### How the secondary image is selected

```liquid
assign wa_card_secondary = card_product.media[1]
```

Uses the **second image** in the product media gallery (index `1`). If only one image exists, no secondary image or hover class is rendered.

### Where it appears

Anywhere `snippets/card-product.liquid` is rendered:

- Collection pages (`main-collection-product-grid`)
- Homepage featured collections (`featured-collection`)
- Related products (`related-products`)
- Search results (`main-search`)
- Collage product blocks

Does not depend on Dawn's `show_secondary_image` theme setting.

### Desktop-only behavior

Hover fade runs only inside:

```css
@media (hover: hover) and (pointer: fine)
```

Mobile and tablet show the featured image only. Secondary images use `loading="lazy"`. Dawn's responsive `srcset` / `sizes` strategy is reused.

### Reduced motion behavior

Under `prefers-reduced-motion: reduce`, opacity transitions are disabled and the primary image remains visible on hover.

---

## Product Card Polish

Typography, spacing, and swatch refinements for collection-style product cards.

### Files involved

| File | Role |
|------|------|
| `assets/wa-components.css` | `.wa-product-card` styles |
| `snippets/card-product.liquid` | Adds `wa-product-card` class to card wrapper |

### Typography / spacing / swatches changes

- **Title:** `font-weight: 500`, slightly larger (`1.4rem` mobile/desktop), 2-line clamp on mobile
- **Price:** Larger than title, `font-weight: 500`, prominent but not heavy bold
- **Spacing:** Increased title → price and price → swatches gaps; consistent vertical rhythm
- **Swatches:** Refined active ring (thin, subtle); no hover scale on card swatches
- **Card hover:** Subtle title color fade on desktop only (no shadows or movement)

### Where it applies

All product cards using `card-product.liquid` with the `wa-product-card` class — same surfaces as hover images (collections, homepage, search, related products).

---

## Development workflow

### Branch strategy

```
feature/*  →  dev  →  staging  →  main
```

| Branch | Purpose |
|--------|---------|
| `feature/*` | Individual features or fixes |
| `dev` | Integration branch for merged features |
| `staging` | Shopify preview / QA theme |
| `main` | Production-ready only |

**Rules:**

- Never push directly to `main`.
- Always branch from `dev`.
- Use **staging** for Shopify preview testing before production.
- Keep PRs focused and reversible (one feature per PR where possible).

### Before merging

1. Run `shopify theme check` — fix any new offenses in Wear Active files.
2. Manually verify affected templates (PDP, collection, search, homepage).
3. Confirm no changes to cart, checkout, or payment unless explicitly requested.

### Agent instructions

See also `AGENTS.md` and `PROJECT_RULES.md` in the repo root.

---

## Future feature notes

Planned or discussed enhancements (not yet implemented):

| Feature | Notes |
|---------|-------|
| **Quick add modal** | Extend Dawn quick-add with Wear Active styling; keep cart logic unchanged |
| **Product image gallery upgrade** | PDP gallery improvements (zoom, thumbnails, video) — separate from card hover |
| **Mega menu** | Navigation upgrade for large catalogs |
| **Homepage refinement** | Section styling, hero, featured collection layout |
| **Performance / SEO audit** | Lighthouse pass, image loading review, structured data check |

### Re-enabling size chart

To restore the reverted size chart feature:

```bash
git checkout feature/size-chart-modal -- snippets/wa-size-chart*.liquid assets/wa-modal.js assets/wa-product.js
# Merge wa-product.css and wa-components.css modal sections carefully
# Re-add theme.liquid script tags for wa-modal.js and wa-product.js
# Re-add {% render 'wa-size-chart' %} in main-product.liquid after variant picker
```

---

## Quick reference — metafields

| Metafield | Type | Used by |
|-----------|------|---------|
| `custom.size_chart` | Metaobject → Size Chart | Size Chart Modal |
| `custom.color_siblings` | List of product references | Linked Color Swatches |
| `custom.color_hex` | Single line text (hex) | Swatch fallback |
| `shopify.color-pattern` | Shopify taxonomy Color | Swatch primary source |
