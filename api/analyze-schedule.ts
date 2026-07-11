import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ 
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { schedule } = req.body;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    const prompt = `
      Act as an expert School Academic Consultant. Analyze the following school schedule JSON data deeply:
      
      ${JSON.stringify(schedule.items.filter((i: any) => !i.isBreak).slice(0, 150))} (Data sample provided)

      Please provide a sophisticated analysis report in Markdown format with the following sections:

      1.  **📊 Efficiency Score (0-100)**: Give a score. NOTE: The algorithm now enforces 0 conflicts. If you see any, flag them as errors.
      2.  **⚠️ Burnout Alerts**: Identify if any teacher acts continuously without breaks or exceeds daily limits.
      3.  **⚖️ Distribution Balance**: Are heavy subjects (Math, IPA) distributed or clumped?
      4.  **💡 Optimization Suggestions**: Specific actionable advice.
      5.  **🏆 Best Feature**: One thing this schedule did really well.

      Keep the tone professional, encouraging, and insightful. Use Indonesian language.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ text: result.text || "Gagal menganalisis jadwal." });
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan saat menganalisis jadwal." });
  }
}
