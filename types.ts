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
