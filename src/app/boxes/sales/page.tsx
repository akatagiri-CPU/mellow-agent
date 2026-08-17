import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import type { Company } from "@/lib/types";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>;
}) {
  const { company_id: selectedCompanyId } = await searchParams;

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

  const isMellowAdmin = profile?.role === "mellow_admin";

  if (!isMellowAdmin && !profile?.company_id) {
    return (
      <div className="min-h-screen bg-gray-50">
        {header}
        <main className="mx-auto max-w-4xl px-6 py-24 text-center text-gray-500">
          会社に所属していないアカウントでは営業管理をご利用いただけません。
        </main>
      </div>
    );
  }

  const targetCompanyId = isMellowAdmin ? selectedCompanyId : profile!.company_id!;

  let companies: Pick<Company, "id" | "name">[] = [];
  if (isMellowAdmin) {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    companies = data ?? [];
  }

  let sfaUrl: string | null = null;
  if (targetCompanyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("sfa_url")
      .eq("id", targetCompanyId)
      .single();
    sfaUrl = company?.sfa_url ?? null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {header}

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        {isMellowAdmin && (
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <form method="GET" className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500">会社を選択</label>
                <select
                  name="company_id"
                  defaultValue={selectedCompanyId ?? ""}
                  className="min-w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                表示
              </button>
            </form>
          </section>
        )}

        {targetCompanyId ? (
          <section className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-2 text-base font-semibold text-gray-900">SFA（案件管理シート）</h2>

            {sfaUrl ? (
              <a
                href={sfaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                新しいタブで開く
              </a>
            ) : (
              <p className="text-sm text-gray-400">
                SFA未登録です。
                {isMellowAdmin
                  ? "管理画面から登録してください。"
                  : "MELLOWスタッフに管理画面からの登録を依頼してください。"}
              </p>
            )}
          </section>
        ) : (
          isMellowAdmin && (
            <p className="text-sm text-gray-400">会社を選択してください</p>
          )
        )}
      </main>
    </div>
  );
}
