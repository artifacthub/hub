import { isUndefined } from 'lodash';
import moment from 'moment';

export default (duration: number, decrement?: number): number => {
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
