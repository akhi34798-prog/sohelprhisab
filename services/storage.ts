import { Order, User, UserRole, CostTemplate, OrderStatus, DailyAnalysisData, AnalysisRow } from '../types';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  ORDERS: 'ecpm_orders',
  USERS: 'ecpm_users',
  TEMPLATES: 'ecpm_templates',
  ANALYSIS: 'ecpm_analysis',
  PAGE_NAMES: 'ecpm_page_names',
  PRODUCT_NAMES: 'ecpm_product_names',
};

// --- Page & Product Names Management ---
export const getPageNames = (): string[] => {
  const data = localStorage.getItem(KEYS.PAGE_NAMES);
  return data ? JSON.parse(data) : ['Page A', 'Page B', 'Health Zone'];
};

export const savePageName = (name: string) => {
  const list = getPageNames();
  if (!list.includes(name) && name.trim() !== '') {
    list.push(name.trim());
    localStorage.setItem(KEYS.PAGE_NAMES, JSON.stringify(list));
  }
};

export const deletePageName = (name: string) => {
  const list = getPageNames().filter(n => n !== name);
  localStorage.setItem(KEYS.PAGE_NAMES, JSON.stringify(list));
};

export const getProductNames = (): string[] => {
  const data = localStorage.getItem(KEYS.PRODUCT_NAMES);
  return data ? JSON.parse(data) : ['Product 1', 'Combo A'];
};

export const saveProductName = (name: string) => {
  const list = getProductNames();
  if (!list.includes(name) && name.trim() !== '') {
    list.push(name.trim());
    localStorage.setItem(KEYS.PRODUCT_NAMES, JSON.stringify(list));
  }
};

export const deleteProductName = (name: string) => {
  const list = getProductNames().filter(n => n !== name);
  localStorage.setItem(KEYS.PRODUCT_NAMES, JSON.stringify(list));
};

// --- Orders (Legacy / Simple List) ---
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

// --- Profit Analysis Sheet ---
export const getAnalysisData = (): DailyAnalysisData[] => {
  const data = localStorage.getItem(KEYS.ANALYSIS);
  return data ? JSON.parse(data) : [];
};

export const saveAnalysisData = (data: DailyAnalysisData) => {
  const allData = getAnalysisData();
  const filtered = allData.filter(d => d.date !== data.date);
  filtered.push(data);
  localStorage.setItem(KEYS.ANALYSIS, JSON.stringify(filtered));
};

export const getAnalysisByDate = (date: string): DailyAnalysisData | null => {
  const all = getAnalysisData();
  return all.find(d => d.date === date) || null;
};

