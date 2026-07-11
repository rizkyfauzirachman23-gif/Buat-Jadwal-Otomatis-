import * as XLSX from 'xlsx';
import { Teacher, ScheduleResponse } from '../types';

// --- DATABASE (HIDDEN) ---
const REF_MAPEL = [
  "Pendidikan Agama", "PPKn", "Bahasa Indonesia", "Matematika", 
  "IPA", "IPS", "Bahasa Inggris", "Seni Budaya", "PJOK", 
  "Prakarya", "Informatika", "Bahasa Daerah", "BK", "Sejarah", 
  "Geografi", "Ekonomi", "Sosiologi", "Fisika", "Kimia", "Biologi", 
  "Antropologi", "Bahasa Arab", "Ekstrakurikuler", "Proyek P5"
];

const REF_TINGKAT = ["7", "8", "9", "10", "11", "12"];
const REF_RUANGAN = ["Kelas Biasa", "Lab Komputer", "Lab IPA", "Lab Bahasa", "Lapangan", "Aula", "Perpustakaan"];

export const downloadExcelTemplate = () => {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: INPUT DATA (PROFESSIONAL HEADER)
  // ==========================================
  
  // 1. Define Data with Title and Instructions in top rows
  const titleRow = ["TEMPLATE INPUT JADWAL OTOMATIS"];
  const subTitleRow = ["Petunjuk: Isi data guru di bawah header. Gunakan dropdown pada kolom Mapel, Tingkat, dan Ruangan."];
  const spacerRow = [""];
  
  const headers = [
    'KODE GURU',      // A
    'NAMA LENGKAP',   // B
    'LIBUR (HARI)',   // C
    'MAPEL',          // D
    'TINGKAT',        // E
    'KELAS',          // F
    'DURASI',         // G
    'JP/MINGGU',      // H
    'MAX SESI',       // I
    'RUANGAN'         // J
  ];

  // Dummy Data (Hanya 1 baris contoh)
  const sampleData = [
    {
      'KODE GURU': 'G01',
      'NAMA LENGKAP': 'Contoh Guru',
      'LIBUR (HARI)': '',
      'MAPEL': 'Matematika',
      'TINGKAT': '7',
      'KELAS': '7A',
      'DURASI': 40,
      'JP/MINGGU': 4,
      'MAX SESI': 2,
      'RUANGAN': 'Kelas Biasa'
    }
  ];

  // Create a combined array of arrays for the sheet
  const wsData: any[][] = [
      titleRow,
      subTitleRow,
      spacerRow,
      headers,
      ...sampleData.map(d => [
          d['KODE GURU'], d['NAMA LENGKAP'], d['LIBUR (HARI)'], d['MAPEL'], 
          d['TINGKAT'], d['KELAS'], d['DURASI'], d['JP/MINGGU'], d['MAX SESI'], d['RUANGAN']
      ])
  ];

  // Fill empty rows for user convenience (BUT EMPTY VALUES)
  for(let i=0; i<50; i++) {
      wsData.push(['', '', '', '', '', '', '', '', '', '']);
  }

  const wsInput = XLSX.utils.aoa_to_sheet(wsData);

  // Column Widths
  wsInput['!cols'] = [
    { wch: 12 }, // Kode
    { wch: 30 }, // Nama
    { wch: 15 }, // Libur
    { wch: 25 }, // Mapel
    { wch: 10 }, // Tingkat
    { wch: 20 }, // Kelas
    { wch: 10 }, // Durasi
    { wch: 12 }, // JP
    { wch: 10 }, // Max
    { wch: 20 }, // Ruangan
  ];

  // Merges for Title
  wsInput['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Title spans A1:J1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }  // Subtitle spans A2:J2
  ];

  // Data Validation
  const startRow = 5; 
  const endRow = 100;

  if (!wsInput['!dataValidation']) wsInput['!dataValidation'] = [];
  
  wsInput['!dataValidation'].push(
    { sqref: `D${startRow}:D${endRow}`, type: "list", operator: "equal", formula1: "'DB'!$A$1:$A$50", showDropDown: true }, // Mapel
    { sqref: `E${startRow}:E${endRow}`, type: "list", operator: "equal", formula1: "'DB'!$B$1:$B$20", showDropDown: true }, // Tingkat
    { sqref: `J${startRow}:J${endRow}`, type: "list", operator: "equal", formula1: "'DB'!$C$1:$C$20", showDropDown: true }  // Ruangan
  );

  XLSX.utils.book_append_sheet(wb, wsInput, "INPUT DATA");

  // ==========================================
  // SHEET 2: DB (HIDDEN REFERENCE)
  // ==========================================
  const refData = [];
  const maxRows = Math.max(REF_MAPEL.length, REF_TINGKAT.length, REF_RUANGAN.length);
  for(let i=0; i<maxRows; i++) {
    refData.push([REF_MAPEL[i]||"", REF_TINGKAT[i]||"", REF_RUANGAN[i]||""]);
  }
  const wsDB = XLSX.utils.aoa_to_sheet(refData);
  XLSX.utils.book_append_sheet(wb, wsDB, "DB");
  
  // Hide DB Sheet
  if(!wb.Workbook) wb.Workbook = {};
  if(!wb.Workbook.Sheets) wb.Workbook.Sheets = [];
  wb.Workbook.Sheets[1] = { Hidden: 1 }; // Index 1 is "DB"

  XLSX.writeFile(wb, "Template_Jadwal_Profesional.xlsx");
};

