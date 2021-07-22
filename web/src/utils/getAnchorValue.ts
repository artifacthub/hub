import removeEmojis from './removeEmojis';

export default (str: string): string => {
  return removeEmojis(
    str
      .trim()
      .toLowerCase()
      .replace(/#/g, '')
      .replace(/[`$&+,:;=?@|'.<>^*()\\/%!®[\]： ]/g, ' ')
      .trim()
      .replace(/^[0-9-]/g, 'X')
      .replace(/\s+/g, '-')
      .replace(/-+$/, '')
  );
};
