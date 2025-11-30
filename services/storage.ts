import { Order, User, UserRole, CostTemplate, OrderStatus } from '../types';

const KEYS = {
  ORDERS: 'ecpm_orders',
  USERS: 'ecpm_users',
  TEMPLATES: 'ecpm_templates',
  CURRENT_USER: 'ecpm_current_user',
};

// --- Orders ---
export const getOrders = (): Order[] => {
  const data = localStorage.getItem(KEYS.ORDERS);
  return data ? JSON.parse(data) : [];
};

export const saveOrders = (orders: Order[]) => {
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
};

export const addOrders = (newOrders: Order[]) => {
  const current = getOrders();
  saveOrders([...current, ...newOrders]);
};

export const updateOrder = (updatedOrder: Order) => {
  const orders = getOrders().map(o => o.id === updatedOrder.id ? updatedOrder : o);
  saveOrders(orders);
};

export const deleteOrder = (id: string) => {
  const orders = getOrders().filter(o => o.id !== id);
  saveOrders(orders);
};

// --- Templates ---
export const getTemplates = (): CostTemplate[] => {
  const data = localStorage.getItem(KEYS.TEMPLATES);
  return data ? JSON.parse(data) : [];
};

export const saveTemplate = (template: CostTemplate) => {
  const templates = getTemplates();
  templates.push(template);
  localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
};

export const deleteTemplate = (id: string) => {
  const templates = getTemplates().filter(t => t.id !== id);
  localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
};

// --- Users ---
const DEFAULT_ADMIN: User = {
  id: 'admin-1',
  username: 'admin',
  password: '123',
  role: UserRole.ADMIN,
  permissions: ['all']
};

export const getUsers = (): User[] => {
  const data = localStorage.getItem(KEYS.USERS);
  if (!data) {
    localStorage.setItem(KEYS.USERS, JSON.stringify([DEFAULT_ADMIN]));
    return [DEFAULT_ADMIN];
  }
  return JSON.parse(data);
};

export const saveUser = (user: User) => {
  const users = getUsers();
  // Check if exists
  const exists = users.find(u => u.username === user.username);
  if (exists) return false;
  
  users.push(user);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  return true;
};

export const deleteUser = (id: string) => {
  const users = getUsers().filter(u => u.id !== id);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

// --- Helpers ---
export const calculateNetProfit = (order: Order): number => {
  if (order.status === OrderStatus.RETURNED) {
    // Return Loss = Packaging + Delivery + Ad Cost share + (Management Share if applicable)
    // Usually return means we lost the shipping and packaging and the ad money spent to get that lead.
    return -(order.packagingCost + order.deliveryCost + order.adCost);
  }
  if (order.status === OrderStatus.CANCELLED) return 0;

  const totalCost = order.purchaseCost + order.packagingCost + order.deliveryCost + order.adCost + order.managementCost;
  return order.salePrice - totalCost;
};

// Simple color generator for Page Names
export const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};
