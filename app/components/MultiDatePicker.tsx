'use client';
import { useState } from 'react';

export default function MultiDatePicker({ selectedDates, onChange }: { selectedDates: string[], onChange: (dates: string[]) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      onChange(selectedDates.filter(d => d !== dateStr));
    } else {
      onChange([...selectedDates, dateStr].sort());
    }
  };

  // Ayın günlerini oluştur
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-xl w-full max-w-sm">
      <div className="flex justify-between items-center mb-4">
        <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="text-zinc-400 hover:text-white">&lt;</button>
        <span className="text-sm font-bold text-zinc-200">
          {currentMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="text-zinc-400 hover:text-white">&gt;</button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-[10px] text-zinc-500 text-center mb-2">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => <div key={i} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isSelected = selectedDates.includes(dateStr);
          return (
            <button key={d} type="button" onClick={() => toggleDate(dateStr)} 
              className={`h-8 w-full rounded flex items-center justify-center text-xs transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}