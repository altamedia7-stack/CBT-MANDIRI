import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  CheckCircle2, 
  Volume2, 
  Play, 
  Pause,
  AlertTriangle,
  Send,
  ZoomIn,
  ZoomOut,
  LayoutDashboard,
  X
} from 'lucide-react';
import { Question, StudentAnswer } from '../types';

interface ExamEngineProps {
  exam: any;
  questions: Question[];
  initialSession: StudentAnswer;
  onFinish: () => void;
}

export function ExamEngine({ exam, questions, initialSession, onFinish }: ExamEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<any[]>(initialSession.answers);
  const [violationCount, setViolationCount] = useState(initialSession.violationCount);
  const [timeLeft, setTimeLeft] = useState(initialSession.remainingTime || 3600);
  const [fontSize, setFontSize] = useState(16); // px
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Persistent Timer ---
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Anti-Cheat Logic ---
  useEffect(() => {
    const handleBlur = () => {
      setViolationCount(prev => prev + 1);
      setCheatWarning('Peringatan: dilarang meninggalkan halaman ujian! Pelanggaran dicatat.');
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v')) {
        e.preventDefault();
        setCheatWarning('Fungsi salin-tempel (copy-paste) dinonaktifkan!');
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (violationCount >= 5) {
      alert('Anda telah melebihi batas pelanggaran (5x). Ujian dihentikan secara otomatis.');
      handleSubmit();
    }
  }, [violationCount]);

  const handleSubmit = async () => {
    await fetch(`/api/exam/${exam.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, violationCount })
    });
    onFinish();
  };

  const currentQuestion = questions[currentIdx];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);

  const updateAnswer = (qid: string, val: any) => {
    setAnswers(prev => {
      const idx = prev.findIndex(a => a.questionId === qid);
      if (idx !== -1) {
        const newArr = [...prev];
        newArr[idx] = { ...newArr[idx], answer: val };
        return newArr;
      }
      return [...prev, { questionId: qid, answer: val, isFlagged: false }];
    });
  };

  const toggleFlag = (qid: string) => {
    setAnswers(prev => {
      const idx = prev.findIndex(a => a.questionId === qid);
      if (idx !== -1) {
        const newArr = [...prev];
        newArr[idx] = { ...newArr[idx], isFlagged: !newArr[idx].isFlagged };
        return newArr;
      }
      return [...prev, { questionId: qid, answer: null, isFlagged: true }];
    });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentQuestion) return <div>Memuat soal...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col select-none" ref={containerRef}>
      {/* Header */}
      <header className="bg-white border-b border-border-main h-16 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <h2 className="font-bold text-text-main text-[13px] uppercase tracking-wider hidden sm:block">{exam.name || "Ujian Akademik"}</h2>
          <div className="flex items-center gap-2 bg-accent-light px-3 py-1.5 rounded-lg text-accent font-bold border border-blue-100">
            <Clock size={16} />
            <span className="tabular-nums text-sm">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setFontSize(prev => Math.min(prev + 2, 24))}
            className="p-2 text-text-muted hover:text-accent hover:bg-accent-light rounded-lg transition-colors" title="Perbesar Font"
          >
            <ZoomIn size={18} />
          </button>
          <button 
            onClick={() => setFontSize(prev => Math.max(prev - 2, 12))}
            className="p-2 text-text-muted hover:text-accent hover:bg-accent-light rounded-lg transition-colors" title="Perkecil Font"
          >
            <ZoomOut size={18} />
          </button>
          <div className="h-4 w-px bg-border-main mx-1" />
          <button 
            onClick={() => setShowSubmitModal(true)}
            className="bg-accent text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md shadow-blue-100"
          >
            Selesai
            <Send size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Panel */}
        <main className="flex-1 overflow-y-auto p-8 md:p-12 no-scrollbar">
          <motion.div 
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-3xl mx-auto space-y-10"
            style={{ fontSize: `${fontSize}px` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">ITEM {currentIdx + 1} / {questions.length}</span>
              <button 
                onClick={() => toggleFlag(currentQuestion.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  currentAnswer?.isFlagged 
                    ? 'bg-amber-50 border-amber-200 text-amber-700' 
                    : 'bg-white border-border-main text-text-muted hover:border-accent hover:text-accent'
                }`}
              >
                <Flag size={14} fill={currentAnswer?.isFlagged ? "currentColor" : "none"} />
                <span className="font-bold text-[10px] uppercase tracking-widest">Ragu-Ragu</span>
              </button>
            </div>

            <div className="bg-white p-10 rounded-2xl border border-border-main shadow-sm leading-relaxed text-text-main">
              {currentQuestion.media?.type === 'audio' && (
                <div className="mb-8 p-5 bg-gray-50 rounded-xl flex items-center gap-5 border border-border-main">
                  <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100">
                    <Volume2 size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Media Listening</p>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-accent w-1/3" />
                    </div>
                  </div>
                  <button className="p-2 text-text-muted hover:text-accent hover:bg-white rounded-lg transition-colors">
                    <Play size={18} />
                  </button>
                </div>
              )}
              
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: currentQuestion.text }} />
            </div>

            {/* Answers */}
            <div className="grid gap-3">
              {currentQuestion.type === 'mcq' && currentQuestion.options?.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => updateAnswer(currentQuestion.id, opt.id)}
                  className={`flex items-center gap-5 p-5 rounded-xl border-2 transition-all text-left ${
                    currentAnswer?.answer === opt.id
                      ? 'bg-accent-light border-accent ring-4 ring-blue-50/50'
                      : 'bg-white border-transparent border-border-main hover:border-accent/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border-2 shrink-0 transition-colors ${
                    currentAnswer?.answer === opt.id
                      ? 'bg-accent border-accent text-white'
                      : 'bg-gray-50 border-gray-100 text-text-muted'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="font-bold text-sm text-text-main opacity-90">{opt.text}</span>
                </button>
              ))}

              {currentQuestion.type === 'essay' && (
                <textarea 
                  className="w-full p-8 rounded-2xl border border-border-main focus:border-accent focus:ring-4 focus:ring-accent-light transition-all outline-none bg-white min-h-[220px] text-sm font-medium"
                  placeholder="Ketik jawaban penjelasan Anda di sini secara lengkap..."
                  value={currentAnswer?.answer || ''}
                  onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
                />
              )}
            </div>
          </motion.div>
        </main>

        {/* Navigation Sidebar */}
        <aside className="w-[300px] bg-white border-l border-border-main p-8 hidden lg:flex flex-col">
          <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] mb-8">
            Navigasi Soal
          </h3>
          
          <div className="grid grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
            {questions.map((q, i) => {
              const ans = answers.find(a => a.questionId === q.id);
              const isAnswered = ans?.answer !== null && ans?.answer !== undefined && ans?.answer !== '';
              const isFlagged = ans?.isFlagged;
              const isActive = currentIdx === i;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`aspect-square rounded-lg flex items-center justify-center font-bold text-xs transition-all border-2 ${
                    isActive ? 'ring-2 ring-offset-2 ring-accent' : ''
                  } ${
                    isFlagged ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' :
                    isAnswered ? 'bg-accent border-accent text-white shadow-lg shadow-blue-100' :
                    'bg-white border-border-main text-text-muted hover:border-accent hover:text-accent'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-8 border-t border-gray-50 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-text-muted">
                <div className="w-3 h-3 rounded bg-accent" />
                <span>Terjawab</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-text-muted">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Ragu-Ragu</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-wider text-text-muted">
                <div className="w-3 h-3 rounded border border-border-main" />
                <span>Kosong</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer Controls */}
      <footer className="h-20 bg-white border-t border-border-main px-8 flex items-center justify-between z-40 sticky bottom-0">
        <button 
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-main font-bold text-xs text-text-muted hover:border-accent hover:text-accent disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft size={16} />
          PREVIOUS
        </button>

        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 text-[10px] font-black text-text-muted tracking-widest">
             PROGRESS: <span className="text-accent">{answers.filter(a => a.answer).length} / {questions.length}</span>
          </div>
        </div>

        <button 
           onClick={() => currentIdx === questions.length - 1 ? setShowSubmitModal(true) : setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-text-main text-white font-bold text-xs hover:bg-accent transition-all shadow-md uppercase tracking-wider"
        >
          {currentIdx === questions.length - 1 ? 'FINISH EXAM' : 'NEXT ITEM'}
          <ChevronRight size={16} />
        </button>
      </footer>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {cheatWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[100] font-bold"
          >
            <AlertTriangle size={20} />
            {cheatWarning}
            <button onClick={() => setCheatWarning(null)} className="ml-4 hover:opacity-70">
              <X size={20} />
            </button>
          </motion.div>
        )}

        {showSubmitModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-sm bg-gray-900/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Selesaikan Ujian?</h2>
                <p className="text-gray-500 mt-2">Pastikan semua pertanyaan telah dijawab. Anda tidak dapat kembali ke ujian setelah menekan tombol konfirmasi.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowSubmitModal(false)}
                  className="py-4 rounded-2xl border-2 border-gray-100 font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Periksa Lagi
                </button>
                <button 
                  onClick={handleSubmit}
                  className="py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-colors"
                >
                  Konfirmasi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
