import { loadProducts } from '../loaders/loadData.js';

export function getProduct(product_id) {
  const products = loadProducts();
  const product = products.find(p => p.product_id === product_id);
  if (!product) return { error: `Product ${product_id} not found.` };
  return product;
}
