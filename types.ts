
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

export interface DataVersion {
  id: string;
  versionTag: string;
  timestamp: string;
  description: string;
  data: AppData;
  codeVersion: string; // 记录生成此备份时的代码版本
}

export interface SystemUpdateLog {
  version: string;
  date: string;
  changes: string[];
}

export interface CloudConfig {
  supabaseUrl: string;
  supabaseKey: string;
  isEnabled: boolean;
  lastSyncedAt?: string;
  currentVersion: string;
}

export interface UserAccount {
  username: string;
  passwordHash: string;
  displayName: string;
  avatarColor: string;
}

export interface GlobalState {
  currentUser?: string;
  accounts: Record<string, UserAccount>;
  userStore: Record<string, {
    current: AppData;
    history: DataVersion[];
    versionCounter: number;
  }>;
  cloudConfig: CloudConfig;
  lastKnownCodeVersion: string; // 上一次运行的代码版本
  systemLogs: SystemUpdateLog[]; // 代码版本演进记录
}