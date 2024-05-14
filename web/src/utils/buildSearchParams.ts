import isNull from 'lodash/isNull';

import { SearchFiltersURL } from '../types';

const WHITELISTED_FILTER_KEYS = [
  'org', // Organization as publisher
  'user', // User as publisher
  'capabilities', // Capability level: Basic Install, Seamless Upgrades, Full Lifecycle, Deep Insights, Auto Pilot
  'kind', // Repository kind
  'category', // Package category
  'repo', // Repository name
  'license', // Package license
];

interface F {
  [key: string]: string[];
}

const buildSearchParams = (query: string): SearchFiltersURL => {
  const p = new URLSearchParams(query);
  const filters: F = {};

  p.forEach((value, key) => {
    if (WHITELISTED_FILTER_KEYS.includes(key)) {
      const values = filters[key] || [];
      values.push(value);
      filters[key] = values;
    }
  });

  return {
    tsQueryWeb: p.has('ts_query_web') ? p.get('ts_query_web')! : undefined,
    filters: { ...filters },
    pageNumber: p.has('page') && !isNull(p.get('page')) ? parseInt(p.get('page')!) : 1,
    deprecated: p.has('deprecated') ? p.get('deprecated') === 'true' : false,
    operators: p.has('operators') ? p.get('operators') === 'true' : undefined,
    verifiedPublisher: p.has('verified_publisher') ? p.get('verified_publisher') === 'true' : undefined,
    cncf: p.has('cncf') ? p.get('cncf') === 'true' : undefined,
    official: p.has('official') ? p.get('official') === 'true' : undefined,
    sort: p.has('sort') ? p.get('sort') : undefined,
  };
};

export default buildSearchParams;
