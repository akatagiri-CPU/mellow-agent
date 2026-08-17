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
  sfa_url: string | null;
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

export type InterviewAxisKey =
  | "responsiveness"
  | "integrity"
  | "accountability"
  | "ownership"
  | "empathetic_communication"
  | "team_elevation";

export type InterviewAxis = {
  key: InterviewAxisKey;
  label: string;
  description: string;
};

// 面接前サポートの評価軸。事実を見抜く質問を1〜2個ずつ提案する対象。
export const INTERVIEW_AXES: InterviewAxis[] = [
  {
    key: "responsiveness",
    label: "即応力",
    description: "その場で筋の通った回答を出せるか",
  },
  {
    key: "integrity",
    label: "誠実さ・整合性",
    description: "一貫しているか、その場凌ぎでないか",
  },
  {
    key: "accountability",
    label: "自責性・当事者意識",
    description: "原因を自分に向けられるか",
  },
  {
    key: "ownership",
    label: "オーナーシップ",
    description: "仕事を取りに行くか、渡されて動くか",
  },
  {
    key: "empathetic_communication",
    label: "相手視点のコミュニケーション",
    description: "自分本位でなく、相手にどう伝わるかを意識できるか",
  },
  {
    key: "team_elevation",
    label: "周囲を高める力",
    description: "周りを引き上げるか、受け身で終わるか",
  },
];

export type AxisQuestions = {
  key: InterviewAxisKey;
  questions: string[];
};

export type PreInterviewAnalysis = {
  strengths: string[];
  concerns: string[];
  blank_spots: string[];
  axis_questions: AxisQuestions[];
};

export type Candidate = {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  status: CandidateStatus;
  resume_text: string;
  ai_strengths: string[] | null;
  ai_concerns: string[] | null;
  ai_blank_spots: string[] | null;
  ai_axis_questions: AxisQuestions[] | null;
  ai_analyzed_at: string | null;
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
    description: "履歴書・職務経歴書から特性を言語化し、面接前サポート・採点を行います",
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
