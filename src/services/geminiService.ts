import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeQuestions(questions: any[]) {
  const prompt = `Analisis kumpulan soal ujian berikut untuk jenjang SMA. Berikan saran tingkat kesukaran dan perbaikan narasi jika diperlukan.
  Soal: ${JSON.stringify(questions)}
  
  Format output: JSON dengan struktur { "summary": string, "analysis": { "qid": string, "difficulty": string, "suggestion": string }[] }`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || "{}");
}
