
import React from 'react';
import { TimeEntry } from '../types';

interface TrackerTableProps {
  entries: TimeEntry[];
  onUpdate: (index: number, field: keyof TimeEntry, value: string) => void;
  editable: boolean;
}

const TrackerTable: React.FC<TrackerTableProps> = ({ entries, onUpdate, editable }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-slate-500">
        <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
          <tr>
            <th scope="col" className="px-6 py-4 font-bold w-48">Date</th>
            <th scope="col" className="px-6 py-4 font-bold w-32">Day</th>
            <th scope="col" className="px-6 py-4 font-bold w-40 text-center">Start (EST)</th>
            <th scope="col" className="px-6 py-4 font-bold w-40 text-center">End (EST)</th>
            <th scope="col" className="px-6 py-4 font-bold w-24 text-center">Hours</th>
            <th scope="col" className="px-6 py-4 font-bold">Comments</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry, idx) => (
            <tr key={entry.date} className="bg-white hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                {entry.date}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {entry.day}
              </td>
              <td className="px-6 py-4">
                <input 
                  type="time" 
                  value={entry.startTime}
                  disabled={!editable}
                  onChange={(e) => onUpdate(idx, 'startTime', e.target.value)}
                  className={`w-full bg-transparent text-center border-0 p-0 focus:ring-0 ${!editable ? 'text-slate-400' : 'text-slate-900 cursor-pointer hover:text-blue-600'}`}
                />
              </td>
              <td className="px-6 py-4">
                <input 
                  type="time" 
                  value={entry.endTime}
                  disabled={!editable}
                  onChange={(e) => onUpdate(idx, 'endTime', e.target.value)}
                  className={`w-full bg-transparent text-center border-0 p-0 focus:ring-0 ${!editable ? 'text-slate-400' : 'text-slate-900 cursor-pointer hover:text-blue-600'}`}
                />
              </td>
              <td className="px-6 py-4">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  max="24"
                  placeholder="0.00"
                  value={entry.hoursWorked || ''}
                  disabled={!editable}
                  onChange={(e) => onUpdate(idx, 'hoursWorked', e.target.value)}
                  className={`w-full bg-transparent text-center border-0 p-0 font-semibold focus:ring-0 ${!editable ? 'text-slate-400' : 'text-slate-700 hover:text-blue-600'}`}
                />
              </td>
              <td className="px-6 py-4">
                <input 
                  type="text" 
                  placeholder={editable ? "Add comment..." : ""}
                  value={entry.comments}
                  disabled={!editable}
                  onChange={(e) => onUpdate(idx, 'comments', e.target.value)}
                  className={`w-full bg-transparent border-0 border-b border-transparent focus:border-blue-400 focus:ring-0 p-0 text-sm ${!editable ? 'text-slate-400 italic' : 'text-slate-700'}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          No entries found for this period.
        </div>
      )}
    </div>
  );
};

export default TrackerTable;