// --- CENTRAL CALCULATION ENGINE ---
export const recalculateDailyFinancials = (dayData: DailyAnalysisData): DailyAnalysisData => {
    const totalDailyOrders = dayData.rows.reduce((sum, r) => sum + r.totalOrders, 0);
    
    // Global Averages (Total Daily Cost / Total Daily Orders)
    // This ensures that as orders increase, the per-unit cost of management decreases
    const avgMgmt = totalDailyOrders > 0 ? dayData.totalMgmtSalary / totalDailyOrders : 0;
    const avgOffice = totalDailyOrders > 0 ? dayData.totalOfficeCost / totalDailyOrders : 0;
    const avgBonus = totalDailyOrders > 0 ? dayData.totalDailyBonus / totalDailyOrders : 0;

    const updatedRows = dayData.rows.map(row => {
        const returnCount = Math.round((row.totalOrders * row.returnPercent) / 100);
        const deliveredCount = row.totalOrders - returnCount;
        const effectiveRate = row.dollarRate || dayData.dollarRate;

        // 1. Operational Costs (On ALL items)
        // Ad & Page Salary are stored as 'pageTotalAdDollar' and 'pageTotalSalary' for this specific batch.
        // We convert Ad Dollar to Tk using the rate.
        const totalAdTk = row.pageTotalAdDollar * effectiveRate;
        
        // Total Ops for this batch = Ad + Salary + (Global Shares * Qty) + Logistics
        const totalOps = totalAdTk + row.pageTotalSalary + 
                         (avgMgmt * row.totalOrders) + 
                         (avgOffice * row.totalOrders) + 
                         (avgBonus * row.totalOrders) + 
                         (row.deliveryCharge * row.totalOrders) + 
                         (row.packagingCost * row.totalOrders);

        // 2. COD (Delivered Only)
        const unitCod = (row.salePrice * row.codChargePercent) / 100;
        const totalCod = unitCod * deliveredCount;

        // 3. Purchase (Delivered Only)
        const totalPurchase = row.purchaseCost * deliveredCount;

        // 4. Revenue
        const totalRevenue = row.salePrice * deliveredCount;

        // 5. Net Profit
        const netProfit = totalRevenue - totalPurchase - totalOps - totalCod - row.haziraBonus;
        
        // Return Loss (Ops wasted on returns)
        const unitOps = row.totalOrders > 0 ? totalOps / row.totalOrders : 0;
        const returnLoss = unitOps * returnCount;

        return {
            ...row,
            calculatedNetProfit: netProfit,
            calculatedReturnLoss: returnLoss,
            calculatedTotalSales: totalRevenue
        };
    });

    const summary = {
        totalProfit: updatedRows.reduce((s, r) => s + (r.calculatedNetProfit || 0), 0),
        totalOrders: totalDailyOrders,
        totalReturnLoss: updatedRows.reduce((s, r) => s + (r.calculatedReturnLoss || 0), 0),
        totalDelivered: updatedRows.reduce((s, r) => s + (r.totalOrders - Math.round(r.totalOrders * r.returnPercent / 100)), 0),
        totalSales: updatedRows.reduce((s, r) => s + (r.calculatedTotalSales || 0), 0)
    };

    return { ...dayData, rows: updatedRows, summary };
};

// Helper to append batch rows to existing day data
export const appendAnalysisRows = (date: string, newRows: AnalysisRow[], globalUpdates: Partial<DailyAnalysisData>) => {
  let allData = getAnalysisData();
  let dayData = allData.find(d => d.date === date);

  if (!dayData) {
      dayData = {
          id: uuidv4(),
          date: date,
          dollarRate: globalUpdates.dollarRate || 120,
          totalMgmtSalary: globalUpdates.totalMgmtSalary || 0,
          totalOfficeCost: globalUpdates.totalOfficeCost || 0,
          totalDailyBonus: globalUpdates.totalDailyBonus || 0,
          rows: []
      };
  } else {
      // Update globals if provided values are non-zero or explicitly intended (we assume entry form values override)
      if (globalUpdates.dollarRate) dayData.dollarRate = globalUpdates.dollarRate;
      if (globalUpdates.totalMgmtSalary !== undefined) dayData.totalMgmtSalary = globalUpdates.totalMgmtSalary;
      if (globalUpdates.totalOfficeCost !== undefined) dayData.totalOfficeCost = globalUpdates.totalOfficeCost;
      if (globalUpdates.totalDailyBonus !== undefined) dayData.totalDailyBonus = globalUpdates.totalDailyBonus;
  }

  // Merge new rows
  dayData.rows = [...dayData.rows, ...newRows];
  
  // Recalculate everything to distribute globals correctly across OLD and NEW rows
  const calculatedDay = recalculateDailyFinancials(dayData);
  
  // Re-save entire structure
  const otherDays = allData.filter(d => d.date !== date);
  otherDays.push(calculatedDay);
  localStorage.setItem(KEYS.ANALYSIS, JSON.stringify(otherDays));
  
  return calculatedDay;
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
    return -(order.packagingCost + order.deliveryCost + order.adCost);
  }
  if (order.status === OrderStatus.CANCELLED) return 0;

  const totalCost = order.purchaseCost + order.packagingCost + order.deliveryCost + order.adCost + order.managementCost;
  return order.salePrice - totalCost;
};

export const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};