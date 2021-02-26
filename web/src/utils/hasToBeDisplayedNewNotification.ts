import { isNull } from 'lodash';
import moment from 'moment';

export default (dateLimit: boolean, lastDisplayedTime: null | number): boolean => {
  return !dateLimit || isNull(lastDisplayedTime) || moment(lastDisplayedTime).diff(Date.now(), 'days') < 0;
};