export const parseExcelToTeachers = async (file: File): Promise<Teacher[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        let targetSheetName = '';
        let headerRowIndex = 0;

        for (const name of workbook.SheetNames) {
            const sheet = workbook.Sheets[name];
            const range = XLSX.utils.decode_range(sheet['!ref'] || "A1:Z20");
            
            for (let R = range.s.r; R <= Math.min(range.e.r, 10); ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
                    const cell = sheet[cellAddress];
                    if (cell && cell.v && String(cell.v).toUpperCase().includes('KODE')) {
                        targetSheetName = name;
                        headerRowIndex = R;
                        break;
                    }
                }
                if (targetSheetName) break;
            }
            if (targetSheetName) break;
        }

        if (!targetSheetName) targetSheetName = workbook.SheetNames[0];

        const sheet = workbook.Sheets[targetSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { range: headerRowIndex });
        const teachersMap = new Map<string, Teacher>();

        jsonData.forEach((row, index) => {
            const get = (k: string) => row[Object.keys(row).find(key => key.toUpperCase().includes(k)) || ''];

            const codeRaw = get('KODE');
            const nameRaw = get('NAMA');
            
            if (!codeRaw || !nameRaw) return;

            const code = String(codeRaw).trim();
            const name = String(nameRaw).trim();

            if (!teachersMap.has(code)) {
                teachersMap.set(code, {
                    id: `xls-${code}-${Date.now()}`,
                    code,
                    name,
                    unavailableDays: get('LIBUR') ? String(get('LIBUR')).split(',').map(d=>d.trim()) : [],
                    assignments: []
                });
            }

            const t = teachersMap.get(code)!;
            const mapel = get('MAPEL');

            if (mapel) {
                const rawKelas = get('KELAS') ? String(get('KELAS')) : '';
                const classList = rawKelas.includes(',') ? rawKelas.split(',') : [rawKelas];
                const grade = get('TINGKAT') ? String(get('TINGKAT')) : '';

                classList.forEach((c, i) => {
                    let className = c.trim();
                    const startsWithNumber = /^\d/.test(className);
                    
                    if (!startsWithNumber && grade) {
                        className = `${grade}${className}`;
                    }

                    if(!className && grade) className = `${grade} All`;

                    if(className) {
                        t.assignments.push({
                            id: `asg-${code}-${index}-${i}`,
                            subjectName: String(mapel),
                            grade: grade,
                            classes: className,
                            duration: Number(get('DURASI')) || 40,
                            weeklyCount: Number(get('JP')) || 2,
                            maxConsecutiveSessions: Number(get('MAX')) || 2,
                            reqRoom: get('RUANGAN') || 'Kelas Biasa'
                        });
                    }
                });
            }
        });

        resolve(Array.from(teachersMap.values()));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const exportScheduleToExcel = (schedule: ScheduleResponse) => {
    const wb = XLSX.utils.book_new();

    // 1. DATA PREPARATION
    const days = Array.from(new Set(schedule.items.map(i => i.day)));
    // Get unique classes sorted
    const allClasses = Array.from(new Set(schedule.items.filter(i => !i.isBreak).map(i => i.className))).sort();

    // ============================================
    // SHEET PER DAY (GRID / MATRIX VIEW)
    // ============================================
    days.forEach(day => {
        const dayItems = schedule.items.filter(i => i.day === day);
        const timeSlots = Array.from(new Set(dayItems.map(i => i.timeSlot))).sort();

        // Build Matrix Header
        // Row 1: Title
        // Row 2: Header (Jam, Kelas A, Kelas B...)
        const headerRow = ["JAM", ...allClasses];
        const matrixData: any[][] = [
            [`JADWAL PELAJARAN HARI: ${day.toUpperCase()}`],
            headerRow
        ];

        // Merge logic for breaks
        const merges: any[] = [];
        // Title merge
        merges.push({ s: {r:0, c:0}, e: {r:0, c: allClasses.length} });

        // Build Data Rows
        timeSlots.forEach((time, tIdx) => {
            const rowData: string[] = [time];
            let isBreakRow = false;
            let breakName = "";

            // Check if this timeslot is a break (check any item in this slot)
            const breakItem = dayItems.find(i => i.timeSlot === time && i.isBreak);
            if (breakItem) {
                isBreakRow = true;
                breakName = breakItem.subject; // e.g., "Istirahat"
            }

            if (isBreakRow) {
                // If it's a break, we can just put the break name across
                // But to make it work with the loop, we fill the first cell, and merge later
                rowData.push(breakName);
                for (let k = 0; k < allClasses.length - 1; k++) {
                     rowData.push(""); // Fill remaining cols empty for merge
                }
                // Merge this row from Col 1 (after JAM) to End
                // Row index in excel = 2 (headers) + tIdx
                const currentRowIdx = 2 + tIdx;
                merges.push({ s: {r: currentRowIdx, c: 1}, e: {r: currentRowIdx, c: allClasses.length} });
            } else {
                // Regular Slot: Find class data
                allClasses.forEach(cls => {
                    const item = dayItems.find(i => i.timeSlot === time && i.className === cls && !i.isBreak);
                    if (item) {
                        // Professional Format: Subject (Alt+Enter) Teacher (Alt+Enter) Room
                        const cellText = `${item.subject}\r\n${item.teacher}\r\n(${item.room || '-'})`;
                        rowData.push(cellText);
                    } else {
                        rowData.push("-");
                    }
                });
            }
            matrixData.push(rowData);
        });

        const ws = XLSX.utils.aoa_to_sheet(matrixData);

        // Styling Hints
        // Set Column Widths
        const cols = [{ wch: 15 }]; // Col A (Jam) width
        allClasses.forEach(() => cols.push({ wch: 25 })); // Class columns width
        ws['!cols'] = cols;
        ws['!merges'] = merges;

        // Force wrap text for all cells (doesn't always work in all viewers without Pro, but standard practice)
        // Note: XLSX Community edition has limited styling, but \r\n works if "Wrap Text" is enabled by user
        
        XLSX.utils.book_append_sheet(wb, ws, day);
    });

    // ============================================
    // SHEET LAST: MASTER DATA (LIST VIEW)
    // ============================================
    const listData: any[][] = [];
    listData.push(["NO", "HARI", "JAM", "KELAS", "MATA PELAJARAN", "GURU", "RUANGAN"]);
    
    let counter = 1;
    days.forEach(day => {
        const sortedItems = schedule.items
            .filter(i => i.day === day && !i.isBreak) // Exclude breaks for master list
            .sort((a,b) => a.timeSlot.localeCompare(b.timeSlot) || a.className.localeCompare(b.className));
        
        sortedItems.forEach(item => {
            listData.push([
                counter++,
                day,
                item.timeSlot,
                item.className,
                item.subject,
                item.teacher,
                item.room
            ]);
        });
    });

    const wsList = XLSX.utils.aoa_to_sheet(listData);
    wsList['!cols'] = [{wch:5}, {wch:10}, {wch:15}, {wch:10}, {wch:30}, {wch:30}, {wch:15}];
    XLSX.utils.book_append_sheet(wb, wsList, "DATA MENTAH");

    XLSX.writeFile(wb, `Jadwal_Lengkap_Grid_${new Date().toISOString().slice(0,10)}.xlsx`);
};