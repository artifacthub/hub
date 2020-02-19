import isUndefined from 'lodash/isUndefined';
import { Filters } from '../types';

export default (data?: Filters): string => {
  const query = new URLSearchParams();
  if (!isUndefined(data)) {
    Object.keys(data).forEach((filterId: string) => {
      return data[filterId].forEach((id: string) => {
        query.append(filterId, id);
      });
    });
  }
  const queryString = query.toString();
  return queryString === '' ? '' : `&${queryString}`;
}
