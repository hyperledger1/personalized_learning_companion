export type Flashcard = {
  id: number;
  front: string;
  back: string;
};

export type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type ApiResponse = {
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
};
