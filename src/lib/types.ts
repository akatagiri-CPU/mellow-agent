export type UserRole = "mellow_admin" | "company_user";

export type Profile = {
  id: string;
  company_id: string | null;
  role: UserRole;
  name: string;
  email: string;
  created_at: string;
};

export type Company = {
  id: string;
  name: string;
  created_at: string;
};

export type Box = {
  id: string;
  label: string;
  description: string;
};

export const BOXES: Box[] = [
  { id: "deals", label: "商談記録", description: "商談の記録を管理します" },
  { id: "scoring", label: "採点", description: "商談内容を採点します" },
  { id: "training", label: "教育", description: "教育コンテンツを管理します" },
  { id: "daily-reports", label: "日報", description: "日報を作成・確認します" },
  { id: "reports", label: "報告", description: "レポートを作成・確認します" },
];
