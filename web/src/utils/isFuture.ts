import moment from 'moment';

const isFuture = (date: number, timestampFormat: boolean = true): boolean => {
  if (!timestampFormat) {
    return moment(date).isAfter();
  } else {
    return moment.unix(date).isAfter();
  }
};

export default isFuture;
