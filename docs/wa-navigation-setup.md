# Wear Active navigation setup

The theme renders Shopify's native `main-menu`. Before publishing this theme, create the Men and Sale collections, then update that menu in Shopify Admin.

## Collections

Create these automated collections with the exact handles below:

- **Men** — `/collections/men`
  - Include products intended for men using the store's existing gender product metafield or a consistent `men` product tag.
- **Sale** — `/collections/sale`
  - Use an automated condition: **Compare-at price is not empty**.
  - Ensure every included compare-at price is higher than its current price. Clear the field completely for products that aren't on sale; `0.00` is not treated as empty by Shopify.
- **New Arrivals** — `/collections/new-arrivals`
  - Include all priced products and sort the collection by newest product first.

The current women's destination is `/collections/women`.

Do not manually maintain Sale membership when the automated compare-at-price condition can be used. This prevents full-price products from remaining in the sale collection after a promotion ends. See Shopify's [sale collection setup](https://help.shopify.com/en/manual/products/collections/automated-collections/auto-examples#example-create-a-sale-collection).

## Main menu

In **Shopify Admin → Content → Menus → Main menu**, use this hierarchy:

- Men → `/collections/men`
  - Shop All Men → `/collections/men`
  - Shirts → `/collections/mens-shirts`
  - Trousers → `/collections/mens-trousers`
  - Shorts → `/collections/mens-shorts`
  - Compression Shirts → `/collections/mens-compression-shirts`
  - Quarter Zipper Tops → `/collections/quarter-zips`
  - Oversized Shirts → `/collections/oversized-shirts`
- Women → `/collections/women`
  - Shop All Women → `/collections/women`
  - Shirts → `/collections/womens-shirts`
  - Trousers → `/collections/womens-trousers`
- Best Sellers → the existing best-selling collection
- New Arrivals → `/collections/new-arrivals`
- Sale → `/collections/sale`

Keep Sale as a top-level item. The theme automatically gives a top-level menu item with the handle `sale` a restrained red accent on desktop and mobile.

The header is configured as an always-sticky mega-menu on desktop; the same hierarchy becomes native nested navigation in the mobile drawer.

The collection template also reads this menu to display contextual category links above the product grid. Men and Women links therefore stay synchronized between the header and collection pages. Keep the most important category links first; when a group grows beyond seven links, the collection page exposes the complete hierarchy under **Browse all categories**.
