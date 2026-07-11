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
}
