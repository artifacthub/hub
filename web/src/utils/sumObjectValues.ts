import identity from 'lodash/identity';
import isEmpty from 'lodash/isEmpty';
import pickBy from 'lodash/pickBy';

const sumObjectValues = (data: { [key: string]: number | undefined }): number => {
  const cleanData = pickBy(data, identity);
  if (isEmpty(cleanData)) return 0;
  return Object.values(cleanData).reduce((a, b) => a! + b!) || 0;
};

export default sumObjectValues;
