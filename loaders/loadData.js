import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');

function parseStockPerSize(raw) {
  try {
    // Convert Python-style dict to JSON: {'8': 5} -> {"8": 5}
    const json = raw
      .replace(/'/g, '"')
      .replace(/True/g, 'true')
      .replace(/False/g, 'false');
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function loadProducts() {
  const raw = fs.readFileSync(path.join(dataDir, 'product_inventory.csv'), 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true });
  return records.map(p => ({
    product_id: p.product_id,
    title: p.title,
    vendor: p.vendor,
    price: parseFloat(p.price),
    compare_at_price: parseFloat(p.compare_at_price),
    tags: p.tags.split(',').map(t => t.trim()),
    sizes_available: p.sizes_available.split('|').map(s => s.trim()),
    stock_per_size: parseStockPerSize(p.stock_per_size),
    is_sale: p.is_sale === 'True',
    is_clearance: p.is_clearance === 'True',
    bestseller_score: parseInt(p.bestseller_score),
  }));
}

export function loadOrders() {
  const raw = fs.readFileSync(path.join(dataDir, 'orders.csv'), 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true });
  return records.map(o => ({
    order_id: o.order_id,
    order_date: o.order_date,
    product_id: o.product_id,
    size: o.size,
    price_paid: parseFloat(o.price_paid),
    customer_id: o.customer_id,
  }));
}

export function loadPolicy() {
  return fs.readFileSync(path.join(dataDir, 'policy.txt'), 'utf8');
}
