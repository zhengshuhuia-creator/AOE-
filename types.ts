
export interface Task {
  id: string;
  date: string; // Format: YYYY-MM-DD
  title: string;
  description: string;
  completed: boolean;
  color?: string; // New field for task color
  user_id?: string; // For Supabase RLS
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateString: string;
}

export enum ModalType {
  NONE,
  ADD_EDIT,
  REMINDER,
  AI_WIZARD, // AI 助手弹窗
  AUTH // 登录/设置弹窗
}