import { TOCEntryItem } from '../types';

const unified = require('unified');
const markdown = require('remark-parse');
const unlink = require('remark-unlink');
const utf8 = require('remark-utf8');
const extractToc = require('remark-extract-toc');
const processor = unified().use(markdown).use(unlink).use(utf8).use(extractToc);

export default (md: string): TOCEntryItem[] => {
  const node = processor.parse(md);
  const tree = processor.runSync(node);
  return tree;
};
