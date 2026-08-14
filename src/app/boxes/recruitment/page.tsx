import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { createCandidate } from "./actions";
import { CANDIDATE_STATUS_LABELS, type Candidate } from "@/lib/types";

export default async function RecruitmentPage() {
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
        <h1 className="text-lg font-semibold text-gray-900">採用管理</h1>
      </div>
      <SignOutButton />
    </header>
  );

  if (!profile?.company_id) {
    return (
      <div className="min-h-screen bg-gray-50">
        {header}
        <main className="mx-auto max-w-4xl px-6 py-24 text-center text-gray-500">
          MELLOWスタッフアカウントでは採用管理をご利用いただけません。
          <br />
          会社に所属する利用者アカウントでログインしてください。
        </main>
      </div>
    );
  }

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, email, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      {header}

      <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-900">候補者を追加</h2>
          <form action={createCandidate} className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                name="name"
                required
                placeholder="氏名"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                name="email"
                type="email"
                placeholder="メールアドレス（任意）"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <textarea
              name="resume_text"
              rows={4}
              placeholder="履歴書・職務経歴書の内容を貼り付け（後から追加・編集も可能）"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              追加
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-900">候補者一覧</h2>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {(candidates as Pick<Candidate, "id" | "name" | "email" | "status" | "created_at">[] | null)?.map(
              (candidate) => (
                <li key={candidate.id}>
                  <Link
                    href={`/boxes/recruitment/${candidate.id}`}
                    className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-gray-50"
                  >
                    <span className="text-gray-900">
                      {candidate.name}
                      {candidate.email && (
                        <span className="ml-2 text-gray-400">{candidate.email}</span>
                      )}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                      {CANDIDATE_STATUS_LABELS[candidate.status]}
                    </span>
                  </Link>
                </li>
              ),
            )}
            {!candidates?.length && (
              <li className="px-4 py-3 text-sm text-gray-400">登録されている候補者はいません</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
