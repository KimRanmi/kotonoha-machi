import { ApiError, GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { VILLAGER_MODEL, TRANSLATOR_SYSTEM_PROMPT, getVillager } from "@/lib/villager";

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

// Gemini가 "high demand"(503)로 일시적으로 거절할 때 재시도하기 위한 헬퍼.
// 503이 아닌 오류(잘못된 키, 잘못된 요청 등)는 즉시 던져서 재시도로 숨기지 않는다.
async function generateWithRetry<T>(
  call: () => Promise<T>,
  retries = 2,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (err) {
      const isRetryable = err instanceof ApiError && err.status === 503;
      if (!isRetryable || attempt >= retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
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

  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await generateWithRetry(() =>
      ai.models.generateContent({
        model: VILLAGER_MODEL,
        contents,
        config: { systemInstruction: villager.systemPrompt },
      })
    );

    const reply = (response.text ?? "").trim();

    let translation = "";
    try {
      const translationResponse = await generateWithRetry(() =>
        ai.models.generateContent({
          model: VILLAGER_MODEL,
          contents: [{ role: "user", parts: [{ text: reply }] }],
          config: { systemInstruction: TRANSLATOR_SYSTEM_PROMPT },
        })
      );
      translation = (translationResponse.text ?? "").trim();
    } catch (err) {
      console.error("번역 생성 실패:", err);
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
