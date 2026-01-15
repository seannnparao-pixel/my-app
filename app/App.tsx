'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

import { UserRole, PeriodType, TimeEntry, User } from './types';
import { generateDefaultEntries, formatTotalHours } from './utils';
import { Icons } from './constants';
import TrackerTable from './components/TrackerTable';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.AGENT);

  const [currentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentPeriod, setCurrentPeriod] = useState<PeriodType>(
    new Date().getDate() <= 15 ? PeriodType.FIRST_HALF : PeriodType.SECOND_HALF
  );

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const monthKey = `${currentYear}-${currentMonth}`;

  /* =========================
     LOAD USERS
  ========================== */
  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at');

      if (!error && data) {
        setUsers(data);
        if (!selectedUserId && data.length > 0) {
          setSelectedUserId(data[0].id);
        }
      }
    };

    loadUsers();
  }, []);

  /* =========================
     LOAD TIME ENTRIES
  ========================== */
  useEffect(() => {
    if (!selectedUserId) return;

    const loadEntries = async () => {
      setIsSyncing(true);

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('month', monthKey)
        .eq('period', currentPeriod)
        .order('work_date');

      if (!error && data && data.length > 0) {
        setEntries(data);
      } else {
        setEntries(
          generateDefaultEntries(currentYear, currentMonth, currentPeriod)
        );
      }

      setIsSyncing(false);
    };

    loadEntries();
  }, [selectedUserId, currentMonth, currentPeriod]);

  /* =========================
     UPDATE / SAVE ENTRY
  ========================== */
  const handleUpdateEntry = async (
    index: number,
    field: keyof TimeEntry,
    value: string
  ) => {
    if (!selectedUserId) return;

    const entry = entries[index];
    const updated: any = {
      ...entry,
      [field]: field === 'hoursWorked' ? Number(value) : value
    };

    setEntries(prev => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });

    if (entry.id) {
      await supabase
        .from('time_entries')
        .update({
          hours: updated.hoursWorked,
          comment: updated.comment
        })
        .eq('id', entry.id);
    } else {
      await supabase.from('time_entries').insert({
        user_id: selectedUserId,
        work_date: updated.date,
        hours: updated.hoursWorked,
        comment: updated.comment,
        period: currentPeriod,
        month: monthKey
      });
    }
  };

  /* =========================
     USER MANAGEMENT
  ========================== */
  const handleAddUser = async () => {
    const { data, error } = await supabase
      .from('users')
      .insert({ name: `Agent ${users.length + 1}` })
      .select()
      .single();

    if (!error && data) {
      setUsers(prev => [...prev, data]);
      setSelectedUserId(data.id);
    }
  };

  const handleRemoveUser = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!confirm('Remove this user and all their data?')) return;

    await supabase.from('users').delete().eq('id', userId);

    setUsers(prev => prev.filter(u => u.id !== userId));
    if (selectedUserId === userId) {
      setSelectedUserId('');
      setEntries([]);
    }
  };

  const handleRenameUser = async (name: string) => {
    if (!selectedUserId) return;

    await supabase.from('users').update({ name }).eq('id', selectedUserId);

    setUsers(prev =>
      prev.map(u => (u.id === selectedUserId ? { ...u, name } : u))
    );
  };

  const totalHours = useMemo(
    () => entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0),
    [entries]
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  /* =========================
     UI
  ========================== */
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <Icons.Calendar />
          <span className="font-bold">Team Sean Hours Tracker</span>
          {isSyncing && <span className="text-xs text-blue-400">SYNCING…</span>}
        </div>
        <button
          onClick={() =>
            setRole(role === UserRole.ADMIN ? UserRole.AGENT : UserRole.ADMIN)
          }
          className="text-xs font-bold"
        >
          {role === UserRole.ADMIN ? 'ADMIN (Logout)' : 'ADMIN'}
        </button>
      </header>

      <div className="bg-slate-900 px-4 pt-2 flex gap-1">
        {users.map(u => (
          <div
            key={u.id}
            onClick={() => setSelectedUserId(u.id)}
            className={`px-4 py-2 rounded-t cursor-pointer ${
              u.id === selectedUserId
                ? 'bg-white text-black'
                : 'text-slate-400'
            }`}
          >
            {u.name}
            {role === UserRole.ADMIN && (
              <button
                onClick={e => handleRemoveUser(e, u.id)}
                className="ml-2 text-red-500"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {role === UserRole.ADMIN && (
          <button onClick={handleAddUser} className="text-white px-2">
            +
          </button>
        )}
      </div>

      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {selectedUser && (
          <>
            <input
              value={selectedUser.name}
              onChange={e => handleRenameUser(e.target.value)}
              className="text-xl font-bold text-blue-600 bg-transparent mb-4"
            />

            <TrackerTable
              entries={entries}
              onUpdate={handleUpdateEntry}
              editable={true}
            />

            <div className="text-right text-xl font-black mt-4">
              {formatTotalHours(totalHours)} Hrs
            </div>
          </>
        )}
      </main>

      <footer className="text-center text-xs text-slate-400 py-6">
        Team Sean Hours Tracker v4 — Supabase Synced
      </footer>
    </div>
  );
};

export default App;
