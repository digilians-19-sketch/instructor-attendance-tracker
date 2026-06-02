export interface Instructor {
  id: number;
  name: string;
  active?: number;
  created_at?: string;
}

export interface AttendanceRecord {
  id: number;
  name: string;
  date: string;
  time: string;
  type: 'حضور' | 'انصراف' | string;
  created_at?: string;
}
