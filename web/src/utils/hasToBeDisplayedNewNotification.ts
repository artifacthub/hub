import isNull from 'lodash/isNull';
import { differenceInCalendarDays } from 'date-fns';

const hasToBeDisplayedNewNotification = (dateLimit: boolean, lastDisplayedTime: null | number): boolean => {
  return (
    dateLimit !== true ||
    isNull(lastDisplayedTime) ||
    differenceInCalendarDays(new Date(lastDisplayedTime), new Date()) < 0
  );
};

export default hasToBeDisplayedNewNotification;
