import isUndefined from 'lodash/isUndefined';
import { Filters } from '../types';

export default (data?: Filters): string => {
  let query = '';
  if (!isUndefined(data)) {
    Object.keys(data).forEach((filterId: string) => {
      return data[filterId].forEach((id: string) => {
        query += `&${filterId}=${id}`;
      });
    });
  }

  return query;
}
