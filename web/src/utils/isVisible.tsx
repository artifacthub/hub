export default (el: HTMLDivElement): boolean => {
  console.log(el);
  const rect = el.getBoundingClientRect();
  const vWidth = window.innerWidth || document.documentElement.clientWidth;
  const vHeight = window.innerHeight || document.documentElement.clientHeight;
  const efp = (x: number, y: number) => {
    return document.elementFromPoint(x, y);
  };

  // Return false if it's not in the viewport
  if (rect.right < 0 || rect.bottom < 0 || rect.left > vWidth || rect.top > vHeight) {
    return false;
  }

  // Return true if any of its four corners are visible
  return (
    el.contains(efp(rect.left, rect.top)) ||
    el.contains(efp(rect.right, rect.top)) ||
    el.contains(efp(rect.right, rect.bottom)) ||
    el.contains(efp(rect.left, rect.bottom))
  );
};
