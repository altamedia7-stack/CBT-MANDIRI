/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  BookOpen, 
  LayoutDashboard, 
  LogOut, 
  Settings, 
  Users, 
  Database,
  Calendar,
  FileText,
  Clock,
  ChevronRight,
  AlertCircle,
  Menu,
  X,
  Type
} from 'lucide-react';
import { User, Role } from './types';
import { ExamEngine } from './components/ExamEngine';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const login = async (credentials: any) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    setUser(data);
  };

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

// --- Components ---

function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="h-16 border-b border-border-main bg-white flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-lg">
          C
        </div>
        <span className="font-bold text-lg tracking-tight text-text-main">CBT <span className="text-accent">MANDIRI</span></span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-[13px] font-semibold text-text-main leading-none mb-1">{user?.name}</p>
          <p className="text-[11px] text-text-muted capitalize leading-none">{user?.role}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold overflow-hidden">
          {user?.name?.substring(0, 2).toUpperCase()}
        </div>
        <button 
          onClick={logout}
          className="p-1.5 text-text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { user } = useAuth();
  
  const groups = [
    {
      label: 'Beranda',
      items: [
        { id: 'dashboard', label: 'Ringkasan Sistem', icon: LayoutDashboard },
        { id: 'monitor', label: 'Monitor Real-time', icon: Clock },
      ]
    },
    {
      label: 'Data Master',
      items: [
        { id: 'academic', label: 'Kurikulum & Mapel', icon: BookOpen },
        { id: 'users', label: 'Siswa & Guru', icon: Users },
        { id: 'questions', label: 'Bank Soal', icon: Type },
        { id: 'master', label: 'Ruang Ujian', icon: Database },
      ]
    },
    {
      label: 'Ujian',
      items: [
        { id: 'exams', label: 'Jadwal Ujian', icon: Calendar },
        { id: 'analysis', label: 'Hasil & Analisis', icon: FileText },
      ]
    }
  ];

  return (
    <aside className="w-[240px] border-r border-border-main bg-white h-[calc(100vh-64px)] hidden md:flex flex-col p-6 overflow-y-auto no-scrollbar">
      {groups.map((group, gIdx) => (
        <div key={gIdx} className="mb-6">
          <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider mb-3 px-3">
            {group.label}
          </div>
          <div className="space-y-1">
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full nav-item-minimal ${
                  activeTab === item.id ? 'nav-item-active' : 'nav-item-inactive'
                }`}
              >
                <item.icon size={16} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

// --- Pages ---

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(form);
    } catch (err: any) {
      setError('Username atau password salah');
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm card-minimal !p-10 shadow-2xl shadow-blue-100/50"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-xl shadow-blue-200">
            C
          </div>
          <h1 className="text-xl font-bold text-text-main tracking-tight uppercase">CBT MANDIRI</h1>
          <p className="text-[11px] font-bold text-text-muted mt-2 tracking-widest uppercase">Assessment System</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 text-danger text-[11px] font-bold rounded-lg border border-red-100 flex items-center gap-2"
          >
            <AlertCircle size={14} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Username</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 bg-gray-50 border border-border-main rounded-lg focus:ring-4 focus:ring-accent-light focus:border-accent transition-all outline-none text-sm font-medium"
              placeholder="admin / guru / siswa"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 bg-gray-50 border border-border-main rounded-lg focus:ring-4 focus:ring-accent-light focus:border-accent transition-all outline-none text-sm font-medium"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-accent text-white font-bold py-3.5 rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-100 uppercase text-xs tracking-[0.2em] mt-2"
          >
            Masuk Sekarang
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-gray-50 text-center">
          <p className="text-[9px] font-black text-text-muted tracking-[0.3em] uppercase opacity-40">
            v1.0 • PENGEMBANGAN MANDIRI
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Siswa Aktif', value: '1,248', color: 'text-emerald-500', sub: '+12% hari ini' },
          { label: 'Ujian Berlangsung', value: '4', color: 'text-text-main', sub: 'PAS Semester' },
          { label: 'Total Bank Soal', value: '1,240', color: 'text-accent', sub: '8 Tipe soal' },
          { label: 'Penyimpanan', value: '84%', color: 'text-danger', sub: 'Segera penuh' },
        ].map((stat, i) => (
          <div key={i} className="card-minimal">
            <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider">{stat.label}</p>
            <h3 className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
            <p className="text-[10px] font-semibold mt-2 opacity-70">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-border-main shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-main flex justify-between items-center">
              <h3 className="text-sm font-bold text-text-main uppercase tracking-tight">Status Ujian Terkini</h3>
              <button className="text-[11px] font-bold text-accent hover:underline">LIHAT SEMUA</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">MAPEL</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">KELAS</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { mapel: 'Matematika Peminatan', kelas: 'XII MIPA', status: 'Berjalan', type: 'active' },
                    { mapel: 'Bahasa Indonesia', kelas: 'X Semua', status: 'Selesai', type: 'idle' },
                    { mapel: 'Fisika Dasar', kelas: 'XI MIPA', status: 'Menunggu', type: 'idle' }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[13px] font-semibold">{row.mapel}</td>
                      <td className="px-6 py-4 text-[13px] text-text-muted">{row.kelas}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          row.type === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-minimal flex flex-col gap-3">
            <h3 className="text-sm font-bold text-text-main uppercase mb-2">Kontrol Cepat</h3>
            <button className="w-full py-2.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-all">AKTIVASI JADWAL</button>
            <button className="w-full py-2.5 bg-white border border-border-main text-text-main rounded-lg text-xs font-bold hover:bg-gray-50 transition-all">RESET SESI</button>
            <button className="w-full py-2.5 bg-white border border-border-main text-danger rounded-lg text-xs font-bold hover:bg-red-50 transition-all">EMERGENCY STOP</button>
          </div>

          <div className="card-minimal">
            <h3 className="text-sm font-bold text-text-main uppercase mb-4">Aktivitas</h3>
            <div className="space-y-4">
              {[
                { time: '10:42', text: '<b>Raka S.</b> pindah tab.' },
                { time: '10:39', text: '<b>Heru</b> unduh berita acara.' },
                { time: '10:35', text: 'Auto-backup sukses.' }
              ].map((log, i) => (
                <div key={i} className="flex gap-4 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <span className="text-[10px] font-bold text-text-muted tabular-nums">{log.time}</span>
                  <p className="text-[12px] leading-tight text-text-main" dangerouslySetInnerHTML={{ __html: log.text }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MasterData() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data/rooms').then(res => res.json()).then(data => {
      setRooms(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-2xl font-bold text-text-main uppercase tracking-tight">Master Data Ruang</h1>
          <p className="text-text-muted font-medium text-sm mt-1">Kelola data ruang ujian dan fasilitas sekolah.</p>
        </div>
        <button className="bg-accent text-white px-6 py-2.5 rounded-lg font-bold text-[11px] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest">
          + TAMBAH RUANG
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rooms.map(room => (
          <div key={room.id} className="card-minimal group hover:border-accent flex flex-col items-center text-center py-10">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-text-muted mb-4 group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
              <Database size={24} />
            </div>
            <h3 className="text-base font-bold text-text-main tracking-tight uppercase">{room.name}</h3>
            <p className="text-[10px] font-black text-text-muted mt-2 tracking-[0.2em] opacity-40">ID: {room.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BankSoal() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data/questions').then(res => res.json()).then(data => {
      setQuestions(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-10 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-2xl font-bold text-text-main uppercase tracking-tight">Bank Soal</h1>
          <p className="text-text-muted font-medium text-sm mt-1">Kumpulan paket soal dari berbagai mata pelajaran.</p>
        </div>
        <button className="bg-text-main text-white px-6 py-2.5 rounded-lg font-bold text-[11px] shadow-lg shadow-gray-100 hover:bg-accent transition-all uppercase tracking-widest">
          + BUAT PAKET BARU
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border-main overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#fafafa] border-b border-border-main">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">NO</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">ISI SOAL</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">TIPE</th>
                <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {questions.map((q, i) => (
                <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5 text-sm font-bold text-text-muted">{i + 1}</td>
                  <td className="px-6 py-5 text-[13px] font-semibold text-text-main max-w-md truncate">{q.text}</td>
                  <td className="px-6 py-5">
                    <span className="px-2.5 py-1 bg-accent-light text-accent rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-50">
                      {q.type}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-accent font-bold text-[11px] uppercase tracking-widest hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { analyzeQuestions } from './services/geminiService';

function AnalysisView() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/data/questions').then(res => res.json()).then(setQuestions);
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeQuestions(questions);
      setAnalysis(result);
    } catch (err) {
      alert('Gagal melakukan analisis AI');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase">AI Smart Analysis</h1>
          <p className="text-gray-500 font-medium">Analisis kualitas soal dan validitas tes menggunakan Gemini AI.</p>
        </div>
        {!analysis && (
          <button 
            onClick={handleAnalyze}
            disabled={loading || questions.length === 0}
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest flex items-center gap-2"
          >
            {loading ? 'Menganalisis...' : 'Mulai Analisis AI'}
          </button>
        )}
      </div>

      {loading && (
        <div className="py-20 text-center">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold animate-pulse">Gemini sedang mempelajari butir soal Anda...</p>
        </div>
      )}

      {analysis && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-indigo-900 text-white p-8 rounded-[2rem] shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-60">Ringkasan AI</h3>
            <p className="text-lg font-medium leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="grid gap-6">
            {analysis.analysis?.map((item: any, i: number) => (
              <div key={i} className="bg-white p-6 rounded-3xl border-2 border-gray-100 flex items-start gap-4">
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                  item.difficulty === 'Mudah' ? 'bg-emerald-50 text-emerald-600' :
                  item.difficulty === 'Sedang' ? 'bg-amber-50 text-amber-600' :
                  'bg-rose-50 text-rose-600'
                }`}>
                  {item.difficulty[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Butir Soal #{item.qid}</h4>
                  <p className="text-sm text-gray-500 mt-1">{item.suggestion}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Difficulty:</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{item.difficulty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setAnalysis(null)}
            className="text-gray-400 font-bold hover:text-indigo-600 transition-colors uppercase text-xs tracking-widest"
          >
            Bersihkan Hasil & Ulangi
          </button>
        </motion.div>
      )}

      {!analysis && !loading && questions.length === 0 && (
        <div className="py-20 text-center text-gray-400">
          <Database size={64} className="mx-auto mb-4 opacity-10" />
          <p className="font-bold">Belum ada data soal untuk dianalisis.</p>
        </div>
      )}
    </div>
  );
}

const PageContent = ({ tab }: { tab: string }) => {
  switch(tab) {
    case 'dashboard': return <Dashboard />;
    case 'master': return <MasterData />;
    case 'questions': return <BankSoal />;
    case 'analysis': return <AnalysisView />;
    default: return (
      <div className="p-12 flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400">
        <AlertCircle size={64} className="mb-6 opacity-10" />
        <h2 className="text-2xl font-black text-gray-200 uppercase tracking-tighter">Modul Sedang Menyiapkan</h2>
        <p className="text-sm font-bold text-gray-300 mt-2 uppercase tracking-widest">Halaman {tab} akan segera tersedia</p>
      </div>
    );
  }
}

function AdminGuruView() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 max-h-[calc(100vh-64px)] overflow-y-auto">
          <PageContent tab={activeTab} />
        </main>
      </div>
    </div>
  );
}

