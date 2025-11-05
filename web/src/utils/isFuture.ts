import { fromUnixTime, isAfter } from 'date-fns';

const isFuture = (date: number, timestampFormat: boolean = true): boolean => {
  const targetDate = timestampFormat ? fromUnixTime(date) : new Date(date);
  return isAfter(targetDate, new Date());
};

export default isFuture;
