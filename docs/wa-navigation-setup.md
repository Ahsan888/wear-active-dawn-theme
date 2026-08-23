# Wear Active navigation setup

The theme renders Shopify's native `main-menu`. Before publishing this theme, create the Men and Sale collections, then update that menu in Shopify Admin.

## Collections

Create these automated collections with the exact handles below:

- **Men** — `/collections/men`
  - Include products intended for men using the store's existing gender product metafield or a consistent `men` product tag.
- **Sale** — `/collections/sale`
  - Use an automated condition: **Compare-at price is not empty**.
  - Ensure every included compare-at price is higher than its current price. Clear the field completely for products that aren't on sale; `0.00` is not treated as empty by Shopify.

The existing women's destination remains `/collections/women-s-performance-collection`.

Do not manually maintain Sale membership when the automated compare-at-price condition can be used. This prevents full-price products from remaining in the sale collection after a promotion ends. See Shopify's [sale collection setup](https://help.shopify.com/en/manual/products/collections/automated-collections/auto-examples#example-create-a-sale-collection).

## Main menu

In **Shopify Admin → Content → Menus → Main menu**, use this hierarchy:

- Men → `/collections/men`
  - Shop All Men → `/collections/men`
  - T-Shirts & Polos → `/collections/shirts`
  - Trousers → `/collections/trousers`
  - Shorts → `/collections/shorts`
  - Hoodies → `/collections/hoodies`
  - Jackets → `/collections/jackets`
- Women → `/collections/women-s-performance-collection`
  - Shop All Women → `/collections/women-s-performance-collection`
  - Add women's subcollections after they exist; do not point these items at mixed-gender collections.
- Best Sellers → the existing best-selling collection
- Sale → `/collections/sale`

Keep Sale as a top-level item. The theme automatically gives a top-level menu item with the handle `sale` a restrained red accent on desktop and mobile.

The header is configured as an always-sticky mega-menu on desktop; the same hierarchy becomes native nested navigation in the mobile drawer.
