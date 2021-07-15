import removeEmojis from './removeEmojis';

const HTML_REGEX = new RegExp('</?[^>]*>', 'gi');

export default (title: string): string => {
  // Remove backticks and asteriks
  return title !== '' ? removeEmojis(title.replace(/`/g, '').replace(/\*\*\[\]/g, '')).replace(HTML_REGEX, '') : title;
};
