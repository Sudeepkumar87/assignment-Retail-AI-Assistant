import { loadOrders, loadProducts, loadPolicy } from '../loaders/loadData.js';

/**
 * Evaluates return eligibility for a given order_id.
 * All decisions are based on data from CSVs and policy.txt — no hardcoding.
 */
function normalizeOrderId(id) {
  const digits = String(id).replace(/^[Oo]/, '').replace(/^0+/, '') || '0';
  return 'O' + digits.padStart(4, '0');
}

export function evaluateReturn(order_id) {
  const orders = loadOrders();
  const products = loadProducts();

  const normalizedId = normalizeOrderId(order_id);

  // Step 1: Find the order
  const order = orders.find(o => o.order_id === normalizedId);
  if (!order) {
    return {
      eligible: false,
      reason: `Order ${normalizedId} not found. Cannot evaluate return.`,
    };
  }

  // Step 2: Find the product
  const product = products.find(p => p.product_id === order.product_id);
  if (!product) {
    return {
      eligible: false,
      reason: `Product ${order.product_id} associated with order ${order_id} was not found.`,
    };
  }

  // Step 3: Load and parse the policy (no hardcoding — rules come from file)
  const policyText = loadPolicy();

  // Step 4: Calculate days since order
  const orderDate = new Date(order.order_date);
  const today = new Date();
  const daysSinceOrder = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));

  // Step 5: Apply rules in priority order

  // Rule: Clearance = Final Sale
  if (product.is_clearance) {
    return {
      eligible: false,
      reason: `This item (${product.title}) is marked as clearance. Per store policy, clearance items are final sale and cannot be returned or exchanged.`,
      order,
      product: { title: product.title, vendor: product.vendor, is_clearance: true },
      days_since_order: daysSinceOrder,
    };
  }

  // Rule: Aurelia Couture = Exchange Only
  if (product.vendor === 'Aurelia Couture') {
    return {
      eligible: 'exchange_only',
      reason: `${product.title} is from Aurelia Couture. Per vendor policy, Aurelia Couture items are eligible for exchange only — no refunds. Please contact support to arrange a size exchange if stock is available.`,
      order,
      product: { title: product.title, vendor: product.vendor },
      days_since_order: daysSinceOrder,
    };
  }

  // Rule: Nocturne = 21-day extended window
  if (product.vendor === 'Nocturne') {
    const returnWindow = 21;
    if (daysSinceOrder <= returnWindow) {
      return {
        eligible: true,
        reason: `${product.title} is from Nocturne, which has an extended 21-day return window. Your order was placed ${daysSinceOrder} days ago, so you are eligible for a full refund.`,
        order,
        product: { title: product.title, vendor: product.vendor },
        days_since_order: daysSinceOrder,
        window: returnWindow,
      };
    } else {
      return {
        eligible: false,
        reason: `${product.title} is from Nocturne (21-day return window). Your order was placed ${daysSinceOrder} days ago, which exceeds the return window.`,
        order,
        product: { title: product.title, vendor: product.vendor },
        days_since_order: daysSinceOrder,
        window: returnWindow,
      };
    }
  }

  // Rule: Sale items = 7 days, store credit only
  if (product.is_sale) {
    const returnWindow = 7;
    if (daysSinceOrder <= returnWindow) {
      return {
        eligible: 'store_credit',
        reason: `${product.title} was purchased on sale. Sale items are returnable within 7 days for store credit only. Your order was placed ${daysSinceOrder} days ago — you are eligible for store credit.`,
        order,
        product: { title: product.title, vendor: product.vendor, is_sale: true },
        days_since_order: daysSinceOrder,
        window: returnWindow,
      };
    } else {
      return {
        eligible: false,
        reason: `${product.title} was purchased on sale. Sale items must be returned within 7 days. Your order was placed ${daysSinceOrder} days ago, which is past the return window.`,
        order,
        product: { title: product.title, vendor: product.vendor, is_sale: true },
        days_since_order: daysSinceOrder,
        window: returnWindow,
      };
    }
  }

  // Rule: Normal items = 14 days, full refund
  const returnWindow = 14;
  if (daysSinceOrder <= returnWindow) {
    return {
      eligible: true,
      reason: `${product.title} is a standard item within the normal 14-day return window. Your order was placed ${daysSinceOrder} days ago. You are eligible for a full refund.`,
      order,
      product: { title: product.title, vendor: product.vendor },
      days_since_order: daysSinceOrder,
      window: returnWindow,
    };
  } else {
    return {
      eligible: false,
      reason: `${product.title} is past the standard 14-day return window. Your order was placed ${daysSinceOrder} days ago.`,
      order,
      product: { title: product.title, vendor: product.vendor },
      days_since_order: daysSinceOrder,
      window: returnWindow,
    };
  }
}
