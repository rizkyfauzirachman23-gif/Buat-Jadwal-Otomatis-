import { Teacher, ScheduleResponse, PlaceResult, TimeSettings, ScheduleItem } from "../types";

// --- UTILITIES ---

const calculateValidTimeSlots = (
    settings: TimeSettings, 
    specificDay?: string, 
    defaultDuration: number = 40 
): string[] => {
    const slots: string[] = [];
    
    const duration = settings.lessonDuration || 40;

    let startStr = settings.startHour;
    let endStr = settings.endHour;

    if (specificDay && settings.dailyOverrides && settings.dailyOverrides[specificDay]) {
        startStr = settings.dailyOverrides[specificDay].start;
        endStr = settings.dailyOverrides[specificDay].end;
    }

    const toMins = (time: string) => {
        if(!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const toTimeStr = (totalMins: number) => {
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    let currentMins = toMins(startStr);
    const endMins = toMins(endStr);
    
    const breakRanges = settings.breaks.map(b => ({
        start: toMins(b.startTime),
        end: toMins(b.endTime),
        name: b.name
    })).sort((a,b) => a.start - b.start);

    if (currentMins >= endMins) return [];

    let iterations = 0;
    while (currentMins + duration <= endMins && iterations < 50) {
        iterations++;
        
        const overlappingBreak = breakRanges.find(b => currentMins >= b.start && currentMins < b.end);
        if (overlappingBreak) {
            currentMins = overlappingBreak.end;
            continue;
        }

        const nextMins = currentMins + duration;

        const breakInSlot = breakRanges.find(b => 
            (currentMins < b.start && nextMins > b.start) || 
            (currentMins <= b.start && nextMins >= b.end) || 
            (currentMins > b.start && nextMins < b.end)     
        );

        if (breakInSlot) {
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

// --- CORE ALGORITHM: STRICT CONFLICT PREVENTER ---

interface AssignmentState {
    id: string;
    teacherId: string;
    teacherCode: string;
    teacherName: string;
    subject: string;
    className: string;
    grade: string;
    room: string;
    totalNeeded: number;
    remaining: number;
    maxConsecutive: number;
}

interface RuntimeState {
    // Tracks consecutive sessions for a class: "ClassID" -> { subject: "Math", count: 1, teacherId: "T1" }
    lastSlotClassState: Record<string, { subject: string, count: number, teacherId: string } | null>;
    teacherLoadRemaining: Record<string, number>;
}

export const generateSchedule = async (
  teachers: Teacher[],
  days: string[],
  timeSettings: TimeSettings
): Promise<ScheduleResponse> => {
    
    // 1. Setup Time Slots
    const daySlotsMap: Record<string, string[]> = {};
    const slotCountsPerDay: Record<string, number> = {};
    let totalSlotsAvailable = 0;

    // Strict Priority: Mon-Thu (Full days) -> Fri-Sat (Short/Overflow)
    const dayOrderPriority = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    const sortedDays = [...days].sort((a, b) => {
        const idxA = dayOrderPriority.indexOf(a.toLowerCase());
        const idxB = dayOrderPriority.indexOf(b.toLowerCase());
        return idxA - idxB;
    });

    for (const day of sortedDays) {
        const slots = calculateValidTimeSlots(timeSettings, day);
        daySlotsMap[day] = slots;
        slotCountsPerDay[day] = slots.length;
        totalSlotsAvailable += slots.length;
    }
    
    if (totalSlotsAvailable === 0) throw new Error("Pengaturan waktu tidak valid atau 0 slot tersedia.");

    // 2. Initialize Workload State
    const allAssignments: AssignmentState[] = [];
    const allUniqueClasses = new Set<string>();
    const teacherLoadRemaining: Record<string, number> = {}; // TeacherID -> Total Hours Left

    teachers.forEach(t => {
        let tTotal = 0;
        t.assignments.forEach(assign => {
            const classList = assign.classes.split(',').map(c => c.trim()).filter(c => c);
            classList.forEach(className => {
                allUniqueClasses.add(className);
                allAssignments.push({
                    id: `${t.code}-${className}-${assign.subjectName}-${Math.random().toString(36).substr(2, 5)}`,
                    teacherId: t.id,
                    teacherCode: t.code,
                    teacherName: t.name,
                    subject: assign.subjectName,
                    className: className,
                    grade: assign.grade,
                    room: assign.reqRoom,
                    totalNeeded: assign.weeklyCount,
                    remaining: assign.weeklyCount,
                    maxConsecutive: assign.maxConsecutiveSessions || 2
                });
                tTotal += assign.weeklyCount;
            });
        });
        teacherLoadRemaining[t.id] = tTotal;
    });

    const runtime: RuntimeState = {
        lastSlotClassState: {},
        teacherLoadRemaining
    };

    const finalSchedule: ScheduleItem[] = [];
    
    // 3. MAIN LOOP: Day -> Slot -> Greedy Allocation
    for (const day of sortedDays) {
        const slots = daySlotsMap[day] || [];
        
        // Reset daily consecutive tracking for new day
        runtime.lastSlotClassState = {}; 

        for (const slot of slots) {
            
            // TRACKING BUSY RESOURCES FOR THIS EXACT SLOT (07:00 - 07:40)
            const slotTeacherOccupied = new Set<string>(); // Uses Teacher ID
            const slotTeacherCodeOccupied = new Set<string>(); // Uses Teacher Code (Prevent Duplicate Person Conflict)
            const slotClassOccupied = new Set<string>();
            const slotRoomOccupied = new Set<string>();

            // We want to fill as many classes as possible in this slot.
            
            let madeMove = true;
            while (madeMove) {
                madeMove = false;

                // Identify potential moves
                const candidates: { assignmentIdx: number, score: number }[] = [];

                for (let i = 0; i < allAssignments.length; i++) {
                    const asg = allAssignments[i];
                    
                    // --- CRITICAL CONFLICT CHECKS ---
                    
                    // 1. Is this assignment already finished?
                    if (asg.remaining <= 0) continue; 
                    
                    // 2. Is the Class already studying something else this slot?
                    if (slotClassOccupied.has(asg.className)) continue; 
                    
                    // 3. Is the Teacher already teaching in another class this slot? (Check ID)
                    if (slotTeacherOccupied.has(asg.teacherId)) continue; 

                    // 4. Is the Teacher CODE busy? (Handles manual duplicate entries of same person)
                    if (slotTeacherCodeOccupied.has(asg.teacherCode)) continue;
                    
                    // 5. Is the Special Room busy?
                    if (asg.room !== 'Kelas Biasa' && slotRoomOccupied.has(asg.room)) continue; 

                    // 6. Is the Teacher available on this day?
                    const teacherObj = teachers.find(t => t.id === asg.teacherId);
                    if (teacherObj?.unavailableDays?.includes(day)) continue;

                    // --- SCORING SYSTEM ---
                    let score = 0;

                    // 1. CONTINUATION BONUS (Highest Priority)
                    // Keeps blocks together (e.g. 2 hours of Math back-to-back)
                    const lastState = runtime.lastSlotClassState[asg.className];
                    const isContinuation = lastState && lastState.subject === asg.subject && lastState.teacherId === asg.teacherId;
                    
                    if (isContinuation) {
                        if (lastState.count < asg.maxConsecutive) {
                            score += 50000; // HUGE bonus to prevent interruption
                        } else {
                            score -= 10000; // Max consecutive reached. Force switch.
                        }
                    } else if (lastState) {
                        // Switching subjects
                        score += 100;
                    } else {
                        // First slot of day
                        score += 100;
                    }

                    // 2. TEACHER LOAD & VARIETY
                    // If a teacher has a lot of hours left, prioritize them.
                    const tLoad = runtime.teacherLoadRemaining[asg.teacherId] || 0;
                    score += (tLoad * 100); 

                    // 3. REMAINING HOURS SPECIFIC SUBJECT
                    score += (asg.remaining * 50);

                    // 4. ROOM PRIORITY (Labs are scarce)
                    if (asg.room !== 'Kelas Biasa') score += 1000;

                    // 5. RANDOM NOISE (Break ties to prevent deterministic lockups)
                    score += Math.random() * 10;

                    candidates.push({ assignmentIdx: i, score });
                }

                // C. Pick Best Candidate
                if (candidates.length > 0) {
                    // Sort descending
                    candidates.sort((a, b) => b.score - a.score);
                    
                    const best = candidates[0];
                    const bestAsg = allAssignments[best.assignmentIdx];

                    // EXECUTE MOVE
                    finalSchedule.push({
                        day,
                        timeSlot: slot,
                        subject: bestAsg.subject,
                        teacher: bestAsg.teacherName,
                        teacherCode: bestAsg.teacherCode,
                        grade: bestAsg.grade,
                        className: bestAsg.className,
                        room: bestAsg.room
                    });

                    // Update State
                    bestAsg.remaining--;
                    runtime.teacherLoadRemaining[bestAsg.teacherId]--;
                    
                    // Mark Occupied (Crucial for next iteration of `while(madeMove)`)
                    slotTeacherOccupied.add(bestAsg.teacherId);
                    slotTeacherCodeOccupied.add(bestAsg.teacherCode); // Block this code globally for this slot
                    slotClassOccupied.add(bestAsg.className);
                    if (bestAsg.room !== 'Kelas Biasa') slotRoomOccupied.add(bestAsg.room);

                    // Update Consecutive State
                    const prevCount = (runtime.lastSlotClassState[bestAsg.className]?.subject === bestAsg.subject) 
                        ? runtime.lastSlotClassState[bestAsg.className]!.count 
                        : 0;
                    
                    runtime.lastSlotClassState[bestAsg.className] = {
                        subject: bestAsg.subject,
                        teacherId: bestAsg.teacherId,
                        count: prevCount + 1
                    };

                    madeMove = true; 
                }
            }
            
            // End of Slot Processing for this Class
            // If a class wasn't assigned anything in this slot, clear its consecutive state
            allUniqueClasses.forEach(cls => {
                if (!slotClassOccupied.has(cls)) {
                    runtime.lastSlotClassState[cls] = null;
                }
            });
        }
    }

    // 4. Inject Breaks (Visual)
    sortedDays.forEach(day => {
        const slots = calculateValidTimeSlots(timeSettings, day);
        if (slots.length === 0) return;

        const dayStartStr = timeSettings.dailyOverrides?.[day]?.start || timeSettings.startHour;
        const dayEndStr = timeSettings.dailyOverrides?.[day]?.end || timeSettings.endHour;
        const dStart = parseInt(dayStartStr.replace(':', ''));
        const dEnd = parseInt(dayEndStr.replace(':', ''));

        timeSettings.breaks.forEach(b => {
            const bStart = parseInt(b.startTime.replace(':', ''));
            const bEnd = parseInt(b.endTime.replace(':', ''));
            
            if (bStart >= dStart && bEnd <= dEnd) {
                 finalSchedule.push({
                    day: day,
                    timeSlot: `${b.startTime} - ${b.endTime}`,
                    subject: b.name,
                    teacher: '-',
                    teacherCode: '',
                    grade: '',
                    className: '',
                    room: '-',
                    isBreak: true
                });
            }
        });
    });

    // 5. Diagnostics
    const classLoadStats: Record<string, { needed: number, assigned: number, failed: number }> = {};
    const teacherLoadStats: Record<string, { assigned: number, failed: number }> = {};
    const unassignedItems: ScheduleItem[] = [];

    // Init stats
    allAssignments.forEach(a => {
        if(!classLoadStats[a.className]) classLoadStats[a.className] = { needed: 0, assigned: 0, failed: 0 };
        classLoadStats[a.className].needed += a.totalNeeded;
    });

    // Count Success
    finalSchedule.forEach(item => {
        if(item.isBreak) return;
        if(classLoadStats[item.className]) classLoadStats[item.className].assigned++;
        
        if(!teacherLoadStats[item.teacherCode]) teacherLoadStats[item.teacherCode] = { assigned: 0, failed: 0 };
        teacherLoadStats[item.teacherCode].assigned++;
    });

    // Collect Failures
    allAssignments.forEach(a => {
        if (a.remaining > 0) {
            for(let k=0; k<a.remaining; k++) {
                unassignedItems.push({
                    day: 'Gagal',
                    timeSlot: '-',
                    subject: a.subject,
                    teacher: a.teacherName,
                    teacherCode: a.teacherCode,
                    grade: a.grade,
                    className: a.className,
                    room: a.room,
                    isUnassigned: true
                });
                if(classLoadStats[a.className]) classLoadStats[a.className].failed++;
                if(!teacherLoadStats[a.teacherCode]) teacherLoadStats[a.teacherCode] = { assigned:0, failed:0 };
                teacherLoadStats[a.teacherCode].failed++;
            }
        }
    });

    finalSchedule.sort((a, b) => {
        const dayDiff = sortedDays.indexOf(a.day) - sortedDays.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.timeSlot.localeCompare(b.timeSlot);
    });

    const totalHoursRequired = allAssignments.reduce((acc, a) => acc + a.totalNeeded, 0);
    const totalFailed = unassignedItems.length;
    const successRate = totalHoursRequired > 0 
        ? Math.round(((totalHoursRequired - totalFailed) / totalHoursRequired) * 100) 
        : 100;
    
    let title = totalFailed === 0 
        ? "Jadwal Sempurna (100% Terisi)" 
        : `Jadwal (${successRate}% Terisi - Gagal ${totalFailed} JP)`;

    return {
        scheduleName: title,
        items: finalSchedule,
        diagnosis: {
            totalSlotsAvailable,
            slotCountsPerDay,
            classLoad: classLoadStats,
            teacherLoad: teacherLoadStats,
            unassignedItems
        }
    };
};

// --- ANALYTICS ---
export const analyzeScheduleWithAI = async (schedule: ScheduleResponse): Promise<string> => {
  try {
    const response = await fetch("/api/analyze-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule }),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze schedule");
    }

    const data = await response.json();
    return data.text || "Gagal menganalisis jadwal.";
  } catch (e) {
    console.error("Analysis Error:", e);
    return "Maaf, analisis AI sedang tidak dapat digunakan saat ini.";
  }
};

export const searchNearbyPlaces = async (
  latitude: number,
  longitude: number,
  query: string
): Promise<{ text: string; places: PlaceResult[] }> => {
  try {
    const response = await fetch("/api/nearby-places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude, query }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch nearby places");
    }

    const data = await response.json();
    return { text: data.text, places: data.places };
  } catch (error) {
    console.error("Map Error", error);
    throw new Error("Gagal mengambil data lokasi.");
  }
};