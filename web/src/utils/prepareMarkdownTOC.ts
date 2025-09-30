import remarkParse from 'remark-parse';
import remarkStripHtml from 'remark-strip-html';
import remarkUnlink from 'remark-unlink';
import { unified } from 'unified';

import { extractReadmeTOC } from './extractReadmeTOC';

const processor = unified()
  .use(remarkParse)
  .use(remarkStripHtml as never)
  .use(remarkUnlink as never);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prepareMarkdownTOC = (md: string): any => {
  const node = processor.parse(md);
  const tree = processor.runSync(node);
  const transform = extractReadmeTOC();
  return transform(tree);
};

export default prepareMarkdownTOC;
