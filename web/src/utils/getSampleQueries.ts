import { isArray } from 'lodash';

import getMetaTag from './getMetaTag';

export default (): any[] => {
  const sampleQueries = getMetaTag('sampleQueries');
  if (sampleQueries) {
    const queries = JSON.parse(sampleQueries);
    if (isArray(queries)) {
      return queries;
    }
  }
  return [];
};
