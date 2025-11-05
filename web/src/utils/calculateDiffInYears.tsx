import { differenceInMilliseconds, fromUnixTime } from 'date-fns';
import isUndefined from 'lodash/isUndefined';

const calculateDiffInYears = (pastDate: number, currentDate?: number): number => {
  const referenceDate = !isUndefined(currentDate) ? fromUnixTime(currentDate) : new Date();
  const elapsedInMs = differenceInMilliseconds(referenceDate, fromUnixTime(pastDate));
  return elapsedInMs / (1000 * 60 * 60 * 24 * 365.25);
};

export default calculateDiffInYears;
