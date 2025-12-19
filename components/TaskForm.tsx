
import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { Trash2, Save, Calendar as CalendarIcon, Copy, ArrowLeft, AlertCircle } from 'lucide-react';
import { formatDateKey, PERSONAL_COLOR } from '../utils';

interface TaskFormProps {
  initialDate: string;
  existingTask?: Task | null;
  initialColor?: string;
  allTasks: Task[]; // Need all tasks to check for duplicates
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ 
  initialDate, 
  existingTask, 
  initialColor,
  allTasks,
  onSave, 
  onDelete,
  onBack
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PERSONAL_COLOR);
  const [copyFeedback, setCopyFeedback] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description);
      setColor(existingTask.color || PERSONAL_COLOR);
    } else {
      setTitle('');
      setDescription('');
      if (initialColor) {
        setColor(initialColor);
      }
    }
    setCopyFeedback(null);
    setErrorMessage('');
  }, [existingTask, initialColor]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    // Check for duplicates on the SAME date
    const isDuplicate = allTasks.some(t => 
      t.date === initialDate && 
      t.title.toLowerCase() === cleanTitle.toLowerCase() && 
      t.id !== existingTask?.id
    );

    if (isDuplicate) {
      setErrorMessage('该日期已存在同名任务，请勿重复创建');
      triggerShake();
      return;
    }

    const newTask: Task = {
      id: existingTask ? existingTask.id : crypto.randomUUID(),
      date: initialDate,
      title: cleanTitle,
      description: description.trim(),
      completed: existingTask ? existingTask.completed : false,
      color: color,
    };

    onSave(newTask);
  };

  const handleCopyToNextMonth = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    
    const current = new Date(initialDate);
    const targetDate = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
    if (targetDate.getDate() !== current.getDate()) targetDate.setDate(0); 
    const nextMonthStr = formatDateKey(targetDate);

    // Check for duplicates on the TARGET date
    const isDuplicate = allTasks.some(t => 
      t.date === nextMonthStr && 
      t.title.toLowerCase() === cleanTitle.toLowerCase()
    );

    if (isDuplicate) {
      setErrorMessage(`下月 ${nextMonthStr} 已有同名任务`);
      setCopyFeedback('error');
      triggerShake();
      setTimeout(() => setCopyFeedback(null), 3000);
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      date: nextMonthStr,
      title: cleanTitle,
      description: description.trim(),
      completed: false,
      color: color,
    };

    onSave(newTask);
    setCopyFeedback('success');
    setErrorMessage('');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
         <button 
           type="button" 
           onClick={onBack}
           className="flex items-center text-gray-500 hover:text-blue-600 font-bold transition-colors text-sm px-3 py-1.5 rounded-xl hover:bg-blue-50"
         >
           <ArrowLeft size={16} className="mr-1" /> 返回列表
         </button>
         <div className="flex items-center space-x-2 text-sm text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-full">
            <CalendarIcon size={16} />
            <span>{initialDate}</span>
         </div>
      </div>

      <div className={`space-y-2 ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
        <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">任务标题</label>
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={(e) => {
                setTitle(e.target.value);
                if(errorMessage) setErrorMessage('');
            }}
            placeholder="例如：买生日蛋糕 🎂"
            className={`w-full pl-5 pr-12 py-4 bg-gray-50 border-2 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-lg ${errorMessage ? 'border-red-400 text-red-700' : 'border-gray-100 focus:border-blue-400 text-gray-800'}`}
            autoFocus
          />
          <div 
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white shadow-sm" 
            style={{ backgroundColor: color }}
          />
        </div>
        {errorMessage && (
            <p className="text-red-500 text-xs font-bold flex items-center gap-1 mt-1 ml-1 animate-fadeIn">
                <AlertCircle size={12} /> {errorMessage}
            </p>
        )}
      </div>

      <div className="space-y-2 flex-1">
        <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">详细内容</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="写下具体的执行步骤..."
          className="w-full h-full min-h-[120px] px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all resize-none font-medium text-gray-700 placeholder-gray-400 leading-relaxed"
        />
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-100">
        {title.trim() && (
          <button
            type="button"
            onClick={handleCopyToNextMonth}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl transition-all font-bold border-2 
              ${copyFeedback === 'success' ? 'bg-green-50 border-green-200 text-green-600' : 
                copyFeedback === 'error' ? 'bg-red-50 border-red-200 text-red-600' :
                'bg-white border-blue-100 text-blue-500 hover:bg-blue-50 hover:border-blue-200'}
            `}
          >
            {copyFeedback === 'success' ? <span>✅ 已复制到下个月</span> : 
             copyFeedback === 'error' ? <span>❌ 下月已存在同名任务</span> :
             <><Copy size={18} /><span>复制该任务到下个月</span></>}
          </button>
        )}

        <div className="flex items-center justify-between gap-3">
          {existingTask ? (
            <button
              type="button"
              onClick={() => { if(window.confirm('确定要删除这个任务吗？')) onDelete(existingTask.id); }}
              className="px-4 py-3 text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 rounded-2xl transition-colors font-bold text-sm"
            >
              <Trash2 size={20} />
            </button>
          ) : <div />}

          <div className="flex space-x-3 flex-1 justify-end">
              <button type="button" onClick={onBack} className="px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors font-bold">取消</button>
              <button
                  type="submit"
                  className="flex items-center justify-center space-x-2 px-8 py-3 text-white rounded-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 font-bold flex-1 sm:flex-none"
                  style={{ backgroundColor: color, boxShadow: `0 10px 15px -3px ${color}40` }}
              >
                  <Save size={20} />
                  <span>保存</span>
              </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </form>
  );
};
