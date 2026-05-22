import { loadOrders } from '../loaders/loadData.js';

function normalizeOrderId(id) {
  const digits = String(id).replace(/^[Oo]/, '').replace(/^0+/, '') || '0';
  return 'O' + digits.padStart(4, '0');
}

export function getOrder(order_id) {
  const orders = loadOrders();
  const normalizedId = normalizeOrderId(order_id);
  const order = orders.find(o => o.order_id === normalizedId);
  if (!order) return { error: `Order ${normalizedId} not found. Please check the order ID and try again.` };
  return order;
}
