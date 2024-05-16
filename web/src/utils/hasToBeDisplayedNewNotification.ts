import isNull from 'lodash/isNull';
import moment from 'moment';

const hasToBeDisplayedNewNotification = (dateLimit: boolean, lastDisplayedTime: null | number): boolean => {
  return dateLimit !== true || isNull(lastDisplayedTime) || moment(lastDisplayedTime).diff(moment(), 'days') < 0;
};

export default hasToBeDisplayedNewNotification;
