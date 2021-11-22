import removeEmojis from './removeEmojis';

const cleanTOCEntry = (title: string): string => {
  // Remove backticks and emojis
  return title !== '' ? removeEmojis(title.replace(/`/g, '')) : title;
};

export default cleanTOCEntry;
