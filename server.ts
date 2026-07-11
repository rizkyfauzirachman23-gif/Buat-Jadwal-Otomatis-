import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ 
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/analyze-schedule", async (req, res) => {
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
  });

  app.post("/api/nearby-places", async (req, res) => {
    try {
      const { latitude, longitude, query } = req.body;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured on the server." });
      }

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Find actual real places near me related to: ${query}. List top 5 recommendations with a short reason why.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: latitude,
                longitude: longitude
              }
            }
          }
        }
      });

      const text = result.text || "Tidak ada rekomendasi ditemukan.";
      const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const places: any[] = [];

      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          places.push({
            title: chunk.maps.title,
            uri: chunk.maps.uri,
            address: chunk.maps.address,
          });
        }
      });

      res.json({ text, places });
    } catch (error: any) {
      console.error("Map Error:", error);
      res.status(500).json({ error: "Gagal mengambil data lokasi." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
