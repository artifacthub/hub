import { isUndefined } from 'lodash';

export default (str: string): string => {
  if (isUndefined(str)) return '';
  const trimmedStr = str.trim();
  const firstLetter = trimmedStr[0] || trimmedStr.charAt(0);
  return firstLetter ? `${firstLetter.toUpperCase()}${trimmedStr.substring(1)}` : '';
};
