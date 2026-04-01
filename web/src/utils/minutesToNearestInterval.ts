import isUndefined from 'lodash/isUndefined';

const minutesToNearestInterval = (duration: number, decrement?: number): number => {
  const roundingInMs = duration * 60 * 1000;
  const currentDateInMs = Date.now();
  const nextIntervalInMs = Math.ceil(currentDateInMs / roundingInMs) * roundingInMs;
  const result = Math.ceil((nextIntervalInMs - currentDateInMs) / (60 * 1000));
  if (!isUndefined(decrement)) {
    if (result < decrement) {
      return result + decrement;
    } else {
      return result - decrement;
    }
  } else {
    return result;
  }
};

export default minutesToNearestInterval;
