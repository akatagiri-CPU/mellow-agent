import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { createDeal, deleteDeal } from "./actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DEAL_STAGES, DEAL_STAGE_LABELS, type Company, type Deal } from "@/lib/types";

function formatAmount(amount: number | null) {
  if (amount === null) return "-";
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ja-JP");
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string; msg?: string; error?: string }>;
}) {
  const { company_id: selectedCompanyId, msg, error: errorMsg } = await searchParams;

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
  let deals: Deal[] = [];
  if (targetCompanyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("sfa_url")
      .eq("id", targetCompanyId)
      .single();
    sfaUrl = company?.sfa_url ?? null;

    const { data: dealRows } = await supabase
      .from("deals")
      .select("*")
      .eq("company_id", targetCompanyId)
      .order("updated_at", { ascending: false });
    deals = (dealRows as Deal[] | null) ?? [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {header}

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        {msg && (
          <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {msg}
          </p>
        )}
        {errorMsg && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </p>
        )}

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
          <>
            <section className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-2 text-base font-semibold text-gray-900">SFA（案件管理シート）</h2>

              {sfaUrl ? (
                <a
                  href={sfaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  SFAスプレッドシートを開く
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

            <section>
              <h2 className="mb-4 text-base font-semibold text-gray-900">案件を追加</h2>
              <form
                action={createDeal}
                className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
              >
                <input type="hidden" name="company_id" value={targetCompanyId} />
                <input
                  name="name"
                  required
                  placeholder="案件名"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  name="customer_name"
                  placeholder="顧客名"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  name="acquisition_channel"
                  placeholder="獲得経路"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  name="owner_name"
                  placeholder="担当者"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  name="stage"
                  defaultValue="approach"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DEAL_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {DEAL_STAGE_LABELS[stage]}
                    </option>
                  ))}
                </select>
                <input
                  name="amount"
                  type="number"
                  placeholder="金額"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  name="next_action"
                  placeholder="次回アクション"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:col-span-2"
                />
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 sm:col-span-2"
                >
                  追加
                </button>
              </form>
            </section>

            <section>
              <h2 className="mb-4 text-base font-semibold text-gray-900">案件一覧</h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                      <th className="px-4 py-2 font-medium">案件名</th>
                      <th className="px-4 py-2 font-medium">顧客名</th>
                      <th className="px-4 py-2 font-medium">ステージ</th>
                      <th className="px-4 py-2 font-medium">金額</th>
                      <th className="px-4 py-2 font-medium">次回アクション</th>
                      <th className="px-4 py-2 font-medium">更新日</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deals.map((deal) => (
                      <tr key={deal.id}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/boxes/sales/${deal.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {deal.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{deal.customer_name ?? "-"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                            {DEAL_STAGE_LABELS[deal.stage]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatAmount(deal.amount)}</td>
                        <td className="px-4 py-3 text-gray-700">{deal.next_action ?? "-"}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(deal.updated_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <form action={deleteDeal}>
                            <input type="hidden" name="deal_id" value={deal.id} />
                            <ConfirmSubmitButton
                              label="削除"
                              confirmMessage={`「${deal.name}」を削除します。よろしいですか？`}
                              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            />
                          </form>
                        </td>
                      </tr>
                    ))}
                    {!deals.length && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 text-center text-gray-400">
                          登録されている案件はありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          isMellowAdmin && <p className="text-sm text-gray-400">会社を選択してください</p>
        )}
      </main>
    </div>
  );
}
