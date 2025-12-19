
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Heart,
  Crown,
  Check,
  Briefcase,
  User,
  StickyNote,
  Trash2,
  Download,
  Upload,
  Wand2,
  Cloud,
  CloudOff,
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Task, ModalType } from './types';
import { 
  formatDateKey, 
  generateCalendarGrid, 
  loadTasks, 
  saveTasks, 
  hexToRgba, 
  getRandomFreshColor, 
  PERSONAL_COLOR,
  getMonthKey,
  loadMonthlyNotes,
  saveMonthlyNotes
} from './utils';
import { Modal } from './components/Modal';
import { Drawer } from './components/Drawer';
import { TaskForm } from './components/TaskForm';
import { SupabaseAuthModal } from './components/SupabaseAuthModal';
import { getSupabase } from './supabaseClient';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const Sticker = ({ icon: Icon, className, style }: { icon: any, className?: string, style?: React.CSSProperties }) => (
  <div className={`absolute pointer-events-none z-0 opacity-80 ${className}`} style={style}>
    <div className="relative">
      <Icon size={32} className="text-white absolute -top-0.5 -left-0.5 stroke-[4px]" />
      <Icon size={32} className="text-white absolute -top-0.5 left-0.5 stroke-[4px]" />
      <Icon size={32} className="text-white absolute top-0.5 -left-0.5 stroke-[4px]" />
      <Icon size={32} className="text-white absolute top-0.5 left-0.5 stroke-[4px]" />
      <Icon size={32} className="relative z-10 sticker" />
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [monthlyNotes, setMonthlyNotes] = useState<Record<string, string>>({});
  const [modalType, setModalType] = useState<ModalType>(ModalType.NONE); 
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [drawerMode, setDrawerMode] = useState<'list' | 'form'>('list');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialTaskColor, setInitialTaskColor] = useState<string>(PERSONAL_COLOR); 
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshFromSupabase = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setIsSyncing(true);
    const { data: remoteTasks, error: tasksError } = await supabase.from('tasks').select('*');
    if (!tasksError && remoteTasks) setTasks(remoteTasks as Task[]);
    const { data: remoteNotes, error: notesError } = await supabase.from('monthly_notes').select('month_key, content');
    if (!notesError && remoteNotes) {
      const notesObj: Record<string, string> = {};
      remoteNotes.forEach((n: any) => notesObj[n.month_key] = n.content);
      setMonthlyNotes(notesObj);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    const loadedTasks = loadTasks();
    setTasks(loadedTasks);
    setMonthlyNotes(loadMonthlyNotes());
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUserEmail(session.user.email || 'User');
          refreshFromSupabase();
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUserEmail(session.user.email || 'User');
          refreshFromSupabase();
        } else if (event === 'SIGNED_OUT') {
          setUserEmail(null);
          setTasks(loadTasks());
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []); 

  useEffect(() => {
    if (tasks.length > 0) {
      const todayStr = formatDateKey(new Date());
      const todaysPending = tasks.filter(t => t.date === todayStr && !t.completed);
      if (todaysPending.length > 0 && modalType === ModalType.NONE) {
        setModalType(ModalType.REMINDER);
      }
    }
  }, [tasks.length]); 

  useEffect(() => { saveTasks(tasks); }, [tasks]);
  useEffect(() => { if (!isDrawerOpen) { setIsSelectionMode(false); setSelectedTaskIds(new Set()); } }, [isDrawerOpen]);

  const calendarGrid = useMemo(() => generateCalendarGrid(currentDate), [currentDate]);
  const currentMonthKey = getMonthKey(currentDate);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateKey(formatDateKey(today));
    setDrawerMode('list');
    setIsDrawerOpen(true);
  };

  const saveTask = async (task: Task) => {
    setTasks(prev => {
       const exists = prev.some(t => t.id === task.id);
       if (exists) return prev.map(t => t.id === task.id ? task : t);
       return [...prev, task];
    });
    if (task.date === selectedDateKey) setDrawerMode('list');
    const supabase = getSupabase();
    if (userEmail && supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const payload = { ...task, user_id: user.id };
            await supabase.from('tasks').upsert(payload);
        }
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setDrawerMode('list');
    const supabase = getSupabase();
    if (userEmail && supabase) await supabase.from('tasks').delete().eq('id', id);
  };

  const toggleTaskCompletion = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if(!taskToUpdate) return;
    const updatedTask = { ...taskToUpdate, completed: !taskToUpdate.completed };
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    if (userEmail) {
      const supabase = getSupabase();
      if (supabase) await supabase.from('tasks').update({ completed: updatedTask.completed }).eq('id', taskId);
    }
  };

  const handleExportData = () => {
    const dataToExport = { tasks, monthlyNotes, exportDate: new Date().toISOString(), version: "1.0" };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aoe-calendar-backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSmartAdd = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const today = new Date();
      const contextStr = `Today is ${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}. Weekday is ${WEEKDAYS[today.getDay()]}.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Context: ${contextStr}. User Request: "${aiPrompt}". Extract task details to JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              date: { type: Type.STRING },
              color: { type: Type.STRING }
            },
            required: ["title", "date", "color"]
          }
        }
      });
      const data = JSON.parse(response.text);
      
      // Check for duplicates before AI auto-add
      const isDuplicate = tasks.some(t => t.date === data.date && t.title.toLowerCase() === data.title.toLowerCase());
      if(isDuplicate) {
          alert(`AI 想添加的任务 "${data.title}" 在 ${data.date} 已存在，已跳过。`);
          setModalType(ModalType.NONE);
          return;
      }

      const newTask: Task = { id: crypto.randomUUID(), title: data.title, description: data.description || '', date: data.date, color: data.color || getRandomFreshColor(), completed: false };
      await saveTask(newTask);
      setModalType(ModalType.NONE);
      setAiPrompt('');
    } catch (error) {
      console.error(error);
      alert("AI 暂时休息了");
    } finally { setIsAiLoading(false); }
  };

  const selectedDateTasks = useMemo(() => tasks.filter(t => t.date === selectedDateKey).sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)), [tasks, selectedDateKey]);

  return (
    <div className="min-h-screen pb-20 pt-4 sm:pt-6 px-2 sm:px-8 flex flex-col items-center relative overflow-x-hidden text-slate-800">
      
      <Sticker icon={Crown} className="top-5 left-2 sm:top-10 sm:left-10 text-blue-300 rotate-[-12deg] scale-75 sm:scale-100" />
      <Sticker icon={Heart} className="top-20 -right-4 sm:top-40 sm:right-10 text-pink-400 rotate-[12deg] scale-75 sm:scale-100" />

      {/* Header */}
      <div className="w-full max-w-6xl bg-white/90 backdrop-blur-md rounded-[2rem] shadow-xl border-2 sm:border-4 border-white p-3 sm:p-4 mb-4 sm:mb-8 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl text-white shadow-md rotate-3">
              <Crown size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1">
              发疯日程 <Heart size={14} className="text-pink-500 fill-pink-500 animate-pulse" />
            </h1>
          </div>
          <div className="md:hidden flex gap-2">
            <button onClick={() => setModalType(ModalType.AUTH)} className={`p-2 rounded-xl border ${userEmail ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-gray-400'}`}>
              {userEmail ? <Cloud size={18} fill="currentColor"/> : <CloudOff size={18}/>}
            </button>
          </div>
        </div>

        <div className="flex items-center bg-blue-50 rounded-full p-1 border border-blue-100 w-full md:w-auto">
          <button onClick={prevMonth} className="p-2 text-gray-400 hover:text-blue-600 active:scale-90"><ChevronLeft size={20}/></button>
          <div className="flex-1 px-4 font-black text-lg sm:text-xl text-blue-900 text-center font-mono">
            {currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}
          </div>
          <button onClick={nextMonth} className="p-2 text-gray-400 hover:text-blue-600 active:scale-90"><ChevronRight size={20}/></button>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={goToToday} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md">
            <Sparkles size={14} className="text-yellow-400"/>今天
          </button>
          <button onClick={() => setModalType(ModalType.AI_WIZARD)} className="flex-1 md:flex-none px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md">
            <Wand2 size={14}/>AI 助手
          </button>
          <button onClick={() => setModalType(ModalType.AUTH)} className="hidden md:flex p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-500 transition-all">
            {userEmail ? <Cloud size={20} className="text-green-500 fill-green-100" /> : <CloudOff size={20} />}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="w-full max-w-6xl relative z-10 select-none mb-8">
        <div className="grid grid-cols-7 mb-2 gap-1">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={`text-center py-1 text-[10px] sm:text-xs font-black rounded-lg border ${i===0||i===6 ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-white text-gray-400 border-gray-100'}`}>{day.replace('周','')}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr">
          {calendarGrid.map((day, idx) => {
            const dayTasks = tasks.filter(t => t.date === day.dateString).sort((a,b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
            return (
              <div
                key={idx}
                onClick={() => { setSelectedDateKey(day.dateString); setDrawerMode('list'); setIsDrawerOpen(true); }}
                className={`
                  min-h-[70px] sm:min-h-[120px] rounded-xl sm:rounded-2xl p-1 transition-all cursor-pointer relative flex flex-col border-2
                  ${!day.isCurrentMonth ? 'bg-gray-50/30 border-transparent text-gray-300' : 'bg-white border-white hover:border-blue-200'}
                  ${day.isToday ? 'ring-2 ring-blue-300 border-blue-400 bg-blue-50/50' : ''}
                `}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-base font-black ${day.isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600'}`}>
                    {day.date.getDate()}
                  </span>
                </div>

                <div className="flex sm:hidden flex-wrap gap-1 px-0.5 mt-auto pb-1">
                  {dayTasks.map(task => (
                    <div key={task.id} className={`w-1.5 h-1.5 rounded-full ${task.completed ? 'bg-gray-200' : ''}`} style={!task.completed ? { backgroundColor: task.color || PERSONAL_COLOR } : {}} />
                  ))}
                </div>

                <div className="hidden sm:flex flex-col gap-1 overflow-hidden w-full">
                  {dayTasks.slice(0, 3).map(task => (
                    <div key={task.id} className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold truncate border ${task.completed ? 'bg-gray-50 text-gray-300 border-transparent line-through' : ''}`} style={!task.completed ? { backgroundColor: hexToRgba(task.color || PERSONAL_COLOR, 0.1), color: task.color || PERSONAL_COLOR, borderColor: hexToRgba(task.color || PERSONAL_COLOR, 0.2) } : {}}>
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && <div className="text-[9px] text-gray-400 font-bold pl-1">+{dayTasks.length - 3} 更多</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="w-full max-w-6xl relative z-10 mb-20 sm:mb-12">
        <div className="bg-[#fffbeb] p-5 sm:p-8 rounded-3xl shadow-xl border-4 border-white rotate-1 hover:rotate-0 transition-transform">
          <div className="flex items-center gap-3 mb-3 text-yellow-700">
              <StickyNote size={20} strokeWidth={3} className="text-yellow-400" />
              <h3 className="font-black text-sm sm:text-lg tracking-tight">{currentDate.getFullYear()}年{currentDate.getMonth() + 1}月 · 重点记</h3>
          </div>
          <textarea
            value={monthlyNotes[currentMonthKey] || ''}
            onChange={(e) => {
              const newVal = e.target.value;
              const newNotes = { ...monthlyNotes, [currentMonthKey]: newVal };
              setMonthlyNotes(newNotes);
              saveMonthlyNotes(newNotes);
            }}
            placeholder="本月的小目标..."
            className="w-full h-24 sm:h-32 bg-transparent border-none outline-none text-yellow-900/80 font-medium text-sm sm:text-base leading-relaxed resize-none placeholder-yellow-900/20"
            style={{ backgroundImage: 'linear-gradient(transparent 27px, #fde68a 28px)', backgroundSize: '100% 28px', lineHeight: '28px' }}
          />
        </div>
      </div>

      {/* Reminder */}
      <Modal isOpen={modalType === ModalType.REMINDER} onClose={() => setModalType(ModalType.NONE)} title="👿 今日任务通缉令">
        <div className="space-y-4">
          <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 flex gap-3 items-center">
             <AlertCircle className="text-red-500" size={24} />
             <div>
                <p className="text-red-800 font-black">发现未完成任务！</p>
                <p className="text-red-600 text-xs font-bold">今天的事今天毕，别让任务过夜</p>
             </div>
          </div>
          <div className="max-h-[350px] overflow-y-auto task-scroll space-y-3 pr-1">
            {tasks.filter(t => t.date === formatDateKey(new Date()) && !t.completed).map(task => (
                <div key={task.id} className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-3 h-3 rounded-full" style={{backgroundColor: task.color || PERSONAL_COLOR}} />
                     <h4 className="font-black text-slate-800 text-lg">{task.title}</h4>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 font-medium">{task.description || '暂无详细描述...'}</div>
                </div>
              ))}
          </div>
          <button onClick={() => setModalType(ModalType.NONE)} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 active:scale-95 transition-all text-lg">即刻启程！</button>
        </div>
      </Modal>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerMode === 'list' ? '📅 任务清单' : (editingTask ? '📝 修改记录' : '✨ 安排任务')}
      >
        {drawerMode === 'list' ? (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <div className="text-blue-900 font-black text-xl">{selectedDateKey}</div>
              <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${isSelectionMode ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-100 text-gray-500'}`}>
                {isSelectionMode ? '取消' : '批量'}
              </button>
            </div>
            
            <div className="flex-1 space-y-4">
              {selectedDateTasks.length === 0 ? (
                <div className="py-20 text-center border-4 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                   <p className="text-slate-400 font-black">空空如也，快去摸鱼</p>
                </div>
              ) : (
                selectedDateTasks.map(task => (
                  <div key={task.id} className={`p-4 border-2 rounded-2xl transition-all flex gap-3 items-center relative overflow-hidden group ${isSelectionMode ? (selectedTaskIds.has(task.id) ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-100 opacity-60') : (task.completed ? 'bg-slate-50 opacity-60' : 'bg-white border-slate-100 shadow-sm')}`}>
                    {!isSelectionMode && <button onClick={(e) => toggleTaskCompletion(e, task.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}><Check size={14} strokeWidth={4}/></button>}
                    
                    <div className="flex-1 cursor-pointer" onClick={() => !isSelectionMode && (setEditingTask(task), setDrawerMode('form'))}>
                      <h4 className={`font-black text-lg ${task.completed && !isSelectionMode ? 'line-through text-slate-400' : 'text-slate-800'}`} style={!task.completed && !isSelectionMode ? {color: task.color} : {}}>{task.title}</h4>
                      {task.description && <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">{task.description}</p>}
                    </div>

                    {/* Quick Delete Button */}
                    {!isSelectionMode && (
                        <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              if(window.confirm(`确定要删除 "${task.title}" 吗？`)) deleteTask(task.id);
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-6 mt-auto border-t space-y-3">
              <button onClick={() => { setEditingTask(null); setInitialTaskColor(PERSONAL_COLOR); setDrawerMode('form'); }} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg active:scale-95 flex items-center justify-center gap-2"><User size={20}/> AOE 任务</button>
              <button onClick={() => { setEditingTask(null); setInitialTaskColor(getRandomFreshColor()); setDrawerMode('form'); }} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-800 font-black rounded-2xl shadow-md active:scale-95 flex items-center justify-center gap-2"><Briefcase size={20} className="text-orange-400" /> 打工任务</button>
            </div>
          </div>
        ) : (
          <TaskForm allTasks={tasks} initialDate={selectedDateKey} existingTask={editingTask} initialColor={initialTaskColor} onSave={saveTask} onDelete={deleteTask} onBack={() => setDrawerMode('list')} />
        )}
      </Drawer>

      <Modal isOpen={modalType === ModalType.AI_WIZARD} onClose={() => setModalType(ModalType.NONE)} title="✨ AI 魔法助手">
        <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="下周二下午开会..." className="w-full h-32 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-purple-300 focus:bg-white outline-none font-medium mb-4"/>
        <button onClick={handleSmartAdd} disabled={isAiLoading || !aiPrompt.trim()} className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black rounded-2xl shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
          {isAiLoading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <Wand2 size={20}/>}
          变变变！
        </button>
      </Modal>

      <Modal isOpen={modalType === ModalType.AUTH} onClose={() => setModalType(ModalType.NONE)} title="☁️ 云端同步">
        <SupabaseAuthModal userEmail={userEmail} onLoginSuccess={() => setModalType(ModalType.NONE)} onLogout={() => { const s = getSupabase(); if(s) s.auth.signOut(); }} onExport={handleExportData} onImport={() => fileInputRef.current?.click()} />
      </Modal>

      <input type="file" ref={fileInputRef} onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const data = JSON.parse(ev.target?.result as string);
            if(window.confirm(`确认导入 ${data.tasks?.length} 条任务并覆盖？`)) {
              setTasks(data.tasks); saveTasks(data.tasks);
              if(data.monthlyNotes) { setMonthlyNotes(data.monthlyNotes); saveMonthlyNotes(data.monthlyNotes); }
              alert("导入成功！");
            }
          } catch(err) { alert("文件解析失败"); }
        };
        reader.readAsText(file);
      }} className="hidden" accept=".json"/>
    </div>
  );
};

export default App;
