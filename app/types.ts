
export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT'
}

export enum PeriodType {
  FIRST_HALF = 'FIRST_HALF', // 1-15
  SECOND_HALF = 'SECOND_HALF' // 16-End
}

export interface TimeEntry {
  id?: string;
  date: string; // ISO string or specific format
  day: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  comments: string;
  hoursWorked: number;
}

export interface PeriodData {
  status: 'open' | 'locked';
  entries: TimeEntry[];
}

export interface User {
  id: string;
  name: string;
}

export interface TrackerState {
  [userId: string]: {
    [monthYear: string]: {
      [PeriodType.FIRST_HALF]: PeriodData;
      [PeriodType.SECOND_HALF]: PeriodData;
    }
  }
}
