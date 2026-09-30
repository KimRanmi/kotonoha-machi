import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { VILLAGER_MODEL, getVillager } from "@/lib/villager";

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

function isRetryableStatus(err: unknown): boolean {
  const status = (err as { status?: number } | undefined)?.status;
  return status === 503 || status === 429;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini가 "일시적으로 혼잡하다"며 503/429를 주는 경우가 꽤 있어서, 실패를 바로
// 사용자에게 보여주기 전에 짧게 대기하며 몇 번 더 시도해본다.
async function generateWithRetry(
  fn: () => ReturnType<GoogleGenAI["models"]["generateContent"]>,
  attempts = 3
) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableStatus(err) || i === attempts - 1) throw err;
      await sleep(500 * 2 ** i);
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          ".env.local에 GEMINI_API_KEY가 설정되어 있지 않습니다. README를 참고해 API 키를 채워 넣어주세요.",
      },
      { status: 500 }
    );
  }

  let body: { messages?: IncomingMessage[]; villagerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "대화 메시지가 비어 있습니다." },
      { status: 400 }
    );
  }

  const villager = getVillager(body.villagerId);
  const ai = new GoogleGenAI({ apiKey });

  // 응답 생성과 한국어 번역을 별도 호출 두 번으로 나누면, 동시에 여러 세션이 같은
  // API 키를 쓸 때 두 번째(번역) 호출만 유독 호출 빈도 제한에 걸려 번역이 자주
  // 누락되는 문제가 있었다. 한 번의 호출에서 JSON으로 함께 받아 호출 횟수를 절반으로
  // 줄인다.
  const combinedSystemPrompt = `${villager.systemPrompt}

추가 출력 형식 지침:
- 위 대화 원칙을 그대로 따라 생성한 일본어 응답을 "reply" 필드에 넣으세요.
- reply를 자연스러운 한국어로 옮긴 번역문을 "translation" 필드에 넣으세요 (설명이나 따옴표 없이 번역문만).
- 반드시 이 두 필드만 가진 JSON 객체로 응답하세요.`;

  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await generateWithRetry(() =>
      ai.models.generateContent({
        model: VILLAGER_MODEL,
        contents,
        config: {
          systemInstruction: combinedSystemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              translation: { type: Type.STRING },
            },
            required: ["reply", "translation"],
          },
        },
      })
    );

    let reply = "";
    let translation = "";
    try {
      const parsed = JSON.parse(response.text ?? "{}");
      reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
      translation =
        typeof parsed.translation === "string" ? parsed.translation.trim() : "";
    } catch (err) {
      console.error("JSON 파싱 실패, 원문을 그대로 사용:", err);
      reply = (response.text ?? "").trim();
    }

    return NextResponse.json({ reply, translation });
  } catch (err) {
    console.error("Gemini API 호출 실패:", err);
    return NextResponse.json(
      { error: "주민의 응답을 가져오는 데 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }
}
