import { Filters } from '../../../types';
import isNull from 'lodash/isNull';

const SPECIAL_KEYS = ['text', 'page'];

interface F {
  [key: string]: string[];
}

export default (query: string): Filters => {
  const p = new URLSearchParams(query);
  let f: F = {};

  p.forEach((value, key) => {
    if (!SPECIAL_KEYS.includes(key)) {
      const values = f[key] || [];
      values.push(value);
      f[key] = values;
    }
  });

  return {
    text: p.has('text') ? p.get('text')! : undefined,
    f: { ...f },
    pageNumber: p.has('page') && !isNull(p.get('page')) ? parseInt(p.get('page')!) : 1,
  };
}
