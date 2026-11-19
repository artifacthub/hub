import isUndefined from 'lodash/isUndefined';

// Returns how long to wait before retrying, given the seconds provided in the
// Retry-After header of a 429 response (undefined when it was not available)
const getRetryAfterText = (seconds?: number): string => {
  if (isUndefined(seconds)) return 'a little while';
  if (seconds <= 5) return 'a moment';
  if (seconds <= 60) return 'a minute';
  if (seconds < 5400) {
    const minutes = Math.ceil(seconds / 60);
    return minutes === 60 ? 'an hour' : `${minutes} minutes`;
  }
  return `${Math.ceil(seconds / 3600)} hours`;
};

export default getRetryAfterText;
