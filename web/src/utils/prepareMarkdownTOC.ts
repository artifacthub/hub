import { isNull } from 'lodash';
import regexifyString from 'regexify-string';

import { TOCEntryItem } from '../types';
import getAnchorValue from './getAnchorValue';
import removeEmojis from './removeEmojis';

/* eslint-disable no-control-regex */
export const HEADING_REGEX = new RegExp('\n(#+) (.*)', 'g');
const CODE_REGEX = new RegExp('^```(?:[^`]+|`(?!``))*```', 'igm');
const SETEXT_HEADER = new RegExp('^(.*)$\n[=-]{3,}\n', 'igm');
const TABLE_REGEX = new RegExp('^(|[^\n]+)', 'gm');
const HTML_REGEX = new RegExp('</?[^>]*>', 'gi');
/* eslint-enable no-control-regex */

const cleanTitle = (title: string): string => {
  // Remove backticks
  return removeEmojis(title.replace(/`/g, ''));
};

const convertSetextHeadersToAtx = (md: string): string => {
  const result = regexifyString({
    pattern: SETEXT_HEADER,
    decorator: (match: string) => {
      const content = match.split('\n');
      if (content[0] !== '') {
        return `${content[1].includes('=') ? '# ' : '## '}${content[0]}`;
      }
      return '';
    },
    input: md,
  });
  return result.join('\n');
};

export default (md: string): TOCEntryItem[] => {
  let cleanMD = md;
  try {
    cleanMD = convertSetextHeadersToAtx(md.replace(CODE_REGEX, '').replace(TABLE_REGEX, '').replace(HTML_REGEX, ''));
  } catch {
    // Only if error to clean markdown
  }
  let titles: TOCEntryItem[] = [];
  let entries: TOCEntryItem[] = [];
  let processed: TOCEntryItem[] = [];

  const findParent = (entries: TOCEntryItem[], child: TOCEntryItem): TOCEntryItem | null => {
    const reversedEntries = entries.slice().reverse();
    for (let i = 0; i < reversedEntries.length; i++) {
      if (reversedEntries[i].level < child.level) {
        return reversedEntries[i];
      }
    }
    return null;
  };

  let match = HEADING_REGEX.exec(cleanMD);

  while (!isNull(match)) {
    if (!match[2].startsWith('[')) {
      titles.push({
        level: match[1].length,
        title: cleanTitle(match[2]),
        link: getAnchorValue(match[2]),
      });
    }
    match = HEADING_REGEX.exec(cleanMD);
  }

  for (let i = 0; i < titles.length; i++) {
    const parent = findParent(processed, titles[i]);
    if (!isNull(parent)) {
      parent.children = parent.children ? [...parent.children, titles[i]] : [titles[i]];
    } else {
      entries = [...entries, titles[i]];
    }
    processed = [...processed, titles[i]];
  }

  return entries;
};
