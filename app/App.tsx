
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, PeriodType, TrackerState, TimeEntry, User, PeriodData } from './types';
import { generateDefaultEntries, formatTotalHours } from './utils';
import { Icons, MONTHS } from './constants';
import TrackerTable from './components/TrackerTable';

const App: React.FC = () => {
  // Application State
  const [role, setRole] = useState<UserRole>(UserRole.AGENT);
  const [currentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(0); // January
  const [currentPeriod, setCurrentPeriod] = useState<PeriodType>(PeriodType.FIRST_HALF);
  const [trackerData, setTrackerData] = useState<TrackerState>({});
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  // Admin Login State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Initialize data from localStorage or defaults
  useEffect(() => {
    const savedData = localStorage.getItem('team_sean_tracker_v3');
    const savedUsers = localStorage.getItem('team_sean_users_v3');
    
    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      setUsers(parsedUsers);
      if (parsedUsers.length > 0) setSelectedUserId(parsedUsers[0].id);
    } else {
      const defaultUsers = [{ id: 'u1', name: 'Sean' }];
      setUsers(defaultUsers);
      setSelectedUserId('u1');
      localStorage.setItem('team_sean_users_v3', JSON.stringify(defaultUsers));
    }

    if (savedData) {
      setTrackerData(JSON.parse(savedData));
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (Object.keys(trackerData).length > 0) {
      localStorage.setItem('team_sean_tracker_v3', JSON.stringify(trackerData));
    }
  }, [trackerData]);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('team_sean_users_v3', JSON.stringify(users));
    }
  }, [users]);

  const monthKey = `${currentYear}-${currentMonth}`;

  // Get current period data for the selected user or initialize it
  const periodData = useMemo((): PeriodData => {
    if (!selectedUserId) return { status: 'open', entries: [] };
    
    const userMonthData = trackerData[selectedUserId]?.[monthKey] || {
      [PeriodType.FIRST_HALF]: { status: 'open' as const, entries: generateDefaultEntries(currentYear, currentMonth, PeriodType.FIRST_HALF) },
      [PeriodType.SECOND_HALF]: { status: 'open' as const, entries: generateDefaultEntries(currentYear, currentMonth, PeriodType.SECOND_HALF) }
    };
    return userMonthData[currentPeriod] as PeriodData;
  }, [trackerData, selectedUserId, monthKey, currentPeriod, currentYear, currentMonth]);

  const handleUpdateEntry = (index: number, field: keyof TimeEntry, value: string) => {
    if (!selectedUserId) return;

    setTrackerData(prev => {
      const userData = { ...(prev[selectedUserId] || {}) };
      const monthData = { ...(userData[monthKey] || {
        [PeriodType.FIRST_HALF]: { status: 'open', entries: generateDefaultEntries(currentYear, currentMonth, PeriodType.FIRST_HALF) },
        [PeriodType.SECOND_HALF]: { status: 'open', entries: generateDefaultEntries(currentYear, currentMonth, PeriodType.SECOND_HALF) }
      })};

      const newEntries = [...monthData[currentPeriod].entries];
      const updatedEntry = { ...newEntries[index] };
      
      if (field === 'hoursWorked') {
        updatedEntry.hoursWorked = value === '' ? 0 : parseFloat(value);
      } else {
        (updatedEntry as any)[field] = value;
      }
      
      newEntries[index] = updatedEntry;
      monthData[currentPeriod] = { ...monthData[currentPeriod], entries: newEntries };
      userData[monthKey] = monthData;

      return { ...prev, [selectedUserId]: userData };
    });
    setIsSaved(false);
  };

  const handleToggleLock = () => {
    if (!selectedUserId) return;
    setTrackerData(prev => {
      const userData = { ...(prev[selectedUserId] || {}) };
      const monthData = { ...(userData[monthKey] || {
        [PeriodType.FIRST_HALF]: { status: 'open', entries: generateDefaultEntries(currentYear, currentMonth, PeriodType.FIRST_HALF) },
        [PeriodType.SECOND_HALF]: { status: 'open', entries: generateDefaultEntries(currentYear, currentMonth, PeriodType.SECOND_HALF) }
      })};
      
      const currentStatus = monthData[currentPeriod].status;
      monthData[currentPeriod].status = currentStatus === 'open' ? 'locked' : 'open';
      userData[monthKey] = monthData;

      return { ...prev, [selectedUserId]: userData };
    });
  };

  const handleAddUser = () => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: `Agent ${users.length + 1}`
    };
    setUsers([...users, newUser]);
    setSelectedUserId(newUser.id);
  };

  const handleRemoveUser = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this user and all their data?')) return;
    const newUsers = users.filter(u => u.id !== userId);
    setUsers(newUsers);
    if (selectedUserId === userId) {
      setSelectedUserId(newUsers.length > 0 ? newUsers[0].id : '');
    }
    setTrackerData(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleRenameUser = (newName: string) => {
    setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, name: newName } : u));
  };

  const totalPeriodHours = useMemo(() => {
    return periodData.entries.reduce((sum: number, entry: TimeEntry) => sum + (entry.hoursWorked || 0), 0);
  }, [periodData]);

  const isLocked = periodData.status === 'locked';
  const canEdit = role === UserRole.ADMIN || !isLocked;
  const selectedUser = users.find(u => u.id === selectedUserId);

  const handleAdminClick = () => {
    if (role === UserRole.ADMIN) {
      setRole(UserRole.AGENT);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === 'seanparao' && loginPassword === 'teamseanhours') {
      setRole(UserRole.ADMIN);
      setShowLoginModal(false);
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Access denied.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Icons.Calendar />
            </div>
            <h1 className="text-lg font-bold">Team Sean Hours Tracker</h1>
          </div>

          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button 
              onClick={() => setRole(UserRole.AGENT)}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${role === UserRole.AGENT ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              AGENT
            </button>
            <button 
              onClick={handleAdminClick}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${role === UserRole.ADMIN ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              {role === UserRole.ADMIN ? 'ADMIN (Logout)' : 'ADMIN'}
            </button>
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Admin Access</h3>
              <button 
                onClick={() => { setShowLoginModal(false); setLoginError(''); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleLoginSubmit} className="p-8 space-y-4">
              {loginError && (
                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
                  {loginError}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Username</label>
                <input 
                  autoFocus
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 outline-none"
                  placeholder="Username"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                <input 
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-slate-200 transition-all active:scale-95"
              >
                Authenticate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Browser-style Tab Bar */}
      <div className="bg-slate-900 px-4 pt-2 overflow-x-auto no-scrollbar">
        <div className="flex items-end gap-0.5 max-w-[1600px] mx-auto">
          {users.map(user => (
            <div 
              key={user.id} 
              onClick={() => setSelectedUserId(user.id)}
              className={`group relative flex items-center min-w-[140px] max-w-[200px] h-9 px-4 cursor-pointer rounded-t-lg transition-all duration-200 ${
                selectedUserId === user.id 
                ? 'bg-slate-50 text-slate-900 font-semibold shadow-[0_-2px_8px_rgba(0,0,0,0.1)]' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="truncate flex-1 text-sm">{user.name}</span>
              {role === UserRole.ADMIN && (
                <button 
                  onClick={(e) => handleRemoveUser(e, user.id)}
                  className="ml-2 p-0.5 rounded-md hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Icons.Trash />
                </button>
              )}
            </div>
          ))}
          {role === UserRole.ADMIN && (
            <button 
              onClick={handleAddUser}
              className="mb-1 p-1.5 ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              title="Add New Agent"
            >
              <Icons.Plus />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-8">
        {selectedUserId ? (
          <>
            {/* Control Panel */}
            <div className="bg-white rounded-t-xl shadow-sm border border-slate-200 border-b-0 p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    Teammate Name <Icons.Edit />
                  </label>
                  <input 
                    type="text"
                    value={selectedUser?.name || ''}
                    onChange={(e) => handleRenameUser(e.target.value)}
                    placeholder="Enter teammate name..."
                    className="w-full text-xl font-bold text-blue-600 bg-blue-50/50 border-0 border-b-2 border-transparent focus:border-blue-500 focus:ring-0 px-2 py-1 rounded transition-all"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Month</label>
                  <select 
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>{m} 2026</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payroll Period</label>
                  <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                    <button 
                      onClick={() => setCurrentPeriod(PeriodType.FIRST_HALF)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${currentPeriod === PeriodType.FIRST_HALF ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      1st - 15th
                    </button>
                    <button 
                      onClick={() => setCurrentPeriod(PeriodType.SECOND_HALF)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${currentPeriod === PeriodType.SECOND_HALF ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      16th - End
                    </button>
                  </div>
                </div>

                <div className="md:col-span-1 flex items-center justify-end gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-800">
                      {formatTotalHours(totalPeriodHours)} <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Hrs</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                       onClick={() => {
                         localStorage.setItem('team_sean_tracker_v3', JSON.stringify(trackerData));
                         localStorage.setItem('team_sean_users_v3', JSON.stringify(users));
                         setIsSaved(true);
                         setTimeout(() => setIsSaved(false), 2000);
                       }}
                       className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-2.5 rounded-lg transition-colors shadow-sm"
                    >
                       {isSaved ? <Icons.Check /> : <Icons.Save />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-header Bar */}
            <div className="bg-slate-50 border border-slate-200 border-t-0 border-b-0 px-6 py-3 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isLocked ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {isLocked ? <><span className="mr-1.5"><Icons.Lock /></span> Locked</> : <><span className="mr-1.5"><Icons.Unlock /></span> Editable</>}
                </span>
                {isLocked && <span className="text-xs text-slate-400 font-medium">Locked for payroll processing</span>}
              </div>
              
              <div className="flex gap-2">
                {(!isLocked && role === UserRole.AGENT) && (
                  <button 
                    onClick={handleToggleLock}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Icons.Lock /> Lock & Submit
                  </button>
                )}
                {role === UserRole.ADMIN && (
                  <button 
                    onClick={handleToggleLock}
                    className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 ${isLocked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                  >
                    {isLocked ? <><Icons.Unlock /> Admin Unlock</> : <><Icons.Lock /> Admin Lock</>}
                  </button>
                )}
              </div>
            </div>

            {/* The Table */}
            <div className="bg-white rounded-b-xl shadow-md border border-slate-200 overflow-hidden">
              <TrackerTable 
                entries={periodData.entries} 
                onUpdate={handleUpdateEntry} 
                editable={canEdit}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-200 text-slate-400">
            <div className="bg-slate-50 p-6 rounded-full mb-6">
              <Icons.Calendar />
            </div>
            <h2 className="text-xl font-bold text-slate-600 mb-2">Welcome to Team Sean Hours Tracker</h2>
            <p className="max-w-xs text-center text-sm leading-relaxed">
              No agents are configured. {role === UserRole.ADMIN ? 'Please click the "+" icon above to add your first teammate.' : 'Please wait for an admin to add your name.'}
            </p>
          </div>
        )}
      </div>

      <footer className="mt-8 py-10 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Team Sean Hours Tracker v3.0</p>
        <p className="text-xs text-slate-500">Documenting professional work hours • All timestamps EST</p>
      </footer>
    </div>
  );
};

export default App;
