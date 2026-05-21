import { loadProducts } from '../loaders/loadData.js';

/**
 * search_products({ size, maxPrice, tags, saleOnly, clearanceExcluded })
 * Returns matching products sorted by bestseller_score DESC
 */
export function searchProducts(filters = {}) {
  const products = loadProducts();
  const { size, maxPrice, tags, saleOnly, clearanceExcluded } = filters;

  let results = products.filter(p => {
    // Size availability check
    if (size) {
      const sizeStr = String(size);
      if (!p.sizes_available.includes(sizeStr)) return false;
      // Stock check for that size
      const stock = p.stock_per_size[sizeStr];
      if (stock === undefined || stock === 0) return false;
    }

    // Price check
    if (maxPrice !== undefined && p.price > maxPrice) return false;

    // Sale filter
    if (saleOnly && !p.is_sale) return false;

    // Exclude clearance if requested
    if (clearanceExcluded && p.is_clearance) return false;

    // Tag match (any tag must match)
    if (tags && tags.length > 0) {
      const productTags = p.tags.map(t => t.toLowerCase());
      const hasMatch = tags.some(t => productTags.includes(t.toLowerCase()));
      if (!hasMatch) return false;
    }

    return true;
  });

  // Sort: sale first, then by bestseller_score DESC
  results.sort((a, b) => {
    if (b.is_sale !== a.is_sale) return b.is_sale ? 1 : -1;
    return b.bestseller_score - a.bestseller_score;
  });

  return results.slice(0, 5).map(p => ({
    product_id: p.product_id,
    title: p.title,
    vendor: p.vendor,
    price: p.price,
    compare_at_price: p.compare_at_price,
    tags: p.tags,
    is_sale: p.is_sale,
    is_clearance: p.is_clearance,
    bestseller_score: p.bestseller_score,
    size_requested: size ? String(size) : null,
    stock_for_size: size ? p.stock_per_size[String(size)] : null,
  }));
}
