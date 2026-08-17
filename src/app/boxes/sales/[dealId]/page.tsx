import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { updateDeal, deleteDeal, addDealLog } from "../actions";
import { DEAL_STAGES, DEAL_STAGE_LABELS, type Deal, type DealLog } from "@/lib/types";

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ dealId: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { dealId } = await params;
  const { msg, error: errorMsg } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .single();

  if (!deal) {
    notFound();
  }

  const typedDeal = deal as Deal;

  const { data: logRows } = await supabase
    .from("deal_logs")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });
  const logs = (logRows as DealLog[] | null) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/boxes/sales?company_id=${typedDeal.company_id}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← 案件一覧
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{typedDeal.name}</h1>
        </div>
        <SignOutButton />
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-6 py-10">
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

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">案件情報</h2>
            <form action={deleteDeal}>
              <input type="hidden" name="deal_id" value={typedDeal.id} />
              <ConfirmSubmitButton
                label="この案件を削除"
                confirmMessage={`「${typedDeal.name}」を削除します。よろしいですか？`}
                className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
              />
            </form>
          </div>

          <form
            action={updateDeal}
            className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
          >
            <input type="hidden" name="deal_id" value={typedDeal.id} />

            <div>
              <label className="mb-1 block text-xs text-gray-500">案件名</label>
              <input
                name="name"
                required
                defaultValue={typedDeal.name}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">顧客名</label>
              <input
                name="customer_name"
                defaultValue={typedDeal.customer_name ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">獲得経路</label>
              <input
                name="acquisition_channel"
                defaultValue={typedDeal.acquisition_channel ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">担当者</label>
              <input
                name="owner_name"
                defaultValue={typedDeal.owner_name ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">ステージ</label>
              <select
                name="stage"
                defaultValue={typedDeal.stage}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {DEAL_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {DEAL_STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">金額</label>
              <input
                name="amount"
                type="number"
                defaultValue={typedDeal.amount ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">次回アクション</label>
              <input
                name="next_action"
                defaultValue={typedDeal.next_action ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 sm:col-span-2"
            >
              保存
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">進捗ログ</h2>

          <form
            action={addDealLog}
            className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
          >
            <input type="hidden" name="deal_id" value={typedDeal.id} />

            <div>
              <label className="mb-1 block text-xs text-gray-500">日付</label>
              <input
                name="logged_at"
                type="date"
                required
                defaultValue={todayISODate()}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">対応者</label>
              <input
                name="handled_by"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">内容</label>
              <textarea
                name="content"
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">到達ステージ</label>
              <select
                name="stage"
                defaultValue={typedDeal.stage}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {DEAL_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {DEAL_STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 sm:col-span-2"
            >
              進捗ログを追加
            </button>
          </form>

          <p className="mb-2 text-xs text-gray-400">
            最新の進捗ログの到達ステージが、案件のステージに自動反映されます。
          </p>

          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {logs.map((log) => (
              <li key={log.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    {new Date(log.logged_at).toLocaleDateString("ja-JP")}
                    {log.handled_by && (
                      <span className="ml-2 text-gray-500">{log.handled_by}</span>
                    )}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                    {DEAL_STAGE_LABELS[log.stage]}
                  </span>
                </div>
                {log.content && <p className="mt-1 whitespace-pre-wrap text-gray-600">{log.content}</p>}
              </li>
            ))}
            {!logs.length && (
              <li className="px-4 py-3 text-sm text-gray-400">進捗ログはまだありません</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
