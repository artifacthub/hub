import moment from 'moment';

export default (date: number, timestampFormat: boolean = true): boolean => {
  if (!timestampFormat) {
    return moment(date).isAfter();
  } else {
    return moment.unix(date).isAfter();
  }
};
