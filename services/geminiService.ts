import { GoogleGenAI, Type } from "@google/genai";
import { Teacher, ScheduleResponse, PlaceResult, TimeSettings, SchoolBreak } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to clean AI response
const cleanJsonText = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "");
  return cleaned.trim();
};

// --- SMART TIME SLOT CALCULATOR ---
// Calculates valid slots based on start time, generic duration (e.g. 40mins), and breaks.
const calculateValidTimeSlots = (settings: TimeSettings, defaultDuration: number = 40): string[] => {
    const slots: string[] = [];
    
    // Helper to convert "HH:MM" to minutes from midnight
    const toMins = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    // Helper to convert minutes from midnight to "HH:MM"
    const toTimeStr = (totalMins: number) => {
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    let currentMins = toMins(settings.startHour);
    const endMins = toMins(settings.endHour);
    
    // Parse breaks into ranges
    const breakRanges = settings.breaks.map(b => ({
        start: toMins(b.startTime),
        end: toMins(b.endTime),
        name: b.name
    }));

    // Safety loop limit
    let iterations = 0;
    while (currentMins + defaultDuration <= endMins && iterations < 50) {
        iterations++;
        
        // Check if current start time is inside a break
        const overlappingBreak = breakRanges.find(b => currentMins >= b.start && currentMins < b.end);
        
        if (overlappingBreak) {
            // Skip to end of break
            currentMins = overlappingBreak.end;
            continue;
        }

        const nextMins = currentMins + defaultDuration;

        // Check if the proposed slot [current, next] overlaps with a break
        // We define overlap if the slot cuts into a break
        const breakInSlot = breakRanges.find(b => 
            (currentMins < b.start && nextMins > b.start) // Slot starts before break, ends after break starts
        );

        if (breakInSlot) {
            // If a break interrupts this slot, we push the start time to the end of the break
            // (Assuming we don't split classes across breaks for simplicity, or we treat this gap as break time)
            currentMins = breakInSlot.end;
            continue;
        }

        if (nextMins <= endMins) {
            slots.push(`${toTimeStr(currentMins)} - ${toTimeStr(nextMins)}`);
            currentMins = nextMins;
        } else {
            break;
        }
    }

    return slots;
};

export const generateSchedule = async (
  teachers: Teacher[],
  days: string[],
  timeSettings: TimeSettings
): Promise<ScheduleResponse> => {
  if (!apiKey) throw new Error("API Key not found");

  // 1. Calculate Valid Time Slots using logic (Math) instead of AI guessing
  // We take the mode duration (most common) or default to 40 for slot generation
  // In a complex app, we might support variable slots, but fixed slots are safer for AI.
  const validSlots = calculateValidTimeSlots(timeSettings, 40); 
  const validSlotsString = validSlots.join(', ');

  // 2. Extract Context
  const derivedClasses = Array.from(new Set(
    teachers.flatMap(t => t.assignments.map(a => a.classes))
  )).filter(c => c && c.trim() !== '').join(', ');

  const classListInfo = derivedClasses.length > 0 
    ? `Target Classes (extracted from assignments): ${derivedClasses}`
    : `Assume realistic classes for a secondary school (e.g. 7A, 7B, 8A...).`;

  const teacherConstraints = teachers.map(t => {
      const assignments = t.assignments.map(a => 
          `   - Subject: "${a.subjectName}"
             - Duration: ${a.duration} mins
             - REQUIRED FREQUENCY (Total Weekly JP): ${a.weeklyCount} sessions/week
             - MAX CONSECUTIVE SESSIONS per day: ${a.maxConsecutiveSessions} (Strict limit)
             - REQUIRED ROOM: ${a.reqRoom}
             - Target: Grade ${a.grade || 'Any'}, Classes: ${a.classes || 'Any'}`
      ).join('\n');
      
      const unavailable = t.unavailableDays && t.unavailableDays.length > 0 
          ? `   - CONSTRAINT: UNAVAILABLE on days: ${t.unavailableDays.join(', ')}` 
          : '';

      return `Teacher: ${t.name} (Code: ${t.code})\n${unavailable}\n${assignments}`;
  }).join('\n\n');

  const prompt = `
    Create a detailed, optimized, and conflict-free school schedule (Jadwal Pelajaran).

    --- CRITICAL TIME CONFIGURATION ---
    Use ONLY these exact Time Slots for lessons. Do not invent new times:
    [${validSlotsString}]
    
    (Note: Breaks are implicitly the gaps between these slots if any, or specific times defined below).
    Global School Hours: ${timeSettings.startHour} - ${timeSettings.endHour}.

    --- INPUT DATA ---
    Days: ${days.join(', ')}
    
    TEACHER ASSIGNMENTS:
    ${teacherConstraints}

    CLASS CONTEXT:
    ${classListInfo}
    
    --- RULES (ALGORITMA DEWA) ---
    1. **Format**: Valid JSON only.
    2. **Conflict Zero**: No teacher in 2 classes at once. No room used twice at once. No class has 2 teachers at once.
    3. **Time Slots**: You MUST use the exact strings provided in the "Time Slots" list above.
    4. **Distribution**: Spread the "Weekly JP" across valid days. Do not clump everything in one day.
    5. **Consecutive Limit**: Respect 'maxConsecutiveSessions'. If a subject needs 4 JP/week and max is 2, split it into 2 days (2 JP each).
    6. **Room Logic**: If 'reqRoom' is 'Lab', assign it. If 'Kelas Biasa', assume the class stays in their homeroom.
    
    Return a JSON object with a list of schedule items.
  `;

  // RETRY LOGIC (The "Dewa" Touch)
  const attemptGeneration = async (retryCount = 0): Promise<ScheduleResponse> => {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                scheduleName: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.STRING },
                      timeSlot: { type: Type.STRING },
                      subject: { type: Type.STRING },
                      teacher: { type: Type.STRING },
                      teacherCode: { type: Type.STRING },
                      grade: { type: Type.STRING },
                      className: { type: Type.STRING },
                      room: { type: Type.STRING }
                    },
                    required: ["day", "timeSlot", "subject", "teacher", "teacherCode", "grade", "className"]
                  }
                }
              },
              required: ["scheduleName", "items"]
            }
          }
        });

        const text = response.text;
        if (!text) throw new Error("No response from Gemini");
        
        const cleanedText = cleanJsonText(text);
        return JSON.parse(cleanedText) as ScheduleResponse;

      } catch (error: any) {
          if (retryCount < 1) {
              console.warn("Generation failed, retrying once...", error);
              return attemptGeneration(retryCount + 1);
          }
          throw error;
      }
  };

  try {
      return await attemptGeneration();
  } catch (error: any) {
    console.error("Gemini Generation Final Error:", error);
    throw new Error(error.message || "Gagal membuat jadwal. Silakan coba lagi.");
  }
};

