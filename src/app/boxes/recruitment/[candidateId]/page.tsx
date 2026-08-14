import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { CandidateStatusSelect } from "@/components/CandidateStatusSelect";
import { generateAnalysis, addScore } from "../actions";
import type { Candidate, CandidateScore } from "@/lib/types";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (!candidate) {
    notFound();
  }

  const { data: scores } = await supabase
    .from("candidate_scores")
    .select("id, score, comment, created_at, scorer:profiles(name)")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  const typedCandidate = candidate as Candidate;
  const typedScores = (scores ?? []) as unknown as CandidateScore[];

  const generateAnalysisForCandidate = generateAnalysis.bind(null, candidateId);
  const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/boxes/recruitment"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← 候補者一覧
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{typedCandidate.name}</h1>
        </div>
        <SignOutButton />
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-6 py-10">
        <section className="flex items-center gap-4">
          <span className="text-sm text-gray-500">ステータス</span>
          <CandidateStatusSelect candidateId={typedCandidate.id} status={typedCandidate.status} />
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">履歴書・職務経歴書</h2>
          <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            {typedCandidate.resume_text || (
              <span className="text-gray-400">テキストが入力されていません</span>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">AIによる特性分析</h2>
            {aiConfigured ? (
              <form action={generateAnalysisForCandidate}>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  {typedCandidate.ai_trait_summary ? "再生成" : "AIで生成"}
                </button>
              </form>
            ) : (
              <button
                type="button"
                disabled
                title="AIキーの設定後に利用できます"
                className="cursor-not-allowed rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-500"
              >
                準備中
              </button>
            )}
          </div>

          {!aiConfigured ? (
            <p className="text-sm text-gray-400">準備中です</p>
          ) : typedCandidate.ai_trait_summary ? (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-700">特性の言語化</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                  {typedCandidate.ai_trait_summary.map((trait, i) => (
                    <li key={i}>{trait}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-gray-700">面接質問の提案</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                  {typedCandidate.ai_interview_questions?.map((question, i) => (
                    <li key={i}>{question}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">まだ生成されていません</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-gray-900">採点</h2>
          <form action={addScore} className="mb-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="candidate_id" value={typedCandidate.id} />
            <div>
              <label className="mb-1 block text-xs text-gray-500">点数（1〜5）</label>
              <input
                name="score"
                type="number"
                min={1}
                max={5}
                required
                className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">コメント</label>
              <input
                name="comment"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              採点する
            </button>
          </form>

          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {typedScores.map((score) => (
              <li key={score.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{score.score} / 5</span>
                  <span className="text-xs text-gray-400">{score.scorer?.name}</span>
                </div>
                {score.comment && <p className="mt-1 text-gray-600">{score.comment}</p>}
              </li>
            ))}
            {!typedScores.length && (
              <li className="px-4 py-3 text-sm text-gray-400">採点はまだありません</li>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
