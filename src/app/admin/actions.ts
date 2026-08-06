"use server";

import { revalidatePath } from "next/cache";
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

export async function createCompany(formData: FormData) {
  await requireMellowAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("会社名を入力してください");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({ name });
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
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
    throw new Error("氏名とメールアドレスを入力してください");
  }
  if (role === "company_user" && !companyId) {
    throw new Error("利用者には会社の選択が必要です");
  }

  const admin = createAdminClient();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID(),
    });

  if (createError || !created.user) {
    throw new Error(createError?.message ?? "ユーザー作成に失敗しました");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    company_id: role === "mellow_admin" ? null : companyId,
    role,
    name,
    email,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: resetError } = await admin.auth.resetPasswordForEmail(email);
  if (resetError) {
    throw new Error(resetError.message);
  }

  revalidatePath("/admin");
}
