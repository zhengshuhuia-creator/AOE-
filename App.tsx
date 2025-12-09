
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2,
  Circle,
  Sparkles,
  Plus,
  Pencil,
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
  StickyNote
} from 'lucide-react';
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
  saveMonthlyNotes
} from './utils';
import { Modal } from './components/Modal';
import { Drawer } from './components/Drawer';
import { TaskForm } from './components/TaskForm';

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
  const [initialTaskColor, setInitialTaskColor] = useState<string>(PERSONAL_COLOR); // Passed to form

  // Batch Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [copyMonthsCount, setCopyMonthsCount] = useState<number>(1);
  const [showBatchSuccess, setShowBatchSuccess] = useState(false);

  // --- Effects ---

  useEffect(() => {
    const loadedTasks = loadTasks();
    setTasks(loadedTasks);
    setMonthlyNotes(loadMonthlyNotes());
    
    // Check for today's reminders
    const todayStr = formatDateKey(new Date());
    const todaysTasks = loadedTasks.filter(t => t.date === todayStr && !t.completed);
    
    if (todaysTasks.length > 0) {
      setModalType(ModalType.REMINDER);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Reset selection mode when drawer closes or date changes
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

  // Quick Toggle Logic
  const toggleTaskCompletion = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation(); // Prevent opening the drawer
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
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

  // Batch Selection Logic
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
        newTasks.push({
          id: crypto.randomUUID(),
          date: nextDate,
          title: task.title,
          description: task.description,
          completed: false, 
          color: task.color, // Preserve color
        });
      }
    });

    setTasks(prev => [...prev, ...newTasks]);
    
    setShowBatchSuccess(true);
    setTimeout(() => {
      setShowBatchSuccess(false);
      setIsSelectionMode(false);
      setSelectedTaskIds(new Set());
    }, 1500);
  };

  const saveTask = (task: Task) => {
    setTasks(prev => {
      if (prev.some(t => t.id === task.id)) {
        return prev.map(t => t.id === task.id ? task : t);
      }
      return [...prev, task];
    });
    
    if (task.date === selectedDateKey) {
        setDrawerMode('list');
    }
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setDrawerMode('list');
  };

  // Note Handlers
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = { ...monthlyNotes, [currentMonthKey]: e.target.value };
    setMonthlyNotes(newNotes);
    saveMonthlyNotes(newNotes);
  };

  // --- Sorting Logic ---
  const getSortedTasksForDate = (dateStr: string) => {
    return tasks
      .filter(t => t.date === dateStr)
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return 0; 
      });
  };

  const selectedDateTasks = useMemo(() => getSortedTasksForDate(selectedDateKey), [tasks, selectedDateKey]);

  // --- Render ---
  return (
    <div className="min-h-screen pb-12 pt-6 px-4 sm:px-8 flex flex-col items-center relative overflow-hidden text-slate-800">
      
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
              日历小本本 <Heart size={20} className="text-pink-500 fill-pink-500 animate-bounce" />
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

        <button 
          onClick={goToToday}
          className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all border-4 border-gray-200 hover:border-blue-200 shadow-lg active:scale-95 flex items-center gap-2"
        >
          <Sparkles size={16} className="text-yellow-300" />
          回到今天
        </button>
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
            const dayTasks = getSortedTasksForDate(day.dateString);
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
                {/* Date Number */}
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

                {/* Tasks List */}
                <div className="flex flex-col gap-1.5 overflow-hidden w-full">
                  {dayTasks.map(task => {
                    // Determine styles based on task color
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
                        {/* Checkbox Button */}
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
          {/* Note Decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-32 h-8 bg-yellow-200/50 rounded-sm transform rotate-1 shadow-sm"></div>
          
          <div className="flex items-center gap-3 mb-4 text-yellow-700">
             <div className="p-2 bg-yellow-300 rounded-xl text-white transform -rotate-6 shadow-md">
               <StickyNote size={24} strokeWidth={3} />
             </div>
             <h3 className="text-xl font-black tracking-tight">{currentDate.getFullYear()}年{currentDate.getMonth() + 1}月 · 备忘录 Memo</h3>
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

      {/* --- Side Drawer --- */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerMode === 'list' ? '📅 任务列表' : (editingTask ? '📝 修改记录' : '✨ 写新任务')}
      >
        {drawerMode === 'list' ? (
          <div className="flex flex-col h-full relative">
             {/* List Header */}
             <div className="mb-6 flex items-center justify-between">
                <div className="text-gray-500 font-bold text-lg flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  {selectedDateKey}
                </div>
                
                {/* Batch Selection Toggle */}
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
             
             {/* List */}
             <div className="flex-1 space-y-4 pb-48">
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
                     {/* Color Tag */}
                     {!task.completed && !isSelectionMode && (
                       <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: taskColor }}></div>
                     )}
                     
                     {/* Selection Indicator Overlay */}
                     {isSelectionMode && isSelected && (
                       <div className="absolute top-0 right-0 p-2 bg-blue-500 rounded-bl-2xl">
                         <Check size={14} className="text-white" strokeWidth={4} />
                       </div>
                     )}

                     {/* Checkbox */}
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
                         {!isSelectionMode && (
                           <div className="opacity-0 group-hover:opacity-100 p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-blue-500 hover:text-white transition-all">
                              <Pencil size={14} />
                           </div>
                         )}
                       </div>
                       <p className={`
                         text-sm font-medium line-clamp-2
                         ${task.completed && !isSelectionMode ? 'text-gray-300' : 'text-gray-500'}
                       `}>
                         {task.description || '无详细内容...'}
                       </p>
                     </div>
                   </div>
                 )})
               )}
             </div>

             {/* Bottom Action Area */}
             <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md p-6 border-t border-gray-100 z-20">
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
                   {/* Personal Button */}
                   <button 
                     onClick={handleAddNewPersonalTask}
                     className="w-full py-3.5 bg-blue-900 text-white font-bold rounded-2xl hover:bg-black shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                     style={{ backgroundColor: PERSONAL_COLOR }}
                   >
                     <User size={20} strokeWidth={2.5} />
                     <span>AOE</span>
                   </button>
                   
                   {/* Work Button */}
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
             
             <style>{`
               @keyframes slideUp {
                 from { transform: translateY(100%); opacity: 0; }
                 to { transform: translateY(0); opacity: 1; }
               }
             `}</style>
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

      {/* Reminder Modal */}
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
      
      {/* Footer */}
      <div className="mt-8 text-center relative z-10 pb-4">
        <p className="text-blue-400 text-xs font-bold tracking-widest uppercase bg-white/60 inline-block px-4 py-1.5 rounded-full backdrop-blur-sm shadow-sm border border-white">
          ✨ Auto Saved with Magic ✨
        </p>
      </div>
    </div>
  );
};

export default App;
