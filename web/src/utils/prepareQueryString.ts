import isUndefined from 'lodash/isUndefined';

import { SearchFiltersURL } from '../types';

export default (query: SearchFiltersURL): string => {
  const p = new URLSearchParams();
  p.set('page', query.pageNumber.toString());
  if (!isUndefined(query.tsQueryWeb)) {
    p.set('ts_query_web', query.tsQueryWeb);
  }
  if (query.deprecated) {
    p.set('deprecated', 'true');
  }
  Object.keys(query.filters).forEach((filterId: string) => {
    return query.filters[filterId].forEach((id: string) => {
      p.append(filterId, id);
    });
  });
  const result = p.toString();
  return `?${result}`;
};
