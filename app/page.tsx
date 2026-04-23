"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiResponse } from "@/types";

type View = "home" | "choice" | "flashcards" | "quiz";

export default function HomePage() {
  const [topic, setTopic] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [view, setView] = useState<View>("home");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!data?.flashcards) {
      setFlipped({});
      return;
    }

    const initialState = data.flashcards.reduce<Record<number, boolean>>(
      (acc, card) => {
        acc[card.id] = false;
        return acc;
      },
      {}
    );

    setFlipped(initialState);
  }, [data]);

  const currentQuestion = useMemo(() => {
    return data?.quiz[currentQuestionIndex] ?? null;
  }, [currentQuestionIndex, data]);

  const handleGenerate = async () => {
    setError("");

    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
      });

      const payload = (await response.json()) as ApiResponse | { error: string };

      if (!response.ok) {
        setError("error" in payload ? payload.error : "Failed to generate.");
        return;
      }

      setData(payload as ApiResponse);
      setView("choice");
      setCurrentQuestionIndex(0);
      setSelectedIndex(null);
      setCorrectCount(0);
      setShowResult(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlip = (id: number) => {
    setFlipped((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const startQuiz = () => {
    setView("quiz");
    setCurrentQuestionIndex(0);
    setSelectedIndex(null);
    setCorrectCount(0);
    setShowResult(false);
  };

  const handleSelectOption = (index: number) => {
    if (!currentQuestion || selectedIndex !== null) {
      return;
    }

    setSelectedIndex(index);
    if (index === currentQuestion.correctIndex) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (!data) {
      return;
    }

    const isLast = currentQuestionIndex === data.quiz.length - 1;
    if (isLast) {
      setShowResult(true);
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
    setSelectedIndex(null);
  };

  const backToHome = () => {
    setView("home");
    setTopic("");
    setData(null);
    setError("");
    setSelectedIndex(null);
    setCurrentQuestionIndex(0);
    setCorrectCount(0);
    setShowResult(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-10">
      <div className="w-full rounded-xl bg-white p-6 shadow-md md:p-8">
        {view === "home" && (
          <section className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-4xl font-bold text-slate-900">LearnMate</h1>
              <p className="text-slate-600">
                Turn any topic into flashcards &amp; quizzes.
              </p>
            </div>

            <div className="space-y-3">
              <label htmlFor="topic" className="text-sm font-medium text-slate-700">
                Enter your topic (e.g., Python async, React hooks, Kubernetes basics)
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Type a learning topic..."
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </span>
              ) : (
                "Generate flashcards & quiz"
              )}
            </button>
          </section>
        )}

        {view === "choice" && data && (
          <section className="space-y-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Choose learning mode</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setView("flashcards")}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
              >
                Flashcards
              </button>
              <button
                type="button"
                onClick={startQuiz}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
              >
                Quiz
              </button>
            </div>
            <button
              type="button"
              onClick={backToHome}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100"
            >
              Back to home
            </button>
          </section>
        )}

        {view === "flashcards" && data && (
          <section className="space-y-5">
            <h2 className="text-2xl font-semibold text-slate-900">Flashcards</h2>
            <div className="grid gap-4">
              {data.flashcards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleFlip(card.id)}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {flipped[card.id] ? "Back" : "Front"}
                  </p>
                  <p className="text-slate-800">
                    {flipped[card.id] ? card.back : card.front}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={backToHome}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition hover:bg-slate-100"
            >
              Back to home
            </button>
          </section>
        )}

        {view === "quiz" && data && (
          <section className="space-y-5">
            <h2 className="text-2xl font-semibold text-slate-900">Quiz</h2>

            {showResult ? (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-lg font-semibold text-slate-900">
                  {correctCount}/{data.quiz.length} correct
                </p>
                <button
                  type="button"
                  onClick={backToHome}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                  Back to home
                </button>
              </div>
            ) : (
              currentQuestion && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Question {currentQuestionIndex + 1} of {data.quiz.length}
                  </p>

                  <h3 className="text-lg font-medium text-slate-900">
                    {currentQuestion.question}
                  </h3>

                  <div className="grid gap-3">
                    {currentQuestion.options.map((option, index) => {
                      const isCorrect = index === currentQuestion.correctIndex;
                      const isSelected = selectedIndex === index;

                      let optionClass =
                        "rounded-lg border border-slate-300 bg-white px-4 py-3 text-left transition hover:bg-slate-50";

                      if (selectedIndex !== null && isCorrect) {
                        optionClass =
                          "rounded-lg border border-green-400 bg-green-50 px-4 py-3 text-left text-green-900";
                      } else if (selectedIndex !== null && isSelected && !isCorrect) {
                        optionClass =
                          "rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-left text-red-900";
                      }

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleSelectOption(index)}
                          disabled={selectedIndex !== null}
                          className={optionClass}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {selectedIndex !== null && (
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p
                        className={
                          selectedIndex === currentQuestion.correctIndex
                            ? "font-semibold text-green-700"
                            : "font-semibold text-red-700"
                        }
                      >
                        {selectedIndex === currentQuestion.correctIndex
                          ? "Correct!"
                          : "Incorrect."}
                      </p>
                      <p className="text-slate-700">{currentQuestion.explanation}</p>
                      <button
                        type="button"
                        onClick={handleNextQuestion}
                        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                      >
                        {currentQuestionIndex === data.quiz.length - 1
                          ? "Finish quiz"
                          : "Next question"}
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </section>
        )}
      </div>
    </main>
  );
}
