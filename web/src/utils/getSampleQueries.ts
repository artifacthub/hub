import { isArray } from 'lodash';

import getMetaTag from './getMetaTag';

export default (): any[] => {
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
