const findClosestNumberIndex = (arr: number[], num: number) => {
  const closest: number = arr.reduce((a, b) => {
    return Math.abs(b - num) < Math.abs(a - num) ? b : a;
  });
  return arr.findIndex((el) => el === closest);
};

export default findClosestNumberIndex;
