import React, { useState } from 'react';
import { SchoolClass } from '../types';
import { Plus, Trash2, Users, Keyboard } from 'lucide-react';

interface Props {
  classes: SchoolClass[];
  setClasses: React.Dispatch<React.SetStateAction<SchoolClass[]>>;
}

export const ClassInput: React.FC<Props> = ({ classes, setClasses }) => {
  // Mode toggle: 'select' or 'manual'
  const [inputMode, setInputMode] = useState<'select' | 'manual'>('select');
  
  // Select mode states
  const [selectedGrade, setSelectedGrade] = useState('7');
  const [selectedSuffix, setSelectedSuffix] = useState('A');

  // Manual mode states
  const [manualName, setManualName] = useState('');
  const [manualGrade, setManualGrade] = useState('');

  const gradeOptions = ['7', '8', '9', '10', '11', '12'];
  const suffixOptions = ['A', 'B', 'C', 'D', 'E', '1', '2', '3'];

  const handleAdd = () => {
    let finalName = '';
    let finalGrade = '';

    if (inputMode === 'select') {
      finalGrade = selectedGrade;
      finalName = `${selectedGrade}${selectedSuffix}`;
    } else {
      finalGrade = manualGrade;
      finalName = manualName;
    }

    if (!finalName || !finalGrade) return;

    const newClass: SchoolClass = {
      id: Date.now().toString(),
      name: finalName,
      grade: finalGrade,
    };
    
    setClasses([...classes, newClass]);
    
    // Reset manual inputs if used
    setManualName('');
    setManualGrade('');
  };

  const removeClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  const addCommonClasses = () => {
    const common = [
        { name: '7A', grade: '7' }, { name: '7B', grade: '7' },
        { name: '8A', grade: '8' }, { name: '8B', grade: '8' },
        { name: '9A', grade: '9' }, { name: '9B', grade: '9' }
    ];
    const newClasses = common.map(c => ({ id: Math.random().toString(), ...c }));
    setClasses([...classes, ...newClasses]);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-indigo-700">
            <Users size={24} /> Data Kelas
        </h2>
        <div className="flex gap-3">
            <button 
                onClick={() => setInputMode(inputMode === 'select' ? 'manual' : 'select')}
                className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
            >
                <Keyboard size={14} /> {inputMode === 'select' ? 'Mode Manual' : 'Mode Pilihan'}
            </button>
            <button onClick={addCommonClasses} className="text-xs text-indigo-600 hover:underline font-medium">
                + Isi Otomatis (SMP)
            </button>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {inputMode === 'select' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tingkat</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                    {gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Suffix (Huruf/Angka)</label>
                <select
                  value={selectedSuffix}
                  onChange={(e) => setSelectedSuffix(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                    {suffixOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <p className="text-xs text-slate-400 mt-1">Hasil: <b>{selectedGrade}{selectedSuffix}</b></p>
              </div>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tingkat</label>
                <input
                  type="text"
                  value={manualGrade}
                  onChange={(e) => setManualGrade(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: 10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap Kelas</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: 10 IPA 1"
                />
              </div>
            </div>
        )}

        <button
          onClick={handleAdd}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Plus size={18} /> Tambah Kelas
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {classes.map(cls => (
          <div key={cls.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="font-medium text-slate-900">{cls.name}</p>
              <p className="text-xs text-slate-500">Tingkat {cls.grade}</p>
            </div>
            <button onClick={() => removeClass(cls.id)} className="text-red-500 hover:text-red-700 p-1">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {classes.length === 0 && <p className="text-center text-slate-400 py-4 text-sm">Belum ada data kelas.</p>}
      </div>
    </div>
  );
};