export type Persona = 'student' | 'professional' | 'freelancer';

export type Priority = 'high' | 'medium' | 'low';

export type CalendarView = 'day' | 'week' | 'month';

export interface TimeRange {
  id: string;
  date: string; // ISO date string
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number;
  endMinute: number;
}

export interface UniverseEvent {
  id: string;
  title: string;
  description?: string;
  memo?: string;
  priority: Priority;
  color: string; // CSS gradient class or hex
  timeRanges: TimeRange[];
  dimensionFields?: Record<string, string>;
  isFromInbox?: boolean;
  completed?: boolean;
  isAllDay?: boolean;
  isRoutine?: boolean;
}

export interface InboxTask {
  id: string;
  title: string;
  estimatedMinutes?: number;
  priority: Priority;
  analyzing: boolean;
  scheduled: boolean;
}

export interface RoutineBlock {
  id: string;
  type: 'sleep' | 'work' | 'meal' | 'exercise';
  label: string;
  startHour: number;
  endHour: number;
}

export interface UserProfile {
  persona: Persona;
  routines: RoutineBlock[];
  onboardingComplete: boolean;
}
