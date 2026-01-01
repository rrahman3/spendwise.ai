
export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
  subcategory?: string;
}

export interface Receipt {
  id: string;
  storeName: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  currency: string;
  rawText?: string;
  imageUrl?: string;
  createdAt: number;
  time?: string;
  hash?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  totalSpent: number;
  receiptCount: number;
  isAuthenticated: boolean;
}

export type View = 'dashboard' | 'scan' | 'history' | 'items' | 'chat' | 'profile';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
