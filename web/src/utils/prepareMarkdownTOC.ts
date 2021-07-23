import { TOCEntryItem } from '../types';

const unified = require('unified');
const strip = require('remark-strip-html');
const markdown = require('remark-parse');
const unlink = require('remark-unlink');
const utf8 = require('remark-utf8');
const extractToc = require('remark-extract-toc');
const processor = unified().use(markdown).use(strip).use(unlink).use(utf8).use(extractToc);

export default (md: string): TOCEntryItem[] => {
  // Remove bold
  const cleanMD = md.replace(/\*\*/g, '');
  const node = processor.parse(cleanMD);
  const tree = processor.runSync(node);
  return tree;
};
