import { NextResponse } from "next/server";

const mockResponse = {
  flashcards: [
    {
      id: 1,
      front: "What is an async function in Python?",
      back: "An async function is defined with 'async def' and can use 'await' to pause execution until an awaitable (like a coroutine) completes."
    },
    {
      id: 2,
      front: "What does 'await' do?",
      back: "It pauses the async function until the awaited object (like a coroutine) completes, allowing other tasks to run in the meantime."
    },
    {
      id: 3,
      front: "What is asyncio.run() for?",
      back: "It is the recommended way to run the top-level event loop in Python and execute an async main function."
    }
  ],
  quiz: [
    {
      id: 1,
      question: "Which keyword defines an async function in Python?",
      options: ["async def", "async function", "async func", "async create"],
      correctIndex: 0,
      explanation: "In Python, async functions are defined with 'async def'."
    },
    {
      id: 2,
      question: "What does 'await' allow the event loop to do?",
      options: [
        "Terminate the program",
        "Switch to other tasks while waiting",
        "Start a new thread",
        "Print a debug message"
      ],
      correctIndex: 1,
      explanation:
        "The 'await' keyword allows the event loop to switch to other tasks while waiting for the awaitable to complete."
    }
  ]
};

export async function POST(request: Request) {
  const body = (await request.json()) as { topic?: string };
  const topic = body.topic?.trim();

  if (!topic) {
    return NextResponse.json(
      { error: "Topic is required." },
      { status: 400 }
    );
  }

  return NextResponse.json(mockResponse);
}
