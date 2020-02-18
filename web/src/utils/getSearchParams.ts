import { SearchParams, Filters } from '../types';
import isNull from 'lodash/isNull';

const SPECIAL_KEYS = ['text', 'page'];

export default (query: string): SearchParams => {
  const defaultValues = {
    text: undefined,
    filters: {},
    pageNumber: 1,
  };

  if (window.URLSearchParams) {
    const params = new URLSearchParams(query);
    let filters: Filters = {};

    params.forEach((value, key) => {
      if (!SPECIAL_KEYS.includes(key)) {
        const values = filters[key] || [];
        values.push(value);
        filters[key] = values;
      }
    });

    return {
      text: params.has('text') ? params.get('text')! : undefined,
      filters: { ...filters },
      pageNumber: params.has('page') && !isNull(params.get('page')) ? parseInt(params.get('page')!) : 1,
    };
  } else {
    // TODO
    return defaultValues;
  }
}
