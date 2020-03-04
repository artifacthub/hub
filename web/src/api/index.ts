import isUndefined from 'lodash/isUndefined';
import camelCase from 'lodash/camelCase';
import isObject from 'lodash/isObject';
import isArray from 'lodash/isArray';
import { Package, Stats, SearchQuery, PackagesUpdatesList, SearchResults } from '../types';
import getHubBaseURL from '../utils/getHubBaseURL';

interface Result {
  [key: string]: any;
}

const toCamelCase = (r: any): Result => {
  if (isArray(r)) {
    return r.map(v => toCamelCase(v));
  } else if (isObject(r)) {
    return Object.keys(r).reduce(
      (result, key) => ({
        ...result,
        [camelCase(key)]: toCamelCase((r as Result)[key]),
      }),
      {},
    );
  }
  return r;
};

class Fetcher {
  cancellableRequests: AbortController[];

  constructor() {
    this.cancellableRequests = [];
  }

  public do(url: string, cancellable: boolean): any {
    if (cancellable) {
      return this.fetchCancellablePromise(url);
    } else {
      return this.fetchPromise(fetch(url));
    }
  }

  public cancelRequests() {
    if (this.cancellableRequests.length > 0) {
      this.cancellableRequests.forEach(r => r.abort());
      this.cancellableRequests = [];
    }
  }

  private fetchCancellablePromise(url: string): any {
    const controller = new AbortController();
    const signal = controller.signal;
    const response = this.fetchPromise(fetch(url, { signal }));
    this.cancellableRequests.push(controller);
    return response;
  }

  private fetchPromise(promise: Promise<Response>): any {
    return promise
    .then(res => (res.ok ? res : Promise.reject(res)))
    .then(res => res.json())
    .then(res => toCamelCase(res));
  }
}

const fetcher = new Fetcher();
const API_BASE_URL = `${getHubBaseURL()}/api/v1`;

export const API = {
  getPackage: (repoName: string, packageName: string, version?: string): Promise<Package> => {
    let url = `${API_BASE_URL}/package/chart/${repoName}/${packageName}`;
    if (!isUndefined(version)) {
      url += `/${version}`;
    }
    fetcher.cancelRequests();
    return fetcher.do(url, true);
  },

  searchPackages: (query: SearchQuery, cancellable: boolean): Promise<SearchResults> => {
    const q = new URLSearchParams();
    q.set('facets', 'true');
    q.set('limit', (query.limit).toString());
    q.set('offset', (query.offset).toString());
    if (!isUndefined(query.filters)) {
      Object.keys(query.filters).forEach((filterId: string) => {
        return query.filters[filterId].forEach((id: string) => {
          q.append(filterId, id);
        });
      });
    }
    if (!isUndefined(query.text)) {
      q.set('text', query.text);
    }
    if (cancellable) {
      fetcher.cancelRequests();
    }
    return fetcher.do(`${API_BASE_URL}/search?${q.toString()}`, cancellable);
  },

  getStats: (): Promise<Stats> => {
    return fetcher.do(`${API_BASE_URL}/stats`, true);
  },

  getPackagesUpdates: (): Promise<PackagesUpdatesList> => {
    fetcher.cancelRequests();
    return fetcher.do(`${API_BASE_URL}/updates`, true);
  },
};
