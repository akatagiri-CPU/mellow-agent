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

export type CandidateStatus =
  | "applied"
  | "interviewing"
  | "offered"
  | "hired"
  | "rejected";

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  applied: "応募",
  interviewing: "面接中",
  offered: "内定",
  hired: "入社",
  rejected: "不採用",
};

export type Candidate = {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  status: CandidateStatus;
  resume_text: string;
  ai_trait_summary: string[] | null;
  ai_interview_questions: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidateScore = {
  id: string;
  candidate_id: string;
  scorer_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  scorer: { name: string } | null;
};

export type Box = {
  id: string;
  label: string;
  description: string;
};

export const BOXES: Box[] = [
  {
    id: "recruitment",
    label: "採用管理",
    description: "履歴書・職務経歴書から特性を言語化し、面接質問の支援・採点を行います",
  },
  {
    id: "talent",
    label: "人材管理",
    description: "候補者・在籍中・退職済みを一元管理し、評価を蓄積、昇進基準・成長を定量化します",
  },
  {
    id: "sales",
    label: "営業管理",
    description: "案件・進捗・実績・行動量・商談の質を可視化します",
  },
  {
    id: "training",
    label: "教育",
    description: "製品情報・ナレッジ、受注率の高い商談を蓄積します",
  },
  {
    id: "daily-reports",
    label: "日報・行動ログ",
    description: "訪問件数・商談件数・行動内容を自動で共有します",
  },
  {
    id: "dashboard",
    label: "経営ダッシュボード",
    description: "全データを一画面で俯瞰します",
  },
];
