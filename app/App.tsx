'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

import { UserRole, PeriodType, TimeEntry, User } from './types';
import { generateDefaultEntries, formatTotalHours } from './utils';
import { Icons, MONTHS } from './constants';
import TrackerTable from './components/TrackerTable';

/* =========================
   CONSTANTS
========================= */
const ADMIN_USERNAME = 'seanparao';
const ADMIN_PASSWORD = 'teamseanhours';

const App: React.FC = () => {
  /* =========================
     STATE
  ========================== */
  const [role, setRole] = useState<UserRole>(UserRole.AGENT);

  const [currentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState<PeriodType>(PeriodType.SECOND_HALF);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [locked, setLocked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const monthKey = `${currentYear}-${currentMonth}`;

  /* =========================
     LOAD USERS
  ========================== */
  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase.from('users').select('*').order('created_at');
      if (data && data.length > 0) {
        setUsers(data);
        setSelectedUserId(data[0].id);
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

      setEntries(
        data && data.length
          ? data
          : generateDefaultEntries(currentYear, currentMonth, currentPeriod)
      );

      setIsSyncing(false);
    };

    loadEntries();
  }, [selectedUserId, currentMonth, currentPeriod]);

  /* =========================
     ENTRY UPDATE
  ========================== */
  const handleUpdateEntry = async (
    index: number,
    field: keyof TimeEntry,
    value: string
  ) => {
    if (locked && role !== UserRole.ADMIN) return;

    const updated = {
      ...entries[index],
      [field]: field === 'hoursWorked' ? Number(value) : value,
    };

    const copy = [...entries];
    copy[index] = updated;
    setEntries(copy);

    if (updated.id) {
      await supabase.from('time_entries').update({
        hours: updated.hoursWorked,
        comment: updated.comment,
      }).eq('id', updated.id);
    } else {
      await supabase.from('time_entries').insert({
        user_id: selectedUserId,
        work_date: updated.date,
        hours: updated.hoursWorked,
        comment: updated.comment,
        month: monthKey,
        period: currentPeriod,
      });
    }
  };

  /* =========================
     USER MANAGEMENT
  ========================== */
  const handleAddUser = async () => {
    const { data } = await supabase
      .from('users')
      .insert({ name: `Agent ${users.length + 1}` })
      .select()
      .single();

    if (data) {
      setUsers([...users, data]);
      setSelectedUserId(data.id);
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm('Remove this user and all data?')) return;
    await supabase.from('users').delete().eq('id', id);
    setUsers(users.filter(u => u.id !== id));
  };

  const handleRenameUser = async (name: string) => {
    await supabase.from('users').update({ name }).eq('id', selectedUserId);
    setUsers(users.map(u => u.id === selectedUserId ? { ...u, name } : u));
  };

  /* =========================
     ADMIN LOGIN
  ========================== */
  const handleAdminClick = () => {
    if (role === UserRole.ADMIN) {
      setRole(UserRole.AGENT);
    } else {
      setShowLogin(true);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === ADMIN_USERNAME && loginPassword === ADMIN_PASSWORD) {
      setRole(UserRole.ADMIN);
      setShowLogin(false);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const totalHours = useMemo(
    () => entries.reduce((s, e) => s + (e.hoursWorked || 0), 0),
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
          {isSyncing && <span className="text-xs text-blue-400">SYNCING...</span>}
        </div>

        <div className="flex gap-2">
          <button
            className={`px-3 py-1 text-xs font-bold rounded ${role === UserRole.AGENT ? 'bg-blue-600' : 'bg-slate-700'}`}
            onClick={() => setRole(UserRole.AGENT)}
          >
            AGENT
          </button>
          <button
            className={`px-3 py-1 text-xs font-bold rounded ${role === UserRole.ADMIN ? 'bg-red-600' : 'bg-slate-700'}`}
            onClick={handleAdminClick}
          >
            ADMIN
          </button>
        </div>
      </header>

      {/* ADMIN LOGIN */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <form onSubmit={handleLoginSubmit} className="bg-white p-6 rounded space-y-3">
            {loginError && <div className="text-red-600 text-xs">{loginError}</div>}
            <input placeholder="Username" onChange={e => setLoginUsername(e.target.value)} />
            <input type="password" placeholder="Password" onChange={e => setLoginPassword(e.target.value)} />
            <button className="w-full bg-slate-900 text-white py-2">Login</button>
          </form>
        </div>
      )}

      {/* USER TABS */}
      <div className="bg-slate-900 px-4 pt-2 flex gap-1">
        {users.map(u => (
          <div
            key={u.id}
            onClick={() => setSelectedUserId(u.id)}
            className={`px-4 py-2 rounded-t cursor-pointer ${u.id === selectedUserId ? 'bg-white text-black' : 'text-slate-400'}`}
          >
            {u.name}
          </div>
        ))}
        {role === UserRole.ADMIN && <button onClick={handleAddUser}>+</button>}
      </div>

      {/* TABLE */}
      {selectedUser && (
        <TrackerTable
          entries={entries}
          editable={!locked || role === UserRole.ADMIN}
          onUpdate={handleUpdateEntry}
        />
      )}

      <footer className="text-center text-xs py-6 text-slate-400">
        Team Sean Hours Tracker v4 — Supabase Synced
      </footer>
    </div>
  );
};

export default App;
