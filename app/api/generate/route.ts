import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const modelCandidates = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite"
];

function buildPrompt(topic: string) {
  return `Generate learning content for the topic: "${topic}".

Return ONLY valid JSON matching this exact TypeScript-like shape:
{
  "flashcards": {
    "Beginner": [{ "id": number, "front": string, "back": string }],
    "Advanced": [{ "id": number, "front": string, "back": string }],
    "Expert": [{ "id": number, "front": string, "back": string }]
  },
  "quiz": [
    {
      "id": number,
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number,
      "explanation": string
    }
  ]
}

Rules:
- Return 5 to 6 flashcards in each level (Beginner, Advanced, Expert).
- Return exactly 5 quiz questions.
- Each quiz question must have exactly 4 options.
- correctIndex must be 0..3.
- Keep Beginner concise and easy, Advanced deeper, Expert challenging.
- Do not include markdown fences or extra text.`;
}

function extractJsonString(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function isValidApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as {
    flashcards?: unknown;
    quiz?: unknown;
  };

  if (
    !maybe.flashcards ||
    typeof maybe.flashcards !== "object" ||
    !Array.isArray(maybe.quiz)
  ) {
    return false;
  }

  const levels = ["Beginner", "Advanced", "Expert"] as const;
  const flashcardsByLevel = maybe.flashcards as Record<string, unknown>;

  const flashcardsValid = levels.every((level) => {
    const cards = flashcardsByLevel[level];
    if (!Array.isArray(cards) || cards.length < 5 || cards.length > 6) {
      return false;
    }

    return cards.every((card) => {
      if (!card || typeof card !== "object") {
        return false;
      }
      const c = card as { id?: unknown; front?: unknown; back?: unknown };
      return (
        typeof c.id === "number" &&
        typeof c.front === "string" &&
        typeof c.back === "string"
      );
    });
  });

  const quizValid =
    maybe.quiz.length === 5 &&
    maybe.quiz.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const q = item as {
      id?: unknown;
      question?: unknown;
      options?: unknown;
      correctIndex?: unknown;
      explanation?: unknown;
    };

    return (
      typeof q.id === "number" &&
      typeof q.question === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every((option) => typeof option === "string") &&
      typeof q.correctIndex === "number" &&
      q.correctIndex >= 0 &&
      q.correctIndex <= 3 &&
      typeof q.explanation === "string"
    );
    });

  return flashcardsValid && quizValid;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { topic?: string };
  const topic = body.topic?.trim();

  if (!topic) {
    return NextResponse.json(
      { error: "Topic is required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildPrompt(topic)
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 1800
      }
    });

    const errors: string[] = [];

    for (const modelName of modelCandidates) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: requestBody,
          signal: controller.signal
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        errors.push(`${modelName}: ${errorText}`);
        continue;
      }

      const geminiPayload = (await response.json()) as GeminiResponse;
      const text = geminiPayload.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        errors.push(`${modelName}: empty response`);
        continue;
      }

      const parsed = JSON.parse(extractJsonString(text)) as unknown;

      if (!isValidApiResponse(parsed)) {
        errors.push(`${modelName}: invalid JSON format`);
        continue;
      }

      return NextResponse.json(parsed);
    }

    return NextResponse.json(
      {
        error: `Gemini request failed for all candidate models. ${errors.join(" | ")}`
      },
      { status: 502 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
