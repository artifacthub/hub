import isUndefined from 'lodash/isUndefined';
import { SearchFiltersURL } from '../types';

export default (query: SearchFiltersURL): string => {
  const p = new URLSearchParams();
  p.set('page', query.pageNumber.toString());
  if (!isUndefined(query.text)) {
    p.set('text', query.text);
  }
  if (query.deprecated) {
    p.set('deprecated', 'true');
  }
  if (!isUndefined(query.filters)) {
    Object.keys(query.filters).forEach((filterId: string) => {
      return query.filters[filterId].forEach((id: string) => {
        p.append(filterId, id);
      });
    });
  }
  const result = p.toString();
  return result === '' ? '' : `?${result}`;
}
