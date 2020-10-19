import moment from 'moment';

export default (duration: number): number => {
  const rounding = moment.duration(duration, 'minutes');
  const currentDate = moment();
  const nextInterval = moment(Math.ceil(+currentDate / +rounding) * +rounding);
  console.log(currentDate, nextInterval, currentDate.diff(nextInterval, 'minutes'));
  return nextInterval.diff(currentDate, 'minutes');
};
