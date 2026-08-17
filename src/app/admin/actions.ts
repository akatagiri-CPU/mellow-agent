"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireMellowAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "mellow_admin") {
    throw new Error("管理者権限が必要です");
  }
}

function redirectWithMessage(kind: "msg" | "error", text: string): never {
  redirect(`/admin?${kind}=${encodeURIComponent(text)}`);
}

export async function createCompany(formData: FormData) {
  await requireMellowAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirectWithMessage("error", "会社名を入力してください");
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    redirectWithMessage("error", `「${name}」は既に登録されています`);
  }

  const { error } = await supabase.from("companies").insert({ name });
  if (error) {
    if (error.code === "23505") {
      redirectWithMessage("error", `「${name}」は既に登録されています`);
    }
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/admin");
  redirectWithMessage("msg", `「${name}」を追加しました`);
}

export async function deleteCompany(formData: FormData) {
  await requireMellowAdmin();

  const companyId = String(formData.get("company_id") ?? "").trim();
  if (!companyId) {
    redirectWithMessage("error", "会社が指定されていません");
  }

  const supabase = await createClient();

  const { count: profileCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (profileCount && profileCount > 0) {
    redirectWithMessage(
      "error",
      "この会社には利用者が登録されているため削除できません。先に利用者を削除してください。",
    );
  }

  const { count: candidateCount } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (candidateCount && candidateCount > 0) {
    redirectWithMessage(
      "error",
      "この会社には採用管理のデータが登録されているため削除できません。",
    );
  }

  const { error } = await supabase.from("companies").delete().eq("id", companyId);
  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/admin");
  redirectWithMessage("msg", "会社を削除しました");
}

export async function updateCompanySfaUrl(formData: FormData) {
  await requireMellowAdmin();

  const companyId = String(formData.get("company_id") ?? "").trim();
  const sfaUrl = String(formData.get("sfa_url") ?? "").trim();

  if (!companyId) {
    redirectWithMessage("error", "会社が指定されていません");
  }
  if (sfaUrl) {
    try {
      new URL(sfaUrl);
    } catch {
      redirectWithMessage("error", "SFAのURLの形式が不正です");
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ sfa_url: sfaUrl || null })
    .eq("id", companyId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/boxes/sales");
  redirectWithMessage("msg", "SFAのURLを保存しました");
}

export async function createUser(formData: FormData) {
  await requireMellowAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const companyId = String(formData.get("company_id") ?? "").trim();
  const role = String(formData.get("role") ?? "company_user") as
    | "mellow_admin"
    | "company_user";

  if (!name || !email) {
    redirectWithMessage("error", "氏名とメールアドレスを入力してください");
  }
  if (role === "company_user" && !companyId) {
    redirectWithMessage("error", "利用者には会社の選択が必要です");
  }

  const admin = createAdminClient();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID(),
    });

  if (createError || !created.user) {
    redirectWithMessage("error", createError?.message ?? "ユーザー作成に失敗しました");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    company_id: role === "mellow_admin" ? null : companyId,
    role,
    name,
    email,
  });

  if (profileError) {
    redirectWithMessage("error", profileError.message);
  }

  const { error: resetError } = await admin.auth.resetPasswordForEmail(email);
  if (resetError) {
    redirectWithMessage("error", resetError.message);
  }

  revalidatePath("/admin");
  redirectWithMessage("msg", `「${name}」を追加しました`);
}
