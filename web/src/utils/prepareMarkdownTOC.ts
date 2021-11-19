import { TOCEntryItem } from '../types';
import { extractReadmeTOC } from './extractReadmeTOC';

const unified = require('unified');
const strip = require('remark-strip-html');
const markdown = require('remark-parse');
const unlink = require('remark-unlink');
const processor = unified().use(markdown).use(strip).use(unlink).use(extractReadmeTOC);

const prepareMarkdownTOC = (md: string): TOCEntryItem[] => {
  const node = processor.parse(md);
  const tree = processor.runSync(node);
  return tree;
};

export default prepareMarkdownTOC;
