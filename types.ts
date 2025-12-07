export interface TeacherAssignment {
  id: string;
  subjectName: string;
  grade: string;        // Tingkat (e.g. "7")
  classes: string;      // Kelas target (e.g. "7A, 7B")
  duration: number;     // Durasi per sesi (menit)
  weeklyCount: number;  // Jumlah jam per minggu (JP)
  maxConsecutiveSessions: number; // Maksimal jam berturut-turut dalam 1 hari
  reqRoom: string;      // Jenis Ruangan (e.g. "Kelas Biasa", "Lab Komputer")
}

export interface Teacher {
  id: string;
  name: string;
  code: string;
  unavailableDays: string[]; // Hari dimana guru TIDAK BISA mengajar
  assignments: TeacherAssignment[];
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "7A"
  grade: string; // e.g. "7"
}

export interface SchoolBreak {
  id: string;
  name: string;      // e.g. "Istirahat 1", "Sholat Dzuhur"
  startTime: string; // e.g. "10:00"
  endTime: string;   // e.g. "10:20"
}

export interface TimeSettings {
  startHour: string; // e.g. "07:00"
  endHour: string;   // e.g. "15:00"
  breaks: SchoolBreak[];
}

export interface ScheduleItem {
  day: string;
  timeSlot: string;
  subject: string;
  teacher: string;
  teacherCode: string;
  grade: string;      
  className: string;  
  room?: string;
}

export interface ScheduleResponse {
  scheduleName: string;
  items: ScheduleItem[];
}

export enum AppStatus {
  IDLE,
  GENERATING,
  SUCCESS,
  ERROR
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { 
    uri: string; 
    title: string;
    placeAnswerSources?: { reviewSnippets?: { url: string }[] }
  };
}

export interface PlaceResult {
  title: string;
  address?: string;
  uri: string;
  description?: string;
}