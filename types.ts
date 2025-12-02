
export enum UserRole {
  ADMIN = 'ADMIN',
  ENTRY_OPERATOR = 'ENTRY_OPERATOR',
  VIEWER = 'VIEWER'
}

export interface User {
  id: string;
  username: string;
  password: string; // In a real app, hash this.
  role: UserRole;
  permissions: string[];
}

export interface SavedProduct {
  id: string;
  name: string;
  defaultSalePrice: number;
  defaultBuyPrice: number;
}

export enum OrderStatus {
  PENDING = 'Pending',
  DELIVERED = 'Delivered',
  RETURNED = 'Returned',
  CANCELLED = 'Cancelled'
}

export interface Order {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  pageName: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  
  // Financials
  salePrice: number;
  purchaseCost: number;
  packagingCost: number;
  deliveryCost: number;
  
  // Distributed Global Costs (calculated at entry)
  adCost: number; 
  managementCost: number; // Salary + Office Rent share
  
  status: OrderStatus;
  note?: string;
}

export interface CostTemplate {
  id: string;
  name: string;
  pageName: string;
  packagingCost: number;
  deliveryCost: number;
  productName?: string;
  purchaseCost?: number;
}

export interface GlobalDailyCost {
  date: string;
  adSpendDollar: number;
  dollarRate: number;
  adSpendBDT: number;
  officeRent: number;
  salaries: number;
  miscCost: number;
}

// --- New Interfaces for Profit Analysis Sheet ---

export interface AnalysisRow {
  id: string;
  pageName: string;
  productName: string;
  
  // Manual Inputs
  totalOrders: number;
  returnPercent: number; // e.g., 20 for 20%
  courierCancelPercent: number;
  
  salePrice: number;
  purchaseCost: number; // Maler dam
  
  // Ad Costs
  pageTotalAdDollar: number; // The dollar amount allocated to this row (product batch)
  dollarRate: number; // Specific rate for this entry
  
  pageTotalSalary: number; // Salary allocated to this row
  
  deliveryCharge: number;
  packagingCost: number;
  
  haziraBonus: number; // Manual adjustment
  codChargePercent: number; // Usually 1%

  // Cached Calculations (saved for Dashboard)
  calculatedNetProfit?: number;
  calculatedReturnLoss?: number;
  calculatedTotalSales?: number;
}

export interface DailyAnalysisData {
  id: string;
  date: string;
  
  // Global Daily Inputs
  dollarRate: number; // Fallback/Global
  totalMgmtSalary: number; // Office total salary
  totalOfficeCost: number; // Rent + Misc
  totalDailyBonus: number; // Office wide bonus
  
  rows: AnalysisRow[];

  // Daily Summary (Cached)
  summary?: {
    totalProfit: number;
    totalOrders: number;
    totalReturnLoss: number;
    totalDelivered: number;
    totalSales: number;
  };
}
