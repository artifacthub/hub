import isUndefined from 'lodash/isUndefined';
import moment from 'moment';

const calculateDiffInYears = (pastDate: number, currentDate?: number): number => {
  const initialDate: moment.Moment = !isUndefined(currentDate) ? moment.unix(currentDate) : moment(new Date());
  return initialDate.diff(moment.unix(pastDate), 'years', true);
};

export default calculateDiffInYears;
