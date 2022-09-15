const trimPrefix = (prefix: string, str: string): string => {
  return str.replace(new RegExp(`^${prefix}`, 'g'), '');
};

export default trimPrefix;
