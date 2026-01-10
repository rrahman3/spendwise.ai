
export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
  subcategory?: string;
  details?: string;
}

export interface Receipt {
  id: string;
  storeName: string;
  date: string;
  type?: 'purchase' | 'refund';
  total: number;
  items: ReceiptItem[];
  currency: string;
  rawText?: string;
  imageUrl?: string;
  createdAt: number;
  time?: string;
  storeLocation?: string;
  hash?: string;
  source: 'scan' | 'csv' | 'manual';
  status: 'processed' | 'pending_review' | 'deleted';
  originalReceiptId?: string; // The ID of the receipt it is a duplicate of
  deletedAt?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  totalSpent: number;
  receiptCount: number;
  isAuthenticated: boolean;
  plan?: 'free' | 'pro';
}

export type View = 'dashboard' | 'scan' | 'history' | 'items' | 'stores' | 'chat' | 'profile' | 'upload' | 'review';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
