"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { analyzeCandidateResume } from "@/lib/anthropic";
import type { CandidateStatus } from "@/lib/types";

async function requireCompanyProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) {
    throw new Error("会社に所属するアカウントでのみ利用できます");
  }

  return { supabase, userId: user.id, companyId: profile.company_id };
}

export async function createCandidate(formData: FormData) {
  const { supabase, userId, companyId } = await requireCompanyProfile();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const resumeText = String(formData.get("resume_text") ?? "").trim();

  if (!name) {
    throw new Error("氏名を入力してください");
  }

  const { error } = await supabase.from("candidates").insert({
    company_id: companyId,
    name,
    email: email || null,
    resume_text: resumeText,
    created_by: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/boxes/recruitment");
}

export async function generateAnalysis(candidateId: string) {
  const { supabase } = await requireCompanyProfile();

  const { data: candidate, error: fetchError } = await supabase
    .from("candidates")
    .select("resume_text")
    .eq("id", candidateId)
    .single();

  if (fetchError || !candidate) {
    throw new Error("候補者が見つかりません");
  }
  if (!candidate.resume_text.trim()) {
    throw new Error("履歴書・職務経歴書のテキストが未入力です");
  }

  const analysis = await analyzeCandidateResume(candidate.resume_text);

  const { error: updateError } = await supabase
    .from("candidates")
    .update({
      ai_trait_summary: analysis.trait_summary,
      ai_interview_questions: analysis.interview_questions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(`/boxes/recruitment/${candidateId}`);
}

export async function addScore(formData: FormData) {
  const { supabase, userId } = await requireCompanyProfile();

  const candidateId = String(formData.get("candidate_id") ?? "");
  const score = Number(formData.get("score"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!candidateId || !Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error("採点は1〜5の整数で入力してください");
  }

  const { error } = await supabase.from("candidate_scores").insert({
    candidate_id: candidateId,
    scorer_id: userId,
    score,
    comment: comment || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/boxes/recruitment/${candidateId}`);
}

export async function updateStatus(candidateId: string, status: CandidateStatus) {
  const { supabase } = await requireCompanyProfile();

  const { error } = await supabase
    .from("candidates")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", candidateId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/boxes/recruitment/${candidateId}`);
  revalidatePath("/boxes/recruitment");
}
