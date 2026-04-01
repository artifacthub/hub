declare module 'remark-strip-html' {
  import type { Plugin } from 'unified';
  const stripHtml: Plugin<[]>;
  export default stripHtml;
}

declare module 'remark-unlink' {
  import type { Plugin } from 'unified';
  const unlink: Plugin<[]>;
  export default unlink;
}
