import { isEmpty, isUndefined } from 'lodash';

import { BasicQuery, SearchFiltersURL, SearchQuery, TsQuery } from '../types';
import { TS_QUERY } from './data';

const getURLSearchParams = (query: BasicQuery): URLSearchParams => {
  const q = new URLSearchParams();

  if (!isUndefined(query.facets)) {
    q.set('facets', query.facets ? 'true' : 'false');
  }
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
  if (!isUndefined(query.tsQuery)) {
    let values: string[] = [];
    query.tsQuery.forEach((value: string) => {
      if (value !== '') {
        const activeTsQuery = TS_QUERY.find((ts: TsQuery) => ts.label === value);
        if (!isUndefined(activeTsQuery)) {
          values.push(activeTsQuery.value);
        }
      }
    });
    if (values.length > 0) {
      q.set('ts_query', values.join(' | '));
    }
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
  q.set('page', query.pageNumber.toString());
  return `?${q.toString()}`;
};
