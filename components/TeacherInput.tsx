import React, { useState, useEffect } from 'react';
import { Teacher, TeacherAssignment } from '../types';
import { Plus, Trash2, User, BookOpen, Layers, Info, Keyboard, Hash, MapPin, CalendarX, Split, Pencil, Check, X } from 'lucide-react';

interface Props {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
}

export const TeacherInput: React.FC<Props> = ({ teachers, setTeachers }) => {
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unavailableDays, setUnavailableDays] = useState<string[]>([]);
  
  // Local state for assignments within the form
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  // Input states
  const [subjName, setSubjName] = useState('');
  const [subjMode, setSubjMode] = useState<'select' | 'manual'>('select'); 

  const [subjDuration, setSubjDuration] = useState<number>(40);
  
  const [weeklyCount, setWeeklyCount] = useState<number>(2);
  const [maxConsecutive, setMaxConsecutive] = useState<number>(2); 
  const [reqRoom, setReqRoom] = useState<string>('Kelas Biasa');

  // Grade & Class Logic
  const [gradeMode, setGradeMode] = useState<'select' | 'manual'>('select');
  const [selectedGrade, setSelectedGrade] = useState('7');
  const [manualGrade, setManualGrade] = useState('');

  const [classMode, setClassMode] = useState<'select' | 'manual'>('select');
  const [selectedClassSuffix, setSelectedClassSuffix] = useState('A');
  const [manualClass, setManualClass] = useState('');

  // Validate Max Consecutive when Weekly Count changes
  useEffect(() => {
    if (maxConsecutive > weeklyCount) {
        setMaxConsecutive(weeklyCount);
    }
  }, [weeklyCount, maxConsecutive]);

  const gradeOptions = ['7', '8', '9', '10', '11', '12'];
  const classSuffixOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const roomOptions = ['Kelas Biasa', 'Lab Komputer', 'Lab IPA', 'Lab Bahasa', 'Lapangan Olahraga', 'Aula'];
  
  const smpSubjects = [
    "Pendidikan Agama",
    "PPKn",
    "Bahasa Indonesia",
    "Matematika",
    "Ilmu Pengetahuan Alam (IPA)",
    "Ilmu Pengetahuan Sosial (IPS)",
    "Bahasa Inggris",
    "Seni Budaya",
    "PJOK",
    "Prakarya",
    "Informatika",
    "Bahasa Daerah",
    "Bimbingan Konseling (BK)"
  ];

  const toggleUnavailableDay = (day: string) => {
    setUnavailableDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setUnavailableDays([]);
    setAssignments([]);
    setSubjName('');
    setWeeklyCount(2);
    setMaxConsecutive(2);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setName(teacher.name);
    setCode(teacher.code);
    setUnavailableDays(teacher.unavailableDays || []);
    setAssignments([...teacher.assignments]); // Clone to avoid mutation refs
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addAssignment = () => {
    if (!subjName) return;

    let finalGradeString = gradeMode === 'select' ? selectedGrade : manualGrade;
    let finalClassString = '';
    if (classMode === 'select') {
        if (gradeMode === 'select') {
             finalClassString = `${selectedGrade}${selectedClassSuffix}`;
        } else {
             finalClassString = `${manualGrade} (${selectedClassSuffix})`; 
             if (manualGrade.includes(',')) {
                 finalClassString = manualClass || `Kelas ${selectedClassSuffix}`;
             } else {
                 finalClassString = `${manualGrade}${selectedClassSuffix}`;
             }
        }
    } else {
        finalClassString = manualClass;
    }

    const safeWeeklyCount = Math.max(1, weeklyCount);
    const safeMaxConsecutive = Math.min(Math.max(1, maxConsecutive), safeWeeklyCount);

    // Logic for Bulk Grades (Comma Separated)
    const isBulkGrade = gradeMode === 'manual' && finalGradeString.includes(',');
    
    if (isBulkGrade) {
        const gradesInput = finalGradeString.split(',').map(g => g.trim()).filter(g => g !== '');
        const newAssignments: TeacherAssignment[] = gradesInput.map((g, index) => ({
            id: Date.now().toString() + Math.random() + index,
            subjectName: subjName,
            grade: g,
            classes: classMode === 'manual' ? finalClassString : '',
            duration: subjDuration,
            weeklyCount: safeWeeklyCount,
            maxConsecutiveSessions: safeMaxConsecutive,
            reqRoom: reqRoom
        }));
        setAssignments([...assignments, ...newAssignments]);
    } else {
        const newAsg: TeacherAssignment = {
            id: Date.now().toString() + Math.random(),
            subjectName: subjName,
            grade: finalGradeString,
            classes: finalClassString,
            duration: subjDuration,
            weeklyCount: safeWeeklyCount,
            maxConsecutiveSessions: safeMaxConsecutive,
            reqRoom: reqRoom
        };
        setAssignments([...assignments, newAsg]);
    }
    
    setManualClass('');
    if(gradeMode === 'manual') setManualGrade('');
    setWeeklyCount(2); 
    setMaxConsecutive(2);
    setReqRoom('Kelas Biasa');
  };

  const removeAssignment = (id: string) => {
    setAssignments(assignments.filter(a => a.id !== id));
  };

  const handleSaveTeacher = () => {
    if (!name || !code || assignments.length === 0) return;

    if (editingId) {
        // Update existing
        setTeachers(prev => prev.map(t => {
            if (t.id === editingId) {
                return {
                    ...t,
                    name,
                    code,
                    unavailableDays,
                    assignments
                };
            }
            return t;
        }));
    } else {
        // Add new
        const newTeacher: Teacher = {
            id: Date.now().toString(),
            name,
            code,
            assignments: assignments,
            unavailableDays: unavailableDays
        };
        setTeachers([...teachers, newTeacher]);
    }
    
    resetForm();
  };

  const removeTeacher = (id: string) => {
    if (editingId === id) resetForm();
    setTeachers(teachers.filter(t => t.id !== id));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-indigo-700">
        <User size={24} /> {editingId ? 'Edit Data Guru' : 'Input Data Guru & Mapel'}
      </h2>

      {/* --- FORM INPUT --- */}
      <div className={`p-5 rounded-xl border mb-8 transition-colors ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex justify-between items-center mb-4">
            <h3 className={`font-medium flex items-center gap-2 ${editingId ? 'text-amber-700' : 'text-slate-800'}`}>
                {editingId ? <Pencil className="w-4 h-4"/> : <Plus className="w-4 h-4 text-indigo-500"/>} 
                {editingId ? 'Update Data Guru' : 'Tambah Guru Baru'}
            </h3>
            {editingId && (
                <button onClick={resetForm} className="text-xs text-slate-500 underline hover:text-slate-800">
                    Batal Edit
                </button>
            )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nama Guru</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              placeholder="Contoh: Ir. Rizki Fauzi Rachman, M.Pd"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Kode Guru</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              placeholder="Contoh: B01"
            />
          </div>
        </div>

        {/* Unavailable Days Input */}
        <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CalendarX size={12}/> Hari Tidak Bersedia / Libur Guru
            </label>
            <div className="flex flex-wrap gap-2">
                {daysOfWeek.map(day => (
                    <button
                        key={day}
                        onClick={() => toggleUnavailableDay(day)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                            unavailableDays.includes(day)
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {day}
                    </button>
                ))}
            </div>
        </div>

        {/* --- FORM ASSIGNMENT (MAPEL) --- */}
        <div className="bg-white p-4 rounded-lg border border-indigo-100 mb-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-50 px-3 py-1 rounded-bl-lg text-[10px] text-indigo-600 border-b border-l border-indigo-100 flex items-center gap-1">
                <Info size={10} /> Tips: Atur Max Sesi agar tidak 6 jam nonstop.
            </div>

            <div className="flex flex-col gap-3 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    
                    {/* Mapel (3 cols) */}
                    <div className="md:col-span-3">
                        <label className="block text-xs text-slate-500 mb-1">Mata Pelajaran</label>
                        {subjMode === 'select' ? (
                            <select
                                value={subjName}
                                onChange={(e) => {
                                    if(e.target.value === 'manual_opt') {
                                        setSubjMode('manual');
                                        setSubjName('');
                                    } else {
                                        setSubjName(e.target.value);
                                    }
                                }}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none bg-white"
                            >
                                <option value="" disabled>Pilih Mapel...</option>
                                {smpSubjects.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                <option value="manual_opt">Manual...</option>
                            </select>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={subjName}
                                    onChange={(e) => setSubjName(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none pr-6"
                                    placeholder="Nama Mapel..."
                                    autoFocus
                                />
                                <button 
                                    onClick={() => setSubjMode('select')}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                                    title="Kembali ke Pilihan"
                                >
                                    <Keyboard size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tingkat & Kelas (Combined for space - 3 cols) */}
                    <div className="md:col-span-3 grid grid-cols-2 gap-2">
                        <div>
                             <label className="block text-xs text-slate-500 mb-1">Tingkat</label>
                             <select
                                value={gradeMode === 'select' ? selectedGrade : manualGrade}
                                onChange={(e) => {
                                    if(e.target.value === 'manual_opt') setGradeMode('manual');
                                    else setSelectedGrade(e.target.value);
                                }}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none bg-white"
                             >
                                {gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                        </div>
                         <div>
                             <label className="block text-xs text-slate-500 mb-1">Kelas</label>
                             <select
                                value={classMode === 'select' ? selectedClassSuffix : manualClass}
                                onChange={(e) => {
                                    if(e.target.value === 'manual_opt') setClassMode('manual');
                                    else setSelectedClassSuffix(e.target.value);
                                }}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-indigo-500 outline-none bg-white"
                             >
                                {classSuffixOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                        </div>
                    </div>

                    {/* Jumlah Jam Total (1.5 cols) */}
                    <div className="md:col-span-2">
                        <label className="block text-xs text-slate-500 mb-1 font-semibold text-indigo-600">Total/Minggu</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={weeklyCount}
                                onChange={(e) => setWeeklyCount(Number(e.target.value))}
                                className="w-full p-2 border border-indigo-200 bg-indigo-50 rounded-md text-sm focus:border-indigo-500 outline-none font-medium text-indigo-900"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-400 font-bold pointer-events-none">JP</div>
                        </div>
                    </div>

                    {/* Max Consecutive (1.5 cols) */}
                    <div className="md:col-span-2">
                        <label className="block text-xs text-slate-500 mb-1 font-semibold text-orange-600">Max Jam/Hari</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="8"
                                value={maxConsecutive}
                                onChange={(e) => setMaxConsecutive(Number(e.target.value))}
                                className="w-full p-2 border border-orange-200 bg-orange-50 rounded-md text-sm focus:border-orange-500 outline-none font-medium text-orange-900"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-orange-400 font-bold pointer-events-none">JP</div>
                        </div>
                    </div>

                    {/* Ruangan Khusus (1.5 cols) - Shrink slightly */}
                    <div className="md:col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">Ruangan</label>
                        <select
                            value={reqRoom}
                            onChange={(e) => setReqRoom(e.target.value)}
                            className={`w-full p-2 border rounded-md text-sm focus:border-indigo-500 outline-none ${reqRoom !== 'Kelas Biasa' ? 'bg-amber-50 border-amber-300 text-amber-800 font-medium' : 'bg-white border-slate-300'}`}
                        >
                            {roomOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    
                    {/* Add Button (1 col) */}
                    <div className="md:col-span-12 lg:col-span-12 xl:col-span-1 mt-2 xl:mt-0">
                        <button
                            onClick={addAssignment}
                            disabled={!subjName}
                            className="w-full p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
                            title="Tambah Mapel"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* List of temporary assignments */}
            {assignments.length > 0 && (
                <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Tugas Mengajar ({assignments.length}):</p>
                    {assignments.map(asg => (
                        <div key={asg.id} className="flex items-center justify-between bg-indigo-50/50 p-2 rounded text-sm border border-indigo-100">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="font-medium text-slate-800 flex items-center gap-1">
                                    <BookOpen size={14} className="text-indigo-400"/> {asg.subjectName}
                                </span>
                                <span className="text-slate-500 text-xs flex items-center gap-1">
                                    <Layers size={12}/> {asg.grade} - {asg.classes || 'Auto'}
                                </span>
                                {/* Badge JP */}
                                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1 border border-indigo-200">
                                    <Hash size={10}/> {asg.weeklyCount} JP
                                </span>
                                {/* Badge Max Consecutive */}
                                <span className="text-xs font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-200">
                                    <Split size={10}/> Max {asg.maxConsecutiveSessions}
                                </span>
                                {/* Badge Room */}
                                {asg.reqRoom !== 'Kelas Biasa' && (
                                    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-200">
                                        <MapPin size={10}/> {asg.reqRoom}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => removeAssignment(asg.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <button
          onClick={handleSaveTeacher}
          disabled={!name || !code || assignments.length === 0}
          className={`w-full py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all font-medium shadow-sm ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {editingId ? <Check size={18} /> : <Plus size={18} />} 
          {editingId ? 'Simpan Perubahan' : 'Simpan Data Guru'}
        </button>
      </div>

      {/* --- LIST GURU TERSIMPAN --- */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 border-b border-slate-100 pb-2">Daftar Guru ({teachers.length})</h3>
        
        {teachers.length === 0 && <p className="text-center text-slate-400 py-6 text-sm italic">Belum ada data guru. Silakan tambah di atas.</p>}

        {teachers.map(teacher => (
          <div key={teacher.id} className={`bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-all ${editingId === teacher.id ? 'ring-2 ring-amber-400 border-amber-200' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        {teacher.name}
                        {teacher.unavailableDays && teacher.unavailableDays.length > 0 && (
                             <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded flex items-center gap-1 font-normal">
                                <CalendarX size={10} /> Libur: {teacher.unavailableDays.join(', ')}
                             </span>
                        )}
                    </h4>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                        Kode: {teacher.code}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleEditTeacher(teacher)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="Edit Guru"
                    >
                        <Pencil size={16} />
                    </button>
                    <button 
                        onClick={() => removeTeacher(teacher.id)} 
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Hapus Guru"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            
            <div className="space-y-1 mt-3">
                {teacher.assignments.map((asg, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                        <span className="font-medium text-indigo-700 flex items-center gap-1">
                             {asg.subjectName}
                        </span>
                        <div className="flex items-center gap-2 text-slate-500">
                            <span>Kls {asg.classes || asg.grade}</span>
                            <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">Tot {asg.weeklyCount} JP</span>
                            <span className="font-bold text-orange-600 bg-orange-50 px-1 rounded border border-orange-100">Max {asg.maxConsecutiveSessions}</span>
                            {asg.reqRoom !== 'Kelas Biasa' && (
                                <span className="text-amber-600 bg-amber-50 px-1 rounded border border-amber-100 flex items-center gap-0.5">
                                    <MapPin size={8}/> {asg.reqRoom}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};