
export enum OutboundType {
  SELF = '自用',
  KIDS = '孩子用',
  LOANED = '借出',
  SOLD = '售出',
  OTHER = '其他'
}

export enum InboundMethod {
  AUTO_ORDER = '自动订货',
  SINGLE_ORDER = '单次订货',
  GIFT = '赠品',
  OTHER = '其他'
}

export interface Product {
  id: string;
  name: string;
  category: string;
  defaultPrice: number;
  currency: 'AUD' | 'CNY';
}

export interface InventoryItem extends Product {
  currentPrice: number;
  stockQuantity: number;
  threshold: number;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  date: string;
  quantity: number;
  price: number;
  currency: 'AUD' | 'CNY';
  type: 'inbound' | 'outbound';
  detail: string; 
  note?: string; 
}

export interface AppData {
  inventory: Record<string, InventoryItem>;
  transactions: Transaction[];
  exchangeRate: number;
}

export interface CloudConfig {
  supabaseUrl: string;
  supabaseKey: string;
  isEnabled: boolean;
  lastSyncedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarColor: string;
  lastSync?: string;
}

export interface GlobalState {
  currentProfileId: string;
  profiles: Record<string, UserProfile>;
  data: Record<string, AppData>;
  cloudConfig?: CloudConfig;
}
