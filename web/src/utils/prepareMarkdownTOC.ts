import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { extractReadmeTOC } from './extractReadmeTOC';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const strip = require('remark-strip-html');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const unlink = require('remark-unlink');
const processor = unified().use(remarkParse).use(strip).use(unlink).use(extractReadmeTOC);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prepareMarkdownTOC = (md: string): any => {
  const node = processor.parse(md);
  const tree = processor.runSync(node);
  return tree;
};

export default prepareMarkdownTOC;
