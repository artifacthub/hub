import { Error } from '../types';

export default (error: Error, defaultMessage: string): string => {
  let message: string = defaultMessage;
  if (error.message) {
    message += `: ${error.message}`;
  } else {
    message += ', please try again later.';
  }

  return message || '';
};
