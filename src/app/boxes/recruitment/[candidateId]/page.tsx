import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { CandidateStatusSelect } from "@/components/CandidateStatusSelect";
import { generateAnalysisFromText, generateAnalysisFromFile, addScore } from "../actions";
import { INTERVIEW_AXES, type Candidate, type CandidateScore } from "@/lib/types";

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

  const generateFromTextForCandidate = generateAnalysisFromText.bind(null, candidateId);
  const generateFromFileForCandidate = generateAnalysisFromFile.bind(null, candidateId);
  const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasAnalysis = Boolean(typedCandidate.ai_analyzed_at);

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
          <h2 className="mb-2 text-base font-semibold text-gray-900">面接前サポート</h2>

          {aiConfigured ? (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
              <form action={generateFromTextForCandidate}>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  {hasAnalysis ? "テキストから再分析" : "テキストから分析"}
                </button>
              </form>
              <form action={generateFromFileForCandidate} className="flex items-center gap-2">
                <input
                  type="file"
                  name="file"
                  accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
                  required
                  className="text-sm text-gray-600"
                />
                <button
                  type="submit"
                  className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                >
                  ファイルから分析
                </button>
              </form>
            </div>
          ) : (
            <button
              type="button"
              disabled
              title="AIキーの設定後に利用できます"
              className="mb-4 cursor-not-allowed rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-500"
            >
              準備中
            </button>
          )}

          {!aiConfigured ? (
            <p className="text-sm text-gray-400">準備中です</p>
          ) : hasAnalysis ? (
            <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-700">強み</h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                    {typedCandidate.ai_strengths?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-700">懸念点</h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                    {typedCandidate.ai_concerns?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-medium text-gray-700">面接で確認すべき空白</h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                    {typedCandidate.ai_blank_spots?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-700">評価軸ごとの質問</h3>
                <div className="space-y-3">
                  {INTERVIEW_AXES.map((axis) => {
                    const questions = typedCandidate.ai_axis_questions?.find(
                      (a) => a.key === axis.key,
                    )?.questions;
                    return (
                      <div key={axis.key}>
                        <p className="text-sm font-medium text-gray-800">{axis.label}</p>
                        <p className="mb-1 text-xs text-gray-400">{axis.description}</p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                          {questions?.map((question, i) => <li key={i}>{question}</li>)}
                        </ul>
                      </div>
                    );
                  })}
                </div>
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
