export interface FeedbackQuestion {
  key: string;
  prompt: string;
  kind: 'text' | 'single';
  options: string[];
}

export interface FeedbackRow {
  key: string;
  category: 'hotel' | 'activity' | 'vehicle';
  label: string;
  score: number | null;
  comment: string;
}

export interface FeedbackAnswer {
  key: string;
  value: string;
  detail: string;
}

export interface FeedbackForm {
  intro: string;
  rows: FeedbackRow[];
  questions: FeedbackQuestion[];
  answers: FeedbackAnswer[];
  submitted: boolean;
}

export interface FeedbackWrite {
  scores: { key: string; score: number | null; comment: string }[];
  answers: FeedbackAnswer[];
}

export interface HotelRanking {
  average: number | null;
  count: number;
  comments: { score: number; comment: string; submitted_at: string }[];
}
