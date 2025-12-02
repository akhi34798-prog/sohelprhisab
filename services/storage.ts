
import { Order, User, UserRole, CostTemplate, OrderStatus, DailyAnalysisData, AnalysisRow, SavedProduct } from '../types';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  ORDERS: 'ecpm_orders',
  USERS: 'ecpm_users',
  TEMPLATES: 'ecpm_templates',
  ANALYSIS: 'ecpm_analysis',
  PAGE_NAMES: 'ecpm_page_names',
  SAVED_PRODUCTS: 'ecpm_saved_products_v2', 
};

// --- Page Names Management ---
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

// --- Product Management (With Prices) ---
export const getSavedProducts = (): SavedProduct[] => {
  const data = localStorage.getItem(KEYS.SAVED_PRODUCTS);
  if (data) return JSON.parse(data);
  return [
    { id: '1', name: 'Product 1', defaultBuyPrice: 50, defaultSalePrice: 1200 },
    { id: '2', name: 'Combo A', defaultBuyPrice: 120, defaultSalePrice: 1500 }
  ];
};

export const saveSavedProduct = (product: SavedProduct) => {
  const list = getSavedProducts();
  const index = list.findIndex(p => p.name.toLowerCase() === product.name.toLowerCase());
  
  if (index >= 0) {
      list[index] = { ...list[index], ...product };
  } else {
      list.push(product);
  }
  localStorage.setItem(KEYS.SAVED_PRODUCTS, JSON.stringify(list));
};

export const deleteSavedProduct = (id: string) => {
  const list = getSavedProducts().filter(p => p.id !== id);
  localStorage.setItem(KEYS.SAVED_PRODUCTS, JSON.stringify(list));
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

// Helper to clean potential string inputs to safe numbers
const cleanNumber = (val: any): number => {
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'number') return val;
    return 0;
};

