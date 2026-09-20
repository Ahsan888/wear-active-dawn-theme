# Digifly CRO audit — Dawn theme implementation

Reviewed against the September 2026 six-page audit, the current theme repository, and the live storefront on 21 September 2026.

## Finding-by-finding status

| # | Audit finding | Theme-specific decision | Status |
|---|---|---|---|
| 1 | Desktop banner shown on mobile | The old files named `mobile` were still 960×540 landscape and the carousel stayed 16:9. Reused the original portrait campaign photography, added a 4:5 mobile viewport, and added a separate mobile image picker for future campaigns. | Implemented |
| 2 | No homepage video/reels | Added a performance-first, horizontally swipeable gallery for 3–5 Shopify-hosted vertical videos. It remains hidden on the storefront until real videos are selected, but shows setup guidance in the theme editor. | Theme ready; content required |
| 3 | Reviews missing/insufficient | The audit is stale here. Judge.me family ratings, a full product review widget, a homepage review carousel, and a reviews hub are already present on the live site. | Already implemented |
| 4 | No short description near Add to Cart | Added three scannable decision points immediately above Add to Cart. Defaults cover delivery, exchange, and sizing help; a `custom.key_features` list metafield can provide product-specific benefits. | Implemented |
| 5 | Savings shown only as percentage | Bundle cards already show rupee savings. Standard sale products now also show `You save Rs…` beside the PDP sale price, calculated from the selected variant's compare-at price. | Implemented |
| 6 | No product video | Dawn already renders Shopify-hosted, YouTube, and Vimeo product media in the product gallery. Upload/attach a short video to each priority product rather than adding a second video system. | Theme ready; content required |
| 7 | No FAQ | Added a product FAQ section with sizing, delivery, exchange, and payment answers plus optional merchant-defined questions. | Implemented |
| 8 | Checkout urgency | A generic ten-minute timer or surprise incentive was not implemented. It would create unverifiable scarcity, and checkout changes are outside this theme's approved scope. The existing cart already states free delivery, COD, security, and exchange information. Only add a countdown later if it reflects a real dispatch cutoff or genuinely expiring offer. | Intentionally not implemented |

## Content rollout

1. Upload three to five vertical customer/creator clips in Shopify **Content → Files**, then select them in **Home page → WA movement videos**. Keep clips short, show fit and fabric movement, and link each to its featured product.
2. Attach a short product-specific clip as product media to the highest-traffic products. Dawn will place it in the existing media gallery without extra JavaScript.
3. Create a product metafield definition for `custom.key_features` as a **list of single-line text**, then add up to three concrete product benefits per product. Until populated, the safe service defaults remain visible.
4. Continue collecting verified photo/video reviews through the existing Judge.me flow; do not seed or fabricate review content.

## Research basis

- Shopify's product-media model natively supports hosted videos, YouTube, and Vimeo, so PDP video should stay in the existing media gallery: <https://shopify.dev/docs/storefronts/themes/product-merchandising/media>
- Shopify recommends modular sections and blocks for merchant-editable Online Store 2.0 content: <https://shopify.dev/docs/storefronts/themes/best-practices/templates-sections-blocks>
- Baymard's checkout research supports countdowns when they communicate a real fulfillment cutoff. It does not justify a resetting or artificial urgency timer: <https://baymard.com/research-articles/current-state-of-checkout-ux>
