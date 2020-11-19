const MAX_LENGTH: number = 10;

export default (str: string, length: number = MAX_LENGTH): string => {
  if (str.length <= length) {
    return str;
  } else {
    return `${str.substring(0, length)}...`;
  }
};
