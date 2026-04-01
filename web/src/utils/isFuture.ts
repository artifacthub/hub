import { fromUnixTime, isAfter } from 'date-fns';

const isFuture = (date: number | null | undefined, timestampFormat: boolean = true): boolean => {
  if (date === null || date === undefined) {
    return false;
  }
  const targetDate = timestampFormat ? fromUnixTime(date) : new Date(date);
  if (Number.isNaN(targetDate.getTime())) {
    return false;
  }
  return isAfter(targetDate, new Date());
};

export default isFuture;
