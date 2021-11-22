import removeEmojis from './removeEmojis';

const getAnchorValue = (str: string): string => {
  return removeEmojis(
    str
      .trim()
      .toLowerCase()
      .replace(/#/g, '')
      .replace(/[`$&+,:;=?@|'".<>^*()\\/%!®[\]： ]/g, ' ')
      .trim()
      .replace(/^[0-9-]/g, 'X')
      .replace(/\s+/g, '-')
      .replace(/-+$/, '')
  );
};

export default getAnchorValue;
