export type Flashcard = {
  id: number;
  front: string;
  back: string;
};

export type FlashcardLevel = "Beginner" | "Advanced" | "Expert";

export type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type ApiResponse = {
  flashcards: Record<FlashcardLevel, Flashcard[]>;
  quiz: QuizQuestion[];
};
