export default (currentPage: number, pageCount: number): (string | number)[] => {
  const delta = 1;

  let range = [];
  for (let i = Math.max(2, currentPage - delta); i <= Math.min(pageCount - 1, currentPage + delta); i++) {
    range.push(i);
  }

  if (currentPage - delta > 2) {
    range.unshift('...');
  }
  if (currentPage + delta < pageCount - 1) {
    range.push('...');
  }

  range.unshift(1);
  range.push(pageCount);

  return range;
}
