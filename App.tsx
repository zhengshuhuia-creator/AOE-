
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2,
  Circle,
  Sparkles,
  Plus,
  Heart,
  Star,
  Crown,
  Zap,
  Music,
  Layers,
  Check,
  Copy,
  Briefcase,
  User,
  StickyNote,
  Trash2,
  ClipboardPaste,
  Download,
  Upload,
  Wand2,
  Bot,
  Cloud,
  CloudOff
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Task, ModalType } from './types';
import { 
  formatDateKey, 
  generateCalendarGrid, 
  loadTasks, 
  saveTasks, 
  addMonthsToDate, 
  hexToRgba, 
  getRandomFreshColor, 
  PERSONAL_COLOR,
  getMonthKey,
  loadMonthlyNotes,
  saveMonthlyNotes,
  FRESH_PALETTE
} from './utils';
import { Modal } from './components/Modal';
import { Drawer } from './components/Drawer';
import { TaskForm } from './components/TaskForm';
import { SupabaseAuthModal } from './components/SupabaseAuthModal';
import { getSupabase } from './supabaseClient';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// Sticker Component for decorations
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
  // --- State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [monthlyNotes, setMonthlyNotes] = useState<Record<string, string>>({});
  
  // UI State
  const [modalType, setModalType] = useState<ModalType>(ModalType.NONE); 
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Selection / Edit State
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [drawerMode, setDrawerMode] = useState<'list' | 'form'>('list');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialTaskColor, setInitialTaskColor] = useState<string>(PERSONAL_COLOR); 

  // Batch Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [copyMonthsCount, setCopyMonthsCount] = useState<number>(1);
  const [showBatchSuccess, setShowBatchSuccess] = useState(false);

  // New Features: Clipboard & Backup
  const [clipboardTask, setClipboardTask] = useState<Task | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Feature State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // SUPABASE STATE
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Initialization & Supabase Logic ---

  const refreshFromSupabase = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSyncing(true);
    
    // Fetch Tasks
    const { data: remoteTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*');
    
    if (!tasksError && remoteTasks) {
      setTasks(remoteTasks as Task[]);
    }

    // Fetch Notes
    const { data: remoteNotes, error: notesError } = await supabase
      .from('monthly_notes')
      .select('month_key, content');
      
    if (!notesError && remoteNotes) {
      const notesObj: Record<string, string> = {};
      remoteNotes.forEach((n: any) => {
        notesObj[n.month_key] = n.content;
      });
      setMonthlyNotes(notesObj);
    }

    setIsSyncing(false);
  };

  useEffect(() => {
    // 1. Load Local
    const loadedTasks = loadTasks();
    setTasks(loadedTasks);
    setMonthlyNotes(loadMonthlyNotes());

    // 2. Setup Supabase
    const supabase = getSupabase();
    if (supabase) {
      // Check initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUserEmail(session.user.email || 'User');
          refreshFromSupabase();
        }
      });

      // Listen for Auth Changes (Login/Logout)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUserEmail(session.user.email || 'User');
          refreshFromSupabase();
        } else if (event === 'SIGNED_OUT') {
          setUserEmail(null);
          setTasks(loadTasks()); // Revert to local storage on logout
        }
      });

      // Setup Realtime Subscription
      const channel = supabase
        .channel('public:data')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
           if (payload.eventType === 'INSERT') {
             setTasks(prev => {
                if (prev.some(t => t.id === payload.new.id)) return prev;
                return [...prev, payload.new as Task]
             });
           } else if (payload.eventType === 'UPDATE') {
             setTasks(prev => prev.map(t => t.id === payload.new.id ? (payload.new as Task) : t));
           } else if (payload.eventType === 'DELETE') {
             setTasks(prev => prev.filter(t => t.id !== payload.old.id));
           }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_notes' }, () => {
          supabase.from('monthly_notes').select('month_key, content').then(({ data }) => {
             if(data) {
                const notesObj: Record<string, string> = {};
                data.forEach((n: any) => notesObj[n.month_key] = n.content);
                setMonthlyNotes(notesObj);
             }
          });
        })
        .subscribe();

      return () => { 
        subscription.unsubscribe();
        supabase.removeChannel(channel); 
      };
    }

    // Daily Reminder check
    const todayStr = formatDateKey(new Date());
    const todaysTasks = loadedTasks.filter(t => t.date === todayStr && !t.completed);
    if (todaysTasks.length > 0) {
      setModalType(ModalType.REMINDER);
    }
  }, []); 

  // Save to LocalStorage whenever state changes (backup)
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (!isDrawerOpen) {
      setIsSelectionMode(false);
      setSelectedTaskIds(new Set());
      setCopyMonthsCount(1);
    }
  }, [isDrawerOpen, selectedDateKey]);

  // --- Computed Data ---
  const calendarGrid = useMemo(() => generateCalendarGrid(currentDate), [currentDate]);
  const currentMonthKey = getMonthKey(currentDate);

  // --- Handlers ---
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateKey(dateStr);
    setDrawerMode('list'); 
    setIsDrawerOpen(true);
  };

  const handleCalendarTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); 
    setSelectedDateKey(task.date);
    setEditingTask(task);
    setDrawerMode('form');
    setIsDrawerOpen(true);
  };

  const saveTask = async (task: Task) => {
    // 1. Update Local
    setTasks(prev => {
       const exists = prev.some(t => t.id === task.id);
       if (exists) return prev.map(t => t.id === task.id ? task : t);
       return [...prev, task];
    });

    if (task.date === selectedDateKey) {
        setDrawerMode('list');
    }

    // 2. Sync Supabase
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
    // 1. Update Local
    setTasks(prev => prev.filter(t => t.id !== id));
    setDrawerMode('list');

    // 2. Sync Supabase
    const supabase = getSupabase();
    if (userEmail && supabase) {
        await supabase.from('tasks').delete().eq('id', id);
    }
  };

  const toggleTaskCompletion = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    
    // Optimistic Update
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if(!taskToUpdate) return;
    const updatedTask = { ...taskToUpdate, completed: !taskToUpdate.completed };
    
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    // Supabase Sync
    if (userEmail) {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('tasks').update({ completed: updatedTask.completed }).eq('id', taskId);
      }
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const newNotes = { ...monthlyNotes, [currentMonthKey]: newVal };
    setMonthlyNotes(newNotes);
    saveMonthlyNotes(newNotes);

    // Sync Supabase (Debounce ideally, but simple upsert for now)
    const supabase = getSupabase();
    if (userEmail && supabase) {
        // Simple timeout to avoid too many requests
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase.from('monthly_notes').upsert({
                    user_id: user.id,
                    month_key: currentMonthKey,
                    content: newVal
                }, { onConflict: 'user_id, month_key' }).then();
            }
        });
    }
  };

  // Drawer Actions
  const handleAddNewWorkTask = () => {
    setEditingTask(null);
    setInitialTaskColor(getRandomFreshColor());
    setDrawerMode('form');
  };

  const handleAddNewPersonalTask = () => {
    setEditingTask(null);
    setInitialTaskColor(PERSONAL_COLOR);
    setDrawerMode('form');
  };

  const handleEditTaskFromList = (task: Task) => {
    if (isSelectionMode) {
      toggleTaskSelection(task.id);
    } else {
      setEditingTask(task);
      setDrawerMode('form');
    }
  };

  const handleBackToList = () => {
    setDrawerMode('list');
    setEditingTask(null);
  };

  // Batch / Selection
  const toggleTaskSelection = (taskId: string) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTaskIds(newSet);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedTaskIds(new Set()); 
    setCopyMonthsCount(1);
  };

  const handleBatchCopy = () => {
    if (selectedTaskIds.size === 0) return;

    const tasksToCopy = tasks.filter(t => selectedTaskIds.has(t.id));
    const newTasks: Task[] = [];

    tasksToCopy.forEach(task => {
      for (let i = 1; i <= copyMonthsCount; i++) {
        const nextDate = addMonthsToDate(task.date, i);
        const copy: Task = {
          id: crypto.randomUUID(),
          date: nextDate,
          title: task.title,
          description: task.description,
          completed: false, 
          color: task.color,
        };
        newTasks.push(copy);
        saveTask(copy); 
      }
    });
    
    setShowBatchSuccess(true);
    setTimeout(() => {
      setShowBatchSuccess(false);
      setIsSelectionMode(false);
      setSelectedTaskIds(new Set());
    }, 1500);
  };

  // --- Advanced Actions (Copy/Paste/Delete) ---

  const handleCopyTask = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setClipboardTask(task);
    alert(`已复制任务: "${task.title}"\n请切换到目标日期，点击底部的粘贴按钮。`);
  };

  const handlePasteTask = () => {
    if (!clipboardTask) return;
    
    const newTask: Task = {
        id: crypto.randomUUID(),
        date: selectedDateKey,
        title: clipboardTask.title,
        description: clipboardTask.description,
        color: clipboardTask.color,
        completed: false
    };
    
    saveTask(newTask);
    alert('粘贴成功！');
  };

  const handleQuickDelete = (e: React.MouseEvent, taskId: string) => {
     e.stopPropagation();
     if(window.confirm('确定要删除这个任务吗？')) {
         deleteTask(taskId);
     }
  };

  // --- Backup & Restore (JSON) ---
  const handleExportData = () => {
    const dataToExport = {
        tasks: tasks,
        monthlyNotes: monthlyNotes,
        exportDate: new Date().toISOString(),
        version: "1.0"
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aoe-calendar-backup-${formatDateKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so user can select same file again if needed
    if (event.target) event.target.value = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const result = e.target?.result as string;
            if (!result) return;
            
            const importedData = JSON.parse(result);

            if (importedData.tasks && Array.isArray(importedData.tasks)) {
                if (window.confirm(`准备导入备份数据：\n\n包含 ${importedData.tasks.length} 个任务\n\n确定要继续吗？`)) {
                    
                    const supabase = getSupabase();
                    
                    // --- 1. Check Login Status ---
                    let currentUser = null;
                    if (supabase) {
                       const { data } = await supabase.auth.getUser();
                       currentUser = data.user;
                    }

                    if (currentUser && supabase) {
                       // --- CLOUD IMPORT MODE (Inject user_id) ---
                       setIsSyncing(true);
                       try {
                          console.log("Start Cloud Import for user:", currentUser.id);

                          // 2. Prepare Tasks: Force user_id injection
                          const tasksToUpload = importedData.tasks.map((t: any) => ({
                             id: t.id || crypto.randomUUID(),
                             date: t.date,
                             title: t.title,
                             description: t.description || '',
                             completed: !!t.completed,
                             color: t.color || PERSONAL_COLOR,
                             user_id: currentUser.id // CRITICAL: FORCE USER ID
                          }));
                          
                          // 3. Prepare Notes: Convert to array & inject user_id
                          const notesToUpload: any[] = [];
                          if (importedData.monthlyNotes) {
                             Object.entries(importedData.monthlyNotes).forEach(([key, content]) => {
                                notesToUpload.push({
                                   month_key: key,
                                   content: content,
                                   user_id: currentUser.id // CRITICAL: FORCE USER ID
                                });
                             });
                          }

                          // 4. Batch Upsert Tasks
                          const { error: taskError } = await supabase.from('tasks').upsert(tasksToUpload);
                          if (taskError) throw new Error(`Tasks Upload Error: ${taskError.message}`);

                          // 5. Batch Upsert Notes
                          if (notesToUpload.length > 0) {
                             const { error: noteError } = await supabase.from('monthly_notes').upsert(notesToUpload, { onConflict: 'user_id, month_key' });
                             if (noteError) throw new Error(`Notes Upload Error: ${noteError.message}`);
                          }

                          // 6. Immediate Refresh
                          await refreshFromSupabase();
                          
                          alert(`✅ 数据已成功上传到云端！\n共同步了 ${tasksToUpload.length} 个任务。`);

                       } catch (err: any) {
                          console.error("Cloud import failed", err);
                          alert(`❌ 云端上传失败: ${err.message}`);
                       } finally {
                          setIsSyncing(false);
                       }

                    } else {
                       // --- LOCAL ONLY MODE ---
                       setTasks(importedData.tasks);
                       if (importedData.monthlyNotes) {
                           setMonthlyNotes(importedData.monthlyNotes);
                           saveMonthlyNotes(importedData.monthlyNotes);
                       }
                       saveTasks(importedData.tasks);
                       alert("✅ 本地恢复成功！\n(提示：您当前未登录，数据仅保存在此浏览器)");
                    }
                }
            } else {
                alert("❌ 文件格式错误：这似乎不是有效的备份文件。");
            }
        } catch (error: any) {
            alert("❌ 读取文件失败：" + error.message);
        }
    };
    reader.readAsText(file);
  };

  // --- Gemini AI Features ---
  const handleSmartAdd = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const today = new Date();
      const contextStr = `Today is ${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()} (YYYY-MM-DD). Weekday is ${WEEKDAYS[today.getDay()]}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Context: ${contextStr}. User Request: "${aiPrompt}". Extract task details. If no specific color is mentioned, pick a nice pastel color hex code suitable for a calendar.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Short title of the task" },
              description: { type: Type.STRING, description: "Detailed description if any, or empty string" },
              date: { type: Type.STRING, description: "Target date in YYYY-MM-DD format" },
              color: { type: Type.STRING, description: "Hex color code" }
            },
            required: ["title", "date", "color"]
          }
        }
      });

      const resultText = response.text;
      if (resultText) {
        const data = JSON.parse(resultText);
        const newTask: Task = {
           id: crypto.randomUUID(),
           title: data.title,
           description: data.description || '',
           date: data.date,
           color: data.color || getRandomFreshColor(),
           completed: false
        };
        
        // Save using the robust saveTask which handles sync
        await saveTask(newTask);
        
        setModalType(ModalType.NONE);
        // Provide feedback or scroll to date?
        // Let's scroll/select that date
        setSelectedDateKey(newTask.date);
        // Optionally open drawer? Maybe just show confirmation.
        alert(`✅ 魔法生效！已添加任务到 ${newTask.date}`);
        setAiPrompt('');
      }

    } catch (error) {
      console.error("Gemini Error:", error);
      alert("AI 暂时有点晕，请稍后再试！");
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedDateTasks = useMemo(() => {
    return tasks
      .filter(t => t.date === selectedDateKey)
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return 0; 
      });
  }, [tasks, selectedDateKey]);

  return (
    <div className="min-h-screen pb-20 pt-6 px-4 sm:px-8 flex flex-col items-center relative overflow-hidden text-slate-800">
      
      {/* Background Stickers */}
      <Sticker icon={Crown} className="top-10 left-10 text-blue-300 rotate-[-12deg]" />
      <Sticker icon={Heart} className="top-40 right-10 text-pink-400 rotate-[12deg]" />
      <Sticker icon={Star} className="bottom-20 left-20 text-yellow-300 rotate-[45deg]" />
      <Sticker icon={Zap} className="bottom-40 right-40 text-blue-200 -rotate-[12deg]" />
      <Sticker icon={Music} className="top-32 left-1/4 text-purple-200 rotate-[20deg]" />

      {/* Header Card */}
      <div className="w-full max-w-6xl bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-xl shadow-blue-100 border-4 border-white p-4 mb-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 transform hover:scale-[1.01] transition-transform duration-300 relative z-10">
        <div className="flex items-center space-x-4 pl-2">
          <div className="p-4 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl text-white shadow-lg shadow-blue-200 rotate-3 border-2 border-white">
            <Crown size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              发疯日程 <Heart size={20} className="text-pink-500 fill-pink-500 animate-bounce" />
            </h1>
            <p className="text-sm text-blue-400 font-bold tracking-wider">AOE's Calendar</p>
          </div>
        </div>

        <div className="flex items-center bg-blue-50 rounded-full p-2 shadow-inner border-2 border-blue-100">
          <button onClick={prevMonth} className="p-3 hover:bg-white hover:text-blue-600 hover:shadow-md rounded-full transition-all text-gray-400 active:scale-90">
            <ChevronLeft size={24} strokeWidth={3} />
          </button>
          <div className="px-8 font-black text-2xl text-blue-900 min-w-[180px] text-center tracking-wide font-mono">
            {currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}
          </div>
          <button onClick={nextMonth} className="p-3 hover:bg-white hover:text-blue-600 hover:shadow-md rounded-full transition-all text-gray-400 active:scale-90">
            <ChevronRight size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={goToToday}
            className="px-4 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all border-4 border-gray-200 hover:border-blue-200 shadow-lg active:scale-95 flex items-center gap-2"
          >
            <Sparkles size={16} className="text-yellow-300" />
            <span className="hidden sm:inline">今天</span>
          </button>

          <button
             onClick={() => setModalType(ModalType.AI_WIZARD)}
             className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-purple-200 transition-all border-4 border-white active:scale-95 flex items-center gap-2"
          >
             <Wand2 size={18} />
             <span className="hidden sm:inline">AI 助手</span>
          </button>

          <button
            onClick={() => setModalType(ModalType.AUTH)}
            className={`
              p-3 rounded-2xl border-4 transition-all shadow-lg active:scale-95
              ${userEmail 
                ? 'bg-green-100 border-green-200 text-green-600' 
                : 'bg-white border-gray-100 text-gray-400 hover:text-blue-500'}
            `}
            title={userEmail ? `已同步: ${userEmail}` : "未连接云端"}
          >
            {userEmail ? <Cloud size={20} className="fill-current" /> : <CloudOff size={20} />}
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="w-full max-w-6xl relative z-10 mb-8">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-4 px-2">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className="text-center">
              <span className={`
                inline-block px-4 py-2 rounded-2xl text-sm font-black tracking-wide shadow-sm border-2
                ${i === 0 || i === 6 ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-white text-gray-500 border-white'}
              `}>
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 auto-rows-fr">
          {calendarGrid.map((day, idx) => {
            const dayTasks = tasks
              .filter(t => t.date === day.dateString)
              .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
            const isToday = day.isToday;
            
            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day.dateString)}
                className={`
                  min-h-[140px] rounded-[1.5rem] p-2 transition-all cursor-pointer relative group flex flex-col gap-1.5
                  border-[3px]
                  ${!day.isCurrentMonth 
                    ? 'bg-white/30 border-transparent text-gray-300 hover:bg-white/50' 
                    : 'bg-white border-white hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 shadow-sm'
                  }
                  ${isToday ? 'ring-4 ring-blue-200 border-blue-400 bg-blue-50' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-1 px-1">
                  <span 
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-full text-lg font-black transition-transform group-hover:scale-110
                      ${isToday 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                        : 'text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700'}
                    `}
                  >
                    {day.date.getDate()}
                  </span>
                  
                  <div className={`
                    w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 
                    opacity-0 group-hover:opacity-100 transition-all transform scale-50 group-hover:scale-100 border-2 border-blue-200
                  `}>
                    <Plus size={16} strokeWidth={3} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 overflow-hidden w-full">
                  {dayTasks.map(task => {
                    const taskColor = task.color || PERSONAL_COLOR;
                    const bgStyle = { backgroundColor: hexToRgba(taskColor, 0.1) };
                    const textStyle = { color: taskColor };
                    const borderStyle = { borderColor: hexToRgba(taskColor, 0.3) };
                    
                    return (
                      <div
                        key={task.id}
                        onClick={(e) => handleCalendarTaskClick(e, task)}
                        style={!task.completed ? { ...bgStyle, ...borderStyle, ...textStyle } : undefined}
                        className={`
                          relative px-2 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 group/task transition-all border-2
                          ${task.completed 
                            ? 'bg-gray-50 text-gray-400 border-transparent line-through decoration-2 decoration-gray-300' 
                            : 'hover:opacity-80 hover:scale-[1.02]'}
                        `}
                      >
                        <button 
                          onClick={(e) => toggleTaskCompletion(e, task.id)}
                          className={`
                            shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center check-anim
                            ${task.completed 
                              ? 'bg-gray-300 border-gray-300 text-white' 
                              : 'bg-white border-current text-transparent'}
                          `}
                        >
                            {task.completed && <CheckCircle2 size={12} strokeWidth={4} />}
                        </button>
                        <span className="truncate flex-1">{task.title}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Monthly Note Section */}
      <div className="w-full max-w-6xl relative z-10 mb-12">
        <div className="relative bg-[#fffbeb] p-8 rounded-[2rem] shadow-xl shadow-yellow-100/50 border-4 border-white rotate-1 transform transition-transform hover:rotate-0 group">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-32 h-8 bg-yellow-200/50 rounded-sm transform rotate-1 shadow-sm"></div>
          
          <div className="flex items-center gap-3 mb-4 text-yellow-700">
              <div className="p-2 bg-yellow-300 rounded-xl text-white transform -rotate-6 shadow-md">
                <StickyNote size={24} strokeWidth={3} />
              </div>
              <div className="flex-1">
                 <h3 className="text-xl font-black tracking-tight">{currentDate.getFullYear()}年{currentDate.getMonth() + 1}月 · 备忘录 Memo</h3>
              </div>
              {isSyncing && <div className="text-xs font-bold text-blue-400 animate-pulse">Syncing...</div>}
          </div>
          
          <textarea
            value={monthlyNotes[currentMonthKey] || ''}
            onChange={handleNoteChange}
            placeholder="在此记录本月的重点目标、心情或任何琐事..."
            className="w-full h-40 bg-transparent border-none outline-none text-yellow-900/80 font-medium text-lg leading-relaxed resize-none placeholder-yellow-900/30"
            style={{ 
              backgroundImage: 'linear-gradient(transparent 31px, #fde68a 32px)',
              backgroundSize: '100% 32px',
              lineHeight: '32px'
            }}
          />
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerMode === 'list' ? '📅 任务列表' : (editingTask ? '📝 修改记录' : '✨ 写新任务')}
      >
        {drawerMode === 'list' ? (
          <div className="flex flex-col h-full relative">
              <div className="mb-6 flex items-center justify-between">
                 <div className="text-gray-500 font-bold text-lg flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                   {selectedDateKey}
                 </div>
                 
                 <button
                   onClick={toggleSelectionMode}
                   className={`
                     flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2
                     ${isSelectionMode 
                       ? 'bg-blue-100 text-blue-700 border-blue-200' 
                       : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}
                   `}
                 >
                   <Layers size={14} />
                   {isSelectionMode ? '取消多选' : '多选任务'}
                 </button>
              </div>
              
              <div className="flex-1 space-y-4">
                {selectedDateTasks.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-400 border-4 border-dotted border-gray-200 rounded-[2rem] bg-gray-50/50">
                     <p className="font-bold">今天超闲的！</p>
                  </div>
                ) : (
                  selectedDateTasks.map(task => {
                    const isSelected = selectedTaskIds.has(task.id);
                    const taskColor = task.color || PERSONAL_COLOR;
                    
                    return (
                    <div 
                     key={task.id}
                     onClick={() => isSelectionMode && toggleTaskSelection(task.id)}
                     className={`
                       p-4 border-2 rounded-3xl shadow-sm transition-all group flex gap-3 items-start relative overflow-hidden
                       ${isSelectionMode 
                         ? (isSelected 
                              ? 'bg-blue-50 border-blue-400 cursor-pointer scale-[1.02]' 
                              : 'bg-white border-gray-100 cursor-pointer opacity-80 hover:opacity-100')
                         : (task.completed 
                              ? 'bg-gray-50 border-gray-100 opacity-75' 
                              : 'bg-white border-blue-100 hover:border-blue-400 hover:shadow-lg')
                       }
                     `}
                     >
                      {!task.completed && !isSelectionMode && (
                        <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: taskColor }}></div>
                      )}
                      
                      {isSelectionMode && isSelected && (
                        <div className="absolute top-0 right-0 p-2 bg-blue-500 rounded-bl-2xl">
                          <Check size={14} className="text-white" strokeWidth={4} />
                        </div>
                      )}

                      {!isSelectionMode && (
                        <button
                           onClick={(e) => toggleTaskCompletion(e, task.id)}
                           className={`
                             mt-1 w-6 h-6 rounded-full border-[3px] flex items-center justify-center shrink-0 transition-all check-anim ml-2
                             ${task.completed 
                               ? 'bg-green-400 border-green-400 text-white shadow-sm' 
                               : 'bg-white border-gray-300 hover:border-blue-400 text-transparent'}
                           `}
                        >
                          <CheckCircle2 size={16} strokeWidth={4} />
                        </button>
                      )}

                      <div 
                        className="flex-1 cursor-pointer pl-1"
                        onClick={() => !isSelectionMode && handleEditTaskFromList(task)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h4 
                            className={`font-black text-lg transition-all ${task.completed && !isSelectionMode ? 'text-gray-400 line-through decoration-2 decoration-gray-300' : ''}`}
                            style={!task.completed && !isSelectionMode ? { color: taskColor } : {}}
                          >
                            {task.title}
                          </h4>
                        </div>
                        <p className={`
                          text-sm font-medium line-clamp-2
                          ${task.completed && !isSelectionMode ? 'text-gray-300' : 'text-gray-500'}
                        `}>
                          {task.description || '无详细内容...'}
                        </p>
                      </div>

                      {!isSelectionMode && (
                        <div className="flex flex-col gap-2 ml-1 items-center justify-center border-l pl-2 border-gray-100">
                           <button 
                              onClick={(e) => handleCopyTask(e, task)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                              title="复制这个任务"
                           >
                              <Copy size={18} />
                           </button>
                           <button 
                              onClick={(e) => handleQuickDelete(e, task.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              title="快速删除"
                           >
                              <Trash2 size={18} />
                           </button>
                        </div>
                      )}
                    </div>
                  )})
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 z-20">
                {isSelectionMode ? (
                  <div className="space-y-3 animate-[slideUp_0.3s_ease-out]">
                    {showBatchSuccess ? (
                      <div className="bg-green-100 text-green-700 p-4 rounded-2xl text-center font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 />
                        <span>成功复制到未来！</span>
                      </div>
                    ) : (
                      <>
                         <div className="flex items-center justify-between">
                           <span className="text-sm font-bold text-gray-500">已选 {selectedTaskIds.size} 项</span>
                           <div className="flex items-center gap-2">
                              <label className="text-sm font-bold text-blue-900">复制到未来</label>
                              <input 
                                type="number" 
                                min="1" 
                                max="12" 
                                value={copyMonthsCount}
                                onChange={(e) => setCopyMonthsCount(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 p-1 text-center font-bold border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-sm font-bold text-gray-500">个月</span>
                           </div>
                         </div>
                         <button 
                           onClick={handleBatchCopy}
                           disabled={selectedTaskIds.size === 0}
                           className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
                         >
                           <Copy size={20} strokeWidth={3} />
                           <span>开始复制</span>
                         </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {clipboardTask && (
                        <button 
                          onClick={handlePasteTask}
                          className="w-full py-3.5 bg-[#C7CEEA] text-slate-700 font-bold rounded-2xl hover:brightness-95 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mb-2 border-2 border-white"
                        >
                          <ClipboardPaste size={20} strokeWidth={2.5} />
                          <span>粘贴任务: {clipboardTask.title}</span>
                        </button>
                    )}

                    <button 
                      onClick={handleAddNewPersonalTask}
                      className="w-full py-3.5 bg-blue-900 text-white font-bold rounded-2xl hover:bg-black shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                      style={{ backgroundColor: PERSONAL_COLOR }}
                    >
                      <User size={20} strokeWidth={2.5} />
                      <span>AOE</span>
                    </button>
                    
                    <button 
                      onClick={handleAddNewWorkTask}
                      className="w-full py-3.5 bg-white text-slate-700 font-bold rounded-2xl hover:bg-gray-50 shadow-lg border-2 border-gray-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Briefcase size={20} className="text-orange-400" strokeWidth={2.5} />
                      <span>打工</span>
                    </button>
                  </div>
                )}
              </div>
          </div>
        ) : (
          <TaskForm
            initialDate={selectedDateKey}
            existingTask={editingTask}
            initialColor={initialTaskColor}
            onSave={saveTask}
            onDelete={deleteTask}
            onBack={handleBackToList}
          />
        )}
      </Drawer>

      <Modal
        isOpen={modalType === ModalType.REMINDER}
        onClose={() => setModalType(ModalType.NONE)}
        title="👿 今日任务通缉令"
      >
        <div className="space-y-5">
          <div className="flex items-center space-x-3 bg-blue-50 p-4 rounded-2xl border-2 border-blue-200 text-blue-900">
              <Crown className="shrink-0 text-blue-600 fill-blue-200" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-blue-400 uppercase tracking-wider">Mission Start</span>
                <span className="text-sm font-bold">{formatDateKey(new Date())} 还没做完的事</span>
              </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto task-scroll space-y-3 pr-2">
            {tasks
              .filter(t => t.date === formatDateKey(new Date()) && !t.completed)
              .map(task => (
                <div key={task.id} className="p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-300 transition-colors shadow-sm group">
                  <h4 className="font-bold text-gray-800 mb-2 flex items-center text-lg">
                    <Circle size={20} className="text-blue-300 mr-2" />
                    {task.title}
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">
                    {task.description || '无详细描述'}
                  </div>
                </div>
              ))}
          </div>

          <div className="pt-2">
            <button 
              onClick={() => setModalType(ModalType.NONE)}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={20} />
              本宫知道了
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Wizard Modal */}
      <Modal
        isOpen={modalType === ModalType.AI_WIZARD}
        onClose={() => setModalType(ModalType.NONE)}
        title="✨ AI 魔法助手"
      >
         <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex gap-3">
               <Bot className="text-purple-600 shrink-0" size={24} />
               <p className="text-sm text-purple-800 font-medium">
                 对我说句人话，我来帮你安排日程。<br/>
                 <span className="text-xs opacity-70">例如："下周三下午开会" 或 "本月底去迪士尼玩"</span>
               </p>
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="请吩咐..."
              className="w-full h-32 p-4 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-purple-300 focus:bg-white outline-none resize-none font-medium"
            />
            
            <button 
              onClick={handleSmartAdd}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAiLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  <span>施法中...</span>
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  <span>变变变！</span>
                </>
              )}
            </button>
         </div>
      </Modal>

      {/* Auth Modal */}
      <Modal
         isOpen={modalType === ModalType.AUTH}
         onClose={() => setModalType(ModalType.NONE)}
         title="☁️ 云端同步"
      >
         <SupabaseAuthModal 
            userEmail={userEmail}
            onLoginSuccess={() => {
              setModalType(ModalType.NONE);
            }}
            onLogout={() => {
              const supabase = getSupabase();
              if(supabase) supabase.auth.signOut();
            }}
         />
      </Modal>
      
      <div className="mt-8 mb-4 text-center relative z-10 flex flex-col items-center gap-4">
        <p className="text-blue-400 text-xs font-bold tracking-widest uppercase bg-white/60 inline-block px-4 py-1.5 rounded-full backdrop-blur-sm shadow-sm border border-white">
          ✨ Auto Saved with Magic ✨
        </p>

        <div className="flex gap-4">
          <button 
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-gray-600 hover:text-blue-600 hover:shadow-md transition-all active:scale-95"
          >
            <Download size={16} />
            备份数据
          </button>

          <button 
            onClick={handleImportClick}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-sm font-bold text-gray-600 hover:text-blue-600 hover:shadow-md transition-all active:scale-95"
          >
            <Upload size={16} />
            恢复数据
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>
    </div>
  );
};

export default App;
