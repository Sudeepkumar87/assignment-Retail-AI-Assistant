import { loadOrders } from '../loaders/loadData.js';

export function getOrder(order_id) {
  const orders = loadOrders();
  const order = orders.find(o => o.order_id === order_id);
  if (!order) return { error: `Order ${order_id} not found. Please check the order ID and try again.` };
  return order;
}