// --- CENTRAL CALCULATION ENGINE ---
export const recalculateDailyFinancials = (dayData: DailyAnalysisData): DailyAnalysisData => {
    // 1. GLOBAL DISTRIBUTION (Mgmt, Office, Bonus)
    // Distributed based on TOTAL DAILY ORDERS (Sum of all pages)
    // CRITICAL: Force strict Number type to prevent string concatenation logic errors
    const totalDailyOrders = dayData.rows.reduce((sum, r) => sum + cleanNumber(r.totalOrders), 0);
    
    // Global Unit Costs
    const unitMgmt = totalDailyOrders > 0 ? cleanNumber(dayData.totalMgmtSalary) / totalDailyOrders : 0;
    const unitOffice = totalDailyOrders > 0 ? cleanNumber(dayData.totalOfficeCost) / totalDailyOrders : 0;
    const unitBonus = totalDailyOrders > 0 ? cleanNumber(dayData.totalDailyBonus) / totalDailyOrders : 0;

    // 2. PAGE LEVEL DISTRIBUTION (Ad, Page Salary)
    const pageAggregates = new Map<string, { totalOrders: number; totalAdDollar: number; totalSalary: number }>();

    // First pass: Aggregate totals per page
    dayData.rows.forEach(r => {
        if (!pageAggregates.has(r.pageName)) {
            pageAggregates.set(r.pageName, { totalOrders: 0, totalAdDollar: 0, totalSalary: 0 });
        }
        const agg = pageAggregates.get(r.pageName)!;
        agg.totalOrders += cleanNumber(r.totalOrders);
        agg.totalAdDollar += cleanNumber(r.pageTotalAdDollar); 
        agg.totalSalary += cleanNumber(r.pageTotalSalary);
    });

    // 3. ROW CALCULATION
    const updatedRows = dayData.rows.map(row => {
        const tOrders = cleanNumber(row.totalOrders);
        const returnCount = Math.round((tOrders * cleanNumber(row.returnPercent)) / 100);
        const deliveredCount = tOrders - returnCount;
        
        // --- Distribute Page Costs ---
        const agg = pageAggregates.get(row.pageName)!;
        
        let distributedAdDollar = 0;
        let distributedSalary = 0;

        // Formula: (Total Page Cost / Total Page Orders) * Row Orders
        if (agg && agg.totalOrders > 0) {
           const weight = tOrders / agg.totalOrders;
           distributedAdDollar = agg.totalAdDollar * weight;
           distributedSalary = agg.totalSalary * weight;
        } else {
           // Fallback for Cost-Only rows (0 orders)
           distributedAdDollar = cleanNumber(row.pageTotalAdDollar);
           distributedSalary = cleanNumber(row.pageTotalSalary);
        }

        const effectiveRate = cleanNumber(row.dollarRate) || cleanNumber(dayData.dollarRate);
        const totalAdTk = distributedAdDollar * effectiveRate; 

        // --- Distribute Global Costs ---
        const totalMgmt = unitMgmt * tOrders;
        const totalOffice = unitOffice * tOrders;
        const totalBonus = unitBonus * tOrders;
        
        // --- Other Direct Costs ---
        const totalDelivery = cleanNumber(row.deliveryCharge) * tOrders;
        const totalPacking = cleanNumber(row.packagingCost) * tOrders;

        // --- COD ---
        const unitCod = (cleanNumber(row.salePrice) * cleanNumber(row.codChargePercent)) / 100;
        const totalCod = unitCod * deliveredCount;

        // --- Operational Cost Per Unit (For Return Loss) ---
        // Ops Cost = Ad + Sal + Mgmt + Office + Bonus + Del + Pack
        const totalOpsForBatch = totalAdTk + distributedSalary + totalMgmt + totalOffice + totalBonus + totalDelivery + totalPacking;
        const unitOpsCost = tOrders > 0 ? totalOpsForBatch / tOrders : 0;
        
        // COD per unit (nominal)
        const nominalUnitCod = (cleanNumber(row.salePrice) * cleanNumber(row.codChargePercent)) / 100;

        // --- Return Loss (Total Return Tk) ---
        // Includes COD lost and Ops cost lost on returned items
        const totalReturnLoss = (unitOpsCost + nominalUnitCod) * returnCount;

        // --- COGS (Maler Dam) ---
        // Delivered COGS (Expense)
        const cogsExpense = cleanNumber(row.purchaseCost) * deliveredCount; 
        
        // --- TOTAL COST (For Calculation) ---
        // Expenses = Purchase(Delivered) + Ops(All) + COD(Delivered) + Misc
        const totalCost = cogsExpense + totalOpsForBatch + totalCod + (cleanNumber(row.haziraBonus) || 0);

        // --- Revenue ---
        const totalRevenue = cleanNumber(row.salePrice) * deliveredCount;

        // --- Net Profit ---
        const netProfit = totalRevenue - totalCost;

        return {
            ...row,
            totalOrders: tOrders, 
            purchaseCost: cleanNumber(row.purchaseCost),
            salePrice: cleanNumber(row.salePrice),
            returnPercent: cleanNumber(row.returnPercent),
            
            pageTotalAdDollar: distributedAdDollar,
            pageTotalSalary: distributedSalary,
            calculatedNetProfit: netProfit,
            calculatedReturnLoss: totalReturnLoss,
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
          dollarRate: Number(globalUpdates.dollarRate) || 126,
          totalMgmtSalary: Number(globalUpdates.totalMgmtSalary) || 0,
          totalOfficeCost: Number(globalUpdates.totalOfficeCost) || 0,
          totalDailyBonus: Number(globalUpdates.totalDailyBonus) || 0,
          rows: []
      };
  } else {
      if (globalUpdates.dollarRate) dayData.dollarRate = Number(globalUpdates.dollarRate);
      if (globalUpdates.totalMgmtSalary !== undefined) dayData.totalMgmtSalary = Number(globalUpdates.totalMgmtSalary);
      if (globalUpdates.totalOfficeCost !== undefined) dayData.totalOfficeCost = Number(globalUpdates.totalOfficeCost);
      if (globalUpdates.totalDailyBonus !== undefined) dayData.totalDailyBonus = Number(globalUpdates.totalDailyBonus);
  }

  dayData.rows = [...dayData.rows, ...newRows];
  const calculatedDay = recalculateDailyFinancials(dayData);
  
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
