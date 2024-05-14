import isUndefined from 'lodash/isUndefined';
import moment from 'moment';

const minutesToNearestInterval = (duration: number, decrement?: number): number => {
  const rounding = moment.duration(duration, 'minutes');
  const currentDate = moment();
  const nextInterval = moment(Math.ceil(+currentDate / +rounding) * +rounding);
  const result = Math.ceil(nextInterval.diff(currentDate, 'minutes', true));
  if (!isUndefined(decrement)) {
    if (result < decrement) {
      return result + decrement;
    } else {
      return result - decrement;
    }
  } else {
    return result;
  }
};

export default minutesToNearestInterval;
