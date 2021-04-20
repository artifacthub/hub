import { isUndefined } from 'lodash';
import camelCase from 'lodash/camelCase';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

import { PackageSummary, SearchResults } from '../types';

const SEARCH_LIMIT = 50;

class API {
  private API_BASE_URL = `/api/v1`;
  private TS_QUERY = [
    {
      label: 'database',
      value: '(database)',
    },
    {
      label: 'integration-and-delivery',
      value: '(integration | delivery)',
    },
    {
      label: 'logging-and-tracing',
      value: '(logging | tracing)',
    },
    {
      label: 'machine-learning',
      value: '(machine <-> learning)',
    },
    {
      label: 'monitoring',
      value: '(monitoring)',
    },
    {
      label: 'networking',
      value: '(networking)',
    },
    {
      label: 'security',
      value: '(security)',
    },
    {
      label: 'storage',
      value: '(storage | (big <-> data))',
    },
    {
      label: 'streaming-messaging',
      value: '(streaming | messaging)',
    },
    {
      label: 'web-applications',
      value: '(web <-> application)',
    },
  ];

  private toCamelCase(r: any): any {
    if (isArray(r)) {
      return r.map((v) => this.toCamelCase(v));
    } else if (isObject(r)) {
      return Object.keys(r).reduce(
        (result, key) => ({
          ...result,
          [camelCase(key)]: this.toCamelCase((r as any)[key]),
        }),
        {}
      );
    }
    return r;
  }

  private async handleContent(res: any) {
    if (!res.ok) {
      throw new Error('error');
    } else {
      switch (res.headers.get('Content-Type')) {
        case 'text/plain; charset=utf-8':
          const text = await res.text();
          return text;
        case 'application/json':
          const json = await res.json();
          return this.toCamelCase(json);
        default:
          return res;
      }
    }
  }

  private async apiFetch(url: string) {
    return fetch(url)
      .then((res) => this.handleContent(res))
      .catch((error) => Promise.reject(error));
  }

  public getPackageInfo(baseUrl: string, pathname: string): Promise<PackageSummary> {
    return this.apiFetch(`${baseUrl}${this.API_BASE_URL}${pathname}/summary`);
  }

  public searchPackages(baseUrl: string, query: string): Promise<SearchResults> {
    const q = new URLSearchParams(query);
    q.set('facets', 'false');
    q.set('limit', SEARCH_LIMIT.toString());
    q.set('offset', '0');
    const tsQuery = q.get('ts_query');
    if (tsQuery) {
      const formattedTsQuery = tsQuery.split(' | ');
      let values: string[] = [];
      formattedTsQuery.forEach((value: string) => {
        if (value !== '') {
          const activeTsQuery = this.TS_QUERY.find((ts) => ts.label === value);
          if (!isUndefined(activeTsQuery)) {
            values.push(activeTsQuery.value);
          }
        }
      });
      q.set('ts_query', values.join(' | '));
    }
    q.delete('page');
    return this.apiFetch(`${baseUrl}${this.API_BASE_URL}/packages/search?${q.toString()}`);
  }
}

const APIMethods = new API();
export default APIMethods;
