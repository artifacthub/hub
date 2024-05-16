import isArray from 'lodash/isArray';

import getMetaTag from './getMetaTag';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSampleQueries = (): any[] => {
  const sampleQueries = getMetaTag('sampleQueries');
  if (sampleQueries) {
    try {
      const queries = JSON.parse(sampleQueries);
      if (isArray(queries)) {
        return queries;
      }
    } catch {
      return [];
    }
  }
  return [];
};

export default getSampleQueries;
