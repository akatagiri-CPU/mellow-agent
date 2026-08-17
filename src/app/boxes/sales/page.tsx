import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export default async function SalesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const header = (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          ← 箱一覧
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">営業管理</h1>
      </div>
      <SignOutButton />
    </header>
  );

  if (!profile?.company_id) {
    return (
      <div className="min-h-screen bg-gray-50">
        {header}
        <main className="mx-auto max-w-4xl px-6 py-24 text-center text-gray-500">
          MELLOWスタッフアカウントでは営業管理をご利用いただけません。
          <br />
          会社に所属する利用者アカウントでログインしてください。
        </main>
      </div>
    );
  }

  const { data: company } = await supabase
    .from("companies")
    .select("sfa_url")
    .eq("id", profile.company_id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      {header}

      <main className="mx-auto max-w-4xl px-6 py-10">
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-base font-semibold text-gray-900">SFA（案件管理シート）</h2>

          {company?.sfa_url ? (
            <a
              href={company.sfa_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              新しいタブで開く
            </a>
          ) : (
            <p className="text-sm text-gray-400">
              SFA未登録です。MELLOWスタッフに管理画面からの登録を依頼してください。
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
