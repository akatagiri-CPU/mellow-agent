import Anthropic from "@anthropic-ai/sdk";

export type CandidateAnalysis = {
  trait_summary: string[];
  interview_questions: string[];
};

const SYSTEM_PROMPT = `あなたは採用担当者を支援するアシスタントです。与えられた履歴書・職務経歴書のテキストから、
(1) 候補者の特性を3〜5個の箇条書きで言語化し、
(2) 深掘りすべき面接質問を5つ提案してください。

出力は必ず次のJSON形式のみとし、前後に説明文やコードブロックの記法を含めないでください。
{"trait_summary": string[], "interview_questions": string[]}`;

export async function analyzeCandidateResume(
  resumeText: string,
): Promise<CandidateAnalysis> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: resumeText }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("AIの応答形式が不正です");
  }

  let parsed: CandidateAnalysis;
  try {
    parsed = JSON.parse(block.text);
  } catch {
    throw new Error("AIの応答をJSONとして解析できませんでした");
  }

  if (!Array.isArray(parsed.trait_summary) || !Array.isArray(parsed.interview_questions)) {
    throw new Error("AIの応答に必要な項目が含まれていません");
  }

  return parsed;
}
