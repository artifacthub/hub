import isUndefined from 'lodash/isUndefined';
import { Filters } from '../../../types';

export default (filters: Filters): string => {
  const p = new URLSearchParams();
  p.set('page', filters.pageNumber.toString());
  if (!isUndefined(filters.text)) {
    p.set('text', filters.text);
  }
  if (!isUndefined(filters.f)) {
    Object.keys(filters.f).forEach((filterId: string) => {
      return filters.f[filterId].forEach((id: string) => {
        p.append(filterId, id);
      });
    });
  }
  const result = p.toString();
  return result === '' ? '' : `?${result}`;
}