export const analyzeScheduleWithAI = async (schedule: ScheduleResponse): Promise<string> => {
  if (!apiKey) throw new Error("API Key not found");

  const prompt = `
    Act as an expert School Academic Consultant. Analyze the following school schedule JSON data deeply:
    
    ${JSON.stringify(schedule.items.slice(0, 150))} (Data sample provided)

    Please provide a sophisticated analysis report in Markdown format with the following sections:

    1.  **📊 Efficiency Score (0-100)**: Give a score based on conflict avoidance and distribution.
    2.  **⚠️ Burnout Alerts**: Identify if any teacher acts continuously without breaks or exceeds daily limits.
    3.  **⚖️ Distribution Balance**: Are heavy subjects (Math, IPA) distributed or clumped?
    4.  **💡 Optimization Suggestions**: Specific actionable advice.
    5.  **🏆 Best Feature**: One thing this schedule did really well.

    Keep the tone professional, encouraging, and insightful. Use Indonesian language.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Gagal menganalisis jadwal.";
  } catch (e) {
    return "Maaf, analisis AI sedang tidak dapat digunakan saat ini.";
  }
};

export const searchNearbyPlaces = async (
  latitude: number,
  longitude: number,
  query: string
): Promise<{ text: string; places: PlaceResult[] }> => {
  if (!apiKey) throw new Error("API Key not found");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    const text = response.text || "Tidak ada rekomendasi ditemukan.";
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const places: PlaceResult[] = [];

    chunks.forEach((chunk: any) => {
      if (chunk.maps) {
        places.push({
          title: chunk.maps.title,
          uri: chunk.maps.uri,
          address: chunk.maps.address,
        });
      }
    });

    return { text, places };
  } catch (error) {
    console.error("Map Error", error);
    throw new Error("Gagal mengambil data lokasi.");
  }
};