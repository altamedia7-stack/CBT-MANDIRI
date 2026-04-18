export type Role = "admin" | "guru" | "siswa";

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  classId?: string;
}

export interface Class {
  id: string;
  name: string;
  level: "SD" | "SMP" | "SMA" | "SMK";
}

export interface Subject {
  id: string;
  name: string;
}

export interface Question {
  id: string;
  packetId: string;
  type: "mcq" | "essay" | "boolean" | "short" | "mcq_complex";
  text: string;
  options?: { id: string; text: string }[];
  correctAnswer?: any;
  media?: { type: "image" | "audio"; url: string };
}

export interface ExamPacket {
  id: string;
  name: string;
  subjectId: string;
  classId: string;
  level: string;
}

export interface Exam {
  id: string;
  packetId: string;
  startTime: string;
  durationMinutes: number;
  isActive: boolean;
  type: string; // UTS, UAS, etc.
}

export interface StudentAnswer {
  examId: string;
  studentId: string;
  answers: { questionId: string; answer: any; isFlagged: boolean }[];
  violationCount: number;
  remainingTime: number;
  isFinished: boolean;
}
