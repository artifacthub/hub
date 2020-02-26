import isNull from 'lodash/isNull';
import { SearchFiltersURL } from '../types';

const SPECIAL_KEYS = ['text', 'page'];

interface F {
  [key: string]: string[];
}

export default (query: string): SearchFiltersURL => {
  const p = new URLSearchParams(query);
  let filters: F = {};

  p.forEach((value, key) => {
    if (!SPECIAL_KEYS.includes(key)) {
      const values = filters[key] || [];
      values.push(value);
      filters[key] = values;
    }
  });

  return {
    text: p.has('text') ? p.get('text')! : undefined,
    filters: { ...filters },
    pageNumber: p.has('page') && !isNull(p.get('page')) ? parseInt(p.get('page')!) : 1,
  };
}
