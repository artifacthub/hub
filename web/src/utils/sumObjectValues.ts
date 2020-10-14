import { identity, isEmpty, pickBy } from 'lodash';

export default (data: { [key: string]: number | undefined }): number => {
  const cleanData = pickBy(data, identity);
  if (isEmpty(cleanData)) return 0;
  return Object.values(cleanData).reduce((a, b) => a! + b!) || 0;
};
