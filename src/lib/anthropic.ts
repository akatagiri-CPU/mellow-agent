import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { INTERVIEW_AXES, type AxisQuestions, type PreInterviewAnalysis } from "@/lib/types";

export type ResumeInput =
  | { kind: "text"; text: string }
  | { kind: "pdf"; base64: string }
  | { kind: "image"; base64: string; mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" };

type RawAnalysis = {
  strengths: string[];
  concerns: string[];
  blank_spots: string[];
  axis_questions: Record<string, string[]>;
};

function buildSystemPrompt(): string {
  const axesList = INTERVIEW_AXES.map(
    (axis) => `- ${axis.key}（${axis.label}）: ${axis.description}`,
  ).join("\n");

  return `あなたは採用面接を支援するアシスタントです。与えられた候補者の履歴書・職務経歴書を読み、面接前サポート情報を日本語で作成してください。

1. 候補者の特性の言語化
   - strengths: 強みを3〜5個の箇条書きで
   - concerns: 懸念点を2〜4個の箇条書きで
   - blank_spots: 資料からは読み取れず、面接で確認すべき空白を2〜4個の箇条書きで

2. 次の6つの評価軸それぞれについて、書類の記述が事実かどうかを見抜くための質問を1〜2個ずつ提案してください。
${axesList}

出力は必ず次のJSON形式のみとし、前後に説明文やコードブロックの記法を含めないでください。
{
  "strengths": string[],
  "concerns": string[],
  "blank_spots": string[],
  "axis_questions": {
    ${INTERVIEW_AXES.map((axis) => `"${axis.key}": string[]`).join(",\n    ")}
  }
}`;
}

function buildContent(input: ResumeInput): ContentBlockParam[] {
  const instruction: ContentBlockParam = {
    type: "text",
    text: "以下の候補者の履歴書・職務経歴書を分析してください。",
  };

  if (input.kind === "text") {
    return [instruction, { type: "text", text: input.text }];
  }

  if (input.kind === "pdf") {
    return [
      instruction,
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: input.base64 },
      },
    ];
  }

  return [
    instruction,
    {
      type: "image",
      source: { type: "base64", media_type: input.mediaType, data: input.base64 },
    },
  ];
}

export async function analyzePreInterview(
  input: ResumeInput,
): Promise<PreInterviewAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("AI機能は準備中です（ANTHROPIC_API_KEYが未設定です）");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildContent(input) }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("AIの応答形式が不正です");
  }

  let parsed: RawAnalysis;
  try {
    parsed = JSON.parse(block.text);
  } catch {
    throw new Error("AIの応答をJSONとして解析できませんでした");
  }

  if (
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.concerns) ||
    !Array.isArray(parsed.blank_spots) ||
    typeof parsed.axis_questions !== "object" ||
    parsed.axis_questions === null
  ) {
    throw new Error("AIの応答に必要な項目が含まれていません");
  }

  const axisQuestions: AxisQuestions[] = INTERVIEW_AXES.map((axis) => ({
    key: axis.key,
    questions: Array.isArray(parsed.axis_questions[axis.key])
      ? parsed.axis_questions[axis.key]
      : [],
  }));

  return {
    strengths: parsed.strengths,
    concerns: parsed.concerns,
    blank_spots: parsed.blank_spots,
    axis_questions: axisQuestions,
  };
}
