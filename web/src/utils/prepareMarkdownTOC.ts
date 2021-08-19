import { TOCEntryItem } from '../types';
import { extractReadmeTOC } from './extractReadmeTOC';

const unified = require('unified');
const strip = require('remark-strip-html');
const markdown = require('remark-parse');
const unlink = require('remark-unlink');
const utf8 = require('remark-utf8');
const processor = unified().use(markdown).use(strip).use(unlink).use(utf8).use(extractReadmeTOC);

export default (md: string): TOCEntryItem[] => {
  // Remove bold
  const cleanMD = md.replace(/\*\*/g, '');
  const node = processor.parse(cleanMD);
  const tree = processor.runSync(node);
  return tree;
};
