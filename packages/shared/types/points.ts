export interface PointsBalance {
  balance: number;
  recentTransactions: PointTransactionItem[];
}

export interface PointTransactionItem {
  id: string;
  type: "credit" | "debit" | "refund";
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export interface RechargeRequest {
  amount: number;
  orderNo: string;
}

export interface RechargeItem {
  id: string;
  amount: number;
  points: number;
  orderNo: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface PendingRecharge {
  id: string;
  userPhone: string;
  amount: number;
  points: number;
  orderNo: string;
  createdAt: string;
}
