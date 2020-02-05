import { SearchQuery, Filters } from '../types';

export default (query: string): SearchQuery => {
  const defaultValues = {
    text: undefined,
    filters: {},
  };

  if (window.URLSearchParams) {
    const params = new URLSearchParams(query);
    let filters: Filters = {};

    params.forEach((value, key) => {
      if (key !== 'text') {
        const values = filters[key] || [];
        values.push(value);
        filters[key] = values;
      }
    });

    return {
      text: params.has('text') ? params.get('text')! : undefined,
      filters: { ...filters },
    };
  } else {
    // TODO
    return defaultValues;
  }
}
