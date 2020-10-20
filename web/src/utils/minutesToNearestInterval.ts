import moment from 'moment';

export default (duration: number): number => {
  const rounding = moment.duration(duration, 'minutes');
  const currentDate = moment();
  const nextInterval = moment(Math.ceil(+currentDate / +rounding) * +rounding);
  return Math.ceil(nextInterval.diff(currentDate, 'minutes', true));
};
