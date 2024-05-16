import isUndefined from 'lodash/isUndefined';

const capitalizeFirstLetter = (str: string): string => {
  if (isUndefined(str)) return '';
  const trimmedStr = str.trim();
  const firstLetter = trimmedStr[0] || trimmedStr.charAt(0);
  return firstLetter ? `${firstLetter.toUpperCase()}${trimmedStr.substring(1)}` : '';
};

export default capitalizeFirstLetter;
