'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

import { UserRole, PeriodType, TimeEntry, User } from './types';
import { generateDefaultEntries, formatTotalHours } from './utils';
import { Icons, MONTHS } from './constants';
import TrackerTable from './components/TrackerTable';

/* =========================
   HELPERS
========================= */
const formatDateAndDay = (dateStr: string) => {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString(),
    day: d.toLocaleDateString('en-US', { weekday: 'long' })
  };
};

const App: React.FC = () => {
  /* =========================
     ROLE + ADMIN LOGIN
  ========================== */
  const [role, setRole] = useState<UserRole>(UserRole.AGENT);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  /* =========================
     DATE / PERIOD
  ========================== */
  const [currentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentPeriod, setCurrentPeriod] = useState<PeriodType>(
    new Date().getDate() <= 15 ? PeriodType.FIRST_HALF : PeriodType.SECOND_HALF
  );

  const monthKey = `${currentYear}-${currentMonth}`;

  /* =========================
     DATA STATE
  ========================== */
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  /* =========================
     LOAD USERS
  ========================== */
  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at');

      if (data) {
        setUsers(data);
        if (!selectedUserId && data.length > 0) {
          setSelectedUserId(data[0].id);
        }
      }
    };
    loadUsers();
  }, []);

  /* =========================
     LOAD ENTRIES
  ========================== */
  useEffect(() => {
    if (!selectedUserId) return;

    const loadEntries = async () => {
      setIsSyncing(true);

      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('month', monthKey)
        .eq('period', currentPeriod)
        .order('work_date');

      if (data && data.length > 0) {
        setEntries(
          data.map(e => ({
            ...e,
            hoursWorked: e.hours ?? 0,
            ...formatDateAndDay(e.work_date)
          }))
        );
      } else {
        setEntries(generateDefaultEntries(currentYear, currentMonth, currentPeriod));
      }

      setIsSyncing(false);
    };

    loadEntries();
  }, [selectedUserId, currentMonth, currentPeriod]);

  /* =========================
     UPDATE ENTRY
  ========================== */
  const handleUpdateEntry = async (
    index: number,
    field: keyof TimeEntry,
    value: string
  ) => {
    const entry = entries[index];

    const updated: TimeEntry = {
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
        work_date: updated.work_date,
        hours: updated.hoursWorked,
        comment: updated.comment,
        period: currentPeriod,
        month: monthKey
      });
    }
  };

  /* =========================
     USER MANAGEMENT (ADMIN)
  ========================== */
  const handleAddUser = async () => {
    const { data } = await supabase
      .from('users')
      .insert({ name: `Agent ${users.length + 1}` })
      .select()
      .single();

    if (data) {
      setUsers(prev => [...prev, data]);
      setSelectedUserId(data.id);
    }
  };

  const handleRemoveUser = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!confirm('Remove this user and all their data?')) return;

    await supabase.from('users').delete().eq('id', userId);
    await supabase.from('time_entries').delete().eq('user_id', userId);

    setUsers(prev => prev.filter(u => u.id !== userId));
    setSelectedUserId('');
    setEntries([]);
  };

  const handleRenameUser = async (name: string) => {
    if (!selectedUserId) return;
    await supabase.from('users').update({ name }).eq('id', selectedUserId);
    setUsers(prev =>
      prev.map(u => (u.id === selectedUserId ? { ...u, name } : u))
    );
  };

  /* =========================
     TOTAL HOURS
  ========================== */
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
      {/* HEADER */}
      <header className="bg-slate-900 text-white px-4 py-3 flex justify-between">
        <div className="flex items-center gap-2">
          <Icons.Calendar />
          <span className="font-bold">Team Sean Hours Tracker</span>
          {isSyncing && <span className="text-xs text-blue-400">SYNCING…</span>}
        </div>

        <button
          onClick={() => {
            if (role === UserRole.ADMIN) {
              setRole(UserRole.AGENT);
            } else {
              setShowLoginModal(true);
            }
          }}
          className="text-xs font-bold"
        >
          {role === UserRole.ADMIN ? 'ADMIN (Logout)' : 'ADMIN'}
        </button>
      </header>

      {/* ADMIN LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (loginUsername === 'seanparao' && loginPassword === 'teamseanhours') {
                setRole(UserRole.ADMIN);
                setShowLoginModal(false);
                setLoginUsername('');
                setLoginPassword('');
                setLoginError('');
              } else {
                setLoginError('Invalid credentials');
              }
            }}
            className="bg-white p-6 rounded-xl w-80 space-y-3"
          >
            <h2 className="font-bold text-center">Admin Login</h2>
            {loginError && <div className="text-red-600 text-xs">{loginError}</div>}

            <input
              value={loginUsername}
              onChange={e => setLoginUsername(e.target.value)}
              placeholder="Username"
              className="w-full border p-2 rounded"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              placeholder="Password"
              className="w-full border p-2 rounded"
            />

            <button className="w-full bg-slate-900 text-white py-2 rounded">
              Login
            </button>
          </form>
        </div>
      )}

      {/* USER TABS */}
      <div className="bg-slate-900 px-4 pt-2 flex gap-1">
        {users.map(u => (
          <div
            key={u.id}
            onClick={() => setSelectedUserId(u.id)}
            className={`px-4 py-2 rounded-t cursor-pointer ${
              u.id === selectedUserId ? 'bg-white text-black' : 'text-slate-400'
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

      {/* MAIN */}
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
              editable={role === UserRole.ADMIN}
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
