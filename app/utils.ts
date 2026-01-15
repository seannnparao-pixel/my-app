
import { DAYS_OF_WEEK, MONTHS } from './constants';
import { TimeEntry, PeriodType } from './types';

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const generateDefaultEntries = (year: number, month: number, period: PeriodType): TimeEntry[] => {
  const entries: TimeEntry[] = [];
  const startDay = period === PeriodType.FIRST_HALF ? 1 : 16;
  const endDay = period === PeriodType.FIRST_HALF ? 15 : getDaysInMonth(year, month);

  for (let d = startDay; d <= endDay; d++) {
    const dateObj = new Date(year, month, d);
    const dayName = DAYS_OF_WEEK[dateObj.getDay()];
    const formattedDate = `${MONTHS[month]} ${d}, ${year}`;

    entries.push({
      date: formattedDate,
      day: dayName,
      startTime: '',
      endTime: '',
      comments: '',
      hoursWorked: 0
    });
  }
  return entries;
};

export const calculateHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let diff = (endH + endM / 60) - (startH + startM / 60);
  
  // Handle cross-midnight if needed, though usually tracker shifts are same-day
  if (diff < 0) diff += 24; 
  
  return parseFloat(diff.toFixed(2));
};

export const formatTotalHours = (hours: number): string => {
  return hours.toFixed(2);
};
