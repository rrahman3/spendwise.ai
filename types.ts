
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
  source: 'scan' | 'csv';
  status: 'processed' | 'pending_review';
  originalReceiptId?: string; // The ID of the receipt it is a duplicate of
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

export type View = 'dashboard' | 'scan' | 'history' | 'items' | 'chat' | 'profile' | 'upload' | 'review';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
