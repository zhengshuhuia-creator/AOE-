
import { Task, CalendarDay } from './types';

// --- Date Helpers ---

// Helper to format date as YYYY-MM-DD
export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getMonthKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// Helper to add months to a date string YYYY-MM-DD
export const addMonthsToDate = (dateStr: string, monthsToAdd: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1 + monthsToAdd, d);
  if (targetDate.getDate() !== d) {
    targetDate.setDate(0); 
  }
  return formatDateKey(targetDate);
};

// Generate the 6-week grid for the calendar view
export const generateCalendarGrid = (currentDate: Date): CalendarDay[] => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startDayOfWeek = firstDayOfMonth.getDay(); 
  
  const days: CalendarDay[] = [];
  const todayKey = formatDateKey(new Date());

  // Previous month days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i); 
    days.push({
      date: d,
      isCurrentMonth: false,
      isToday: formatDateKey(d) === todayKey,
      dateString: formatDateKey(d),
    });
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d,
      isCurrentMonth: true,
      isToday: formatDateKey(d) === todayKey,
      dateString: formatDateKey(d),
    });
  }

  // Next month days
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      date: d,
      isCurrentMonth: false,
      isToday: formatDateKey(d) === todayKey,
      dateString: formatDateKey(d),
    });
  }

  return days;
};

// --- Color Helpers ---

export const PERSONAL_COLOR = '#1f3693'; // 宝蓝色 (Fixed)

// Updated to Lighter / Pastel / Macaron colors
export const FRESH_PALETTE = [
  '#FF9AA2', // Soft Salmon
  '#FFB7B2', // Soft Pink
  '#FFDAC1', // Soft Peach
  '#E2F0CB', // Soft Lime
  '#B5EAD7', // Soft Mint
  '#C7CEEA', // Soft Periwinkle
  '#A0E7E5', // Tiffany Blue ish
  '#FBE7C6', // Warm Beige
  '#B4F8C8', // Light Green
  '#FFAEBC', // Light Rose
];

export const getRandomFreshColor = () => {
  return FRESH_PALETTE[Math.floor(Math.random() * FRESH_PALETTE.length)];
};

export const hexToRgba = (hex: string, alpha: number) => {
  let c: any;
  if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
      c = hex.substring(1).split('');
      if(c.length === 3){
          c= [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
  }
  return hex; // Fallback
}

// --- Local Storage Wrappers ---

export const STORAGE_KEY = 'work_calendar_tasks';
export const NOTES_STORAGE_KEY = 'work_calendar_monthly_notes';

export const loadTasks = (): Task[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load tasks", e);
    return [];
  }
};

export const saveTasks = (tasks: Task[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error("Failed to save tasks", e);
  }
};

export const loadMonthlyNotes = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Failed to load notes", e);
    return {};
  }
};

export const saveMonthlyNotes = (notes: Record<string, string>) => {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error("Failed to save notes", e);
  }
};
