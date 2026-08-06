import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { createCompany, createUser } from "./actions";
import type { Company, Profile } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "mellow_admin") {
    redirect("/");
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  const { data: users } = await supabase
    .from("profiles")
    .select("id, name, email, role, company_id, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
            ← 箱一覧
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">管理画面</h1>
        </div>
        <SignOutButton />
      </header>

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-900">会社登録</h2>
          <form action={createCompany} className="flex gap-2">
            <input
              name="name"
              required
              placeholder="会社名"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              追加
            </button>
          </form>

          <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {(companies as Company[] | null)?.map((company) => (
              <li key={company.id} className="px-4 py-3 text-sm text-gray-700">
                {company.name}
              </li>
            ))}
            {!companies?.length && (
              <li className="px-4 py-3 text-sm text-gray-400">登録されている会社はありません</li>
            )}
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-900">利用者登録</h2>
          <form action={createUser} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              name="name"
              required
              placeholder="氏名"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="メールアドレス"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              name="role"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="company_user">利用者</option>
              <option value="mellow_admin">MELLOWスタッフ</option>
            </select>
            <select
              name="company_id"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">会社を選択</option>
              {(companies as Company[] | null)?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="col-span-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              追加
            </button>
          </form>

          <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {(users as Profile[] | null)?.map((u) => (
              <li key={u.id} className="flex justify-between px-4 py-3 text-sm text-gray-700">
                <span>
                  {u.name} ({u.email})
                </span>
                <span className="text-gray-400">
                  {u.role === "mellow_admin" ? "MELLOWスタッフ" : "利用者"}
                </span>
              </li>
            ))}
            {!users?.length && (
              <li className="px-4 py-3 text-sm text-gray-400">登録されている利用者はいません</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
