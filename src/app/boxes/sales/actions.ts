"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEAL_STAGES, type DealStage } from "@/lib/types";

function redirectWithMessage(path: string, kind: "msg" | "error", text: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(text)}`);
}

async function requireAccess() {
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

  return { supabase, userId: user.id, profile };
}

function parseStage(value: FormDataEntryValue | null): DealStage {
  const stage = String(value ?? "");
  if (!DEAL_STAGES.includes(stage as DealStage)) {
    throw new Error("ステージの値が不正です");
  }
  return stage as DealStage;
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const amount = Number(raw);
  if (Number.isNaN(amount)) {
    throw new Error("金額は数値で入力してください");
  }
  return amount;
}

export async function createDeal(formData: FormData) {
  const { supabase, userId } = await requireAccess();

  const companyId = String(formData.get("company_id") ?? "").trim();
  if (!companyId) {
    redirectWithMessage("/boxes/sales", "error", "会社が特定できません");
  }
  const listPath = `/boxes/sales?company_id=${companyId}`;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirectWithMessage(listPath, "error", "案件名を入力してください");
  }

  const { error } = await supabase.from("deals").insert({
    company_id: companyId,
    name,
    customer_name: String(formData.get("customer_name") ?? "").trim() || null,
    acquisition_channel: String(formData.get("acquisition_channel") ?? "").trim() || null,
    owner_name: String(formData.get("owner_name") ?? "").trim() || null,
    stage: parseStage(formData.get("stage")),
    amount: parseAmount(formData.get("amount")),
    next_action: String(formData.get("next_action") ?? "").trim() || null,
    created_by: userId,
  });

  if (error) {
    redirectWithMessage(listPath, "error", error.message);
  }

  revalidatePath("/boxes/sales");
  redirectWithMessage(listPath, "msg", `「${name}」を追加しました`);
}

export async function updateDeal(formData: FormData) {
  const { supabase } = await requireAccess();

  const dealId = String(formData.get("deal_id") ?? "").trim();
  if (!dealId) {
    redirectWithMessage("/boxes/sales", "error", "案件が指定されていません");
  }
  const detailPath = `/boxes/sales/${dealId}`;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirectWithMessage(detailPath, "error", "案件名を入力してください");
  }

  const { error } = await supabase
    .from("deals")
    .update({
      name,
      customer_name: String(formData.get("customer_name") ?? "").trim() || null,
      acquisition_channel: String(formData.get("acquisition_channel") ?? "").trim() || null,
      owner_name: String(formData.get("owner_name") ?? "").trim() || null,
      stage: parseStage(formData.get("stage")),
      amount: parseAmount(formData.get("amount")),
      next_action: String(formData.get("next_action") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);

  if (error) {
    redirectWithMessage(detailPath, "error", error.message);
  }

  revalidatePath(detailPath);
  revalidatePath("/boxes/sales");
  redirectWithMessage(detailPath, "msg", "案件情報を保存しました");
}

export async function deleteDeal(formData: FormData) {
  const { supabase } = await requireAccess();

  const dealId = String(formData.get("deal_id") ?? "").trim();
  if (!dealId) {
    redirectWithMessage("/boxes/sales", "error", "案件が指定されていません");
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("company_id, name")
    .eq("id", dealId)
    .single();

  if (!deal) {
    redirectWithMessage("/boxes/sales", "error", "案件が見つかりません");
  }

  const listPath = `/boxes/sales?company_id=${deal.company_id}`;

  const { error } = await supabase.from("deals").delete().eq("id", dealId);
  if (error) {
    redirectWithMessage(listPath, "error", error.message);
  }

  revalidatePath("/boxes/sales");
  redirectWithMessage(listPath, "msg", `「${deal.name}」を削除しました`);
}

export async function addDealLog(formData: FormData) {
  const { supabase, userId } = await requireAccess();

  const dealId = String(formData.get("deal_id") ?? "").trim();
  if (!dealId) {
    redirectWithMessage("/boxes/sales", "error", "案件が指定されていません");
  }
  const detailPath = `/boxes/sales/${dealId}`;

  const loggedAt = String(formData.get("logged_at") ?? "").trim();
  if (!loggedAt) {
    redirectWithMessage(detailPath, "error", "日付を入力してください");
  }

  const handledBy = String(formData.get("handled_by") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const stage = parseStage(formData.get("stage"));

  const { error: logError } = await supabase.from("deal_logs").insert({
    deal_id: dealId,
    logged_at: loggedAt,
    handled_by: handledBy || null,
    content: content || null,
    stage,
    created_by: userId,
  });

  if (logError) {
    redirectWithMessage(detailPath, "error", logError.message);
  }

  const { error: updateError } = await supabase
    .from("deals")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (updateError) {
    redirectWithMessage(detailPath, "error", updateError.message);
  }

  revalidatePath(detailPath);
  revalidatePath("/boxes/sales");
  redirectWithMessage(detailPath, "msg", "進捗ログを追加しました");
}
