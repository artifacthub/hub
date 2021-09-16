import removeEmojis from './removeEmojis';

export default (title: string): string => {
  // Remove backticks and emojis
  return title !== '' ? removeEmojis(title.replace(/`/g, '')) : title;
};
