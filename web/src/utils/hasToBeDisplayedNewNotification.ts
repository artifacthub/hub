import { differenceInCalendarDays } from 'date-fns';
import isNull from 'lodash/isNull';

const hasToBeDisplayedNewNotification = (dateLimit: boolean, lastDisplayedTime: null | number): boolean => {
  const now = new Date(Date.now());
  return (
    dateLimit !== true || isNull(lastDisplayedTime) || differenceInCalendarDays(new Date(lastDisplayedTime), now) < 0
  );
};

export default hasToBeDisplayedNewNotification;
