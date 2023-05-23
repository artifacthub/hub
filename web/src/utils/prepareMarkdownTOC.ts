import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { extractReadmeTOC } from './extractReadmeTOC';

const strip = require('remark-strip-html');
const unlink = require('remark-unlink');
const processor = unified().use(remarkParse).use(strip).use(unlink).use(extractReadmeTOC);

const prepareMarkdownTOC = (md: string): any => {
  const node = processor.parse(md);
  const tree = processor.runSync(node);
  return tree;
};

export default prepareMarkdownTOC;