function SiswaDashboard() {
  const [activeExams, setActiveExams] = useState<any[]>([]);
  const [currentExam, setCurrentExam] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/exam/active')
      .then(res => res.json())
      .then(data => {
        setActiveExams(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleStartExam = async (exam: any) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/exam/${exam.id}/start`, { method: 'POST' });
      const sessionData = await res.json();
      const qRes = await fetch('/api/data/questions');
      const allQs = await qRes.json();
      const examQs = allQs.filter((q: any) => q.packetId === exam.packetId);
      setQuestions(examQs);
      setSession(sessionData);
      setCurrentExam(exam);
      setLoading(false);
    } catch (err) {
      alert('Gagal memulai ujian');
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-main">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-accent-light border-t-accent rounded-full animate-spin" />
        <p className="text-[10px] font-bold text-accent tracking-[.3em] uppercase">Memproses...</p>
      </div>
    </div>
  );

  if (currentExam && session) {
    return (
      <ExamEngine 
        exam={currentExam} 
        questions={questions} 
        initialSession={session} 
        onFinish={() => {
          setCurrentExam(null);
          setSession(null);
          fetch('/api/exam/active').then(res => res.json()).then(setActiveExams);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-main">
      <Header />
      <main className="max-w-4xl mx-auto p-8 md:p-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-text-main tracking-tight">Ruang Ujian Mandiri</h1>
          <p className="text-text-muted mt-2 font-medium">Monitoring ujian aktif hari ini.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeExams.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white rounded-2xl border border-border-main shadow-sm">
              <Clock className="mx-auto text-gray-200 mb-4" size={40} />
              <p className="text-text-muted font-bold text-sm">TIDAK ADA JADWAL AKTIF</p>
            </div>
          ) : activeExams.map(exam => (
            <motion.div 
              key={exam.id}
              whileHover={{ y: -4 }}
              className="bg-white p-7 rounded-2xl border border-border-main shadow-sm transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-accent-light text-accent rounded-xl flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                  <BookOpen size={24} />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Live
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-text-main mb-2 tracking-tight">{exam.name}</h3>
              
              <div className="flex gap-4 text-[11px] font-bold text-text-muted mb-8">
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className="opacity-50" />
                  {exam.durationMinutes} MENIT
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText size={16} className="opacity-50" />
                  UJIAN SEKOLAH
                </div>
              </div>

              <button 
                onClick={() => handleStartExam(exam)}
                className="w-full bg-accent text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all text-sm uppercase tracking-widest shadow-lg shadow-blue-100"
              >
                MULAI UJIAN
              </button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-indigo-600 font-medium animate-pulse">Memuat sistem...</p>
      </div>
    </div>
  );

  if (!user) return <Login />;

  if (user.role === 'siswa') return <SiswaDashboard />;
  
  return <AdminGuruView />;
}
