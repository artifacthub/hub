import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';

import { BasicQuery, SearchFiltersURL, SearchQuery, SortOption } from '../types';

export const getURLSearchParams = (query: BasicQuery): URLSearchParams => {
  const q = new URLSearchParams();
  if (!isUndefined(query.filters) && !isEmpty(query.filters)) {
    Object.keys(query.filters).forEach((filterId: string) => {
      return query.filters![filterId].forEach((id: string) => {
        q.append(filterId, id);
      });
    });
  }
  if (!isUndefined(query.tsQueryWeb)) {
    q.set('ts_query_web', query.tsQueryWeb);
  }
  if (!isUndefined(query.name)) {
    q.set('name', query.name);
  }
  if (!isUndefined(query.deprecated) && query.deprecated) {
    q.set('deprecated', 'true');
  }
  if (!isUndefined(query.operators) && query.operators) {
    q.set('operators', 'true');
  }
  if (!isUndefined(query.verifiedPublisher) && query.verifiedPublisher) {
    q.set('verified_publisher', 'true');
  }
  if (!isUndefined(query.official) && query.official) {
    q.set('official', 'true');
  }
  if (!isUndefined(query.cncf) && query.cncf) {
    q.set('cncf', 'true');
  }
  return q;
};

export const prepareAPIQueryString = (query: SearchQuery): string => {
  const q = getURLSearchParams(query);
  q.set('limit', query.limit.toString());
  q.set('offset', query.offset.toString());
  return `?${q.toString()}`;
};

export const prepareQueryString = (query: SearchFiltersURL): string => {
  const q = getURLSearchParams(query);
  q.set('sort', query.sort || SortOption.Relevance);
  q.set('page', query.pageNumber.toString());
  return `?${q.toString()}`;
};
