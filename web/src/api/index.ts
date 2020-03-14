import isUndefined from 'lodash/isUndefined';
import camelCase from 'lodash/camelCase';
import isObject from 'lodash/isObject';
import isArray from 'lodash/isArray';
import { Package, Stats, SearchQuery, PackagesUpdatesList, SearchResults, User, UserLogin, Alias } from '../types';
import getHubBaseURL from '../utils/getHubBaseURL';
import history from '../utils/history';

interface Result {
  [key: string]: any;
}

interface FetchOptions {
  method: 'POST' | 'GET';
  headers?: {
    [key: string]: string;
  };
  body?: any;
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

const handleUnauthorizedRequests = async (res: any) => {
  if (res.status === 401 && history.location.pathname.startsWith('/admin')) {
    history.push(`/login?redirect=${history.location.pathname}`);
    return Promise.reject({
      status: res.status,
      statusText: 'ErrLoginRedirect',
    });
  }
  return res;
}

const handleErrors = async (res: any) => {
  if (!res.ok) {
    let text = await res.text();
    return Promise.reject({
      status: res.status,
      statusText: text || res.statusText,
    });
  }
  return res;
}

const handleContent = async (res: any) => {
  switch (res.headers.get('Content-Type')) {
    case 'text/plain; charset=utf-8':
      const text = await res.text();
      return text;
    case 'application/json':
      const json = await res.json();
      return toCamelCase(json);
  }
}

const apiFetch = (url: string, opts?: FetchOptions): any => {
  const options = opts || {};
  return fetch(url, options)
    .then(handleUnauthorizedRequests)
    .then(handleErrors)
    .then(handleContent)
    .catch((error) => Promise.reject(error));
}

const API_BASE_URL = `${getHubBaseURL()}/api/v1`;

export const API = {
  getPackage: (repoName: string, packageName: string, version?: string): Promise<Package> => {
    let url = `${API_BASE_URL}/package/chart/${repoName}/${packageName}`;
    if (!isUndefined(version)) {
      url += `/${version}`;
    }
    return apiFetch(url);
  },

  searchPackages: (query: SearchQuery): Promise<SearchResults> => {
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
    if (query.deprecated) {
      q.set('deprecated', 'true');
    }
    return apiFetch(`${API_BASE_URL}/package/search?${q.toString()}`);
  },

  getStats: (): Promise<Stats> => {
    return apiFetch(`${API_BASE_URL}/package/stats`);
  },

  getPackagesUpdates: (): Promise<PackagesUpdatesList> => {
    return apiFetch(`${API_BASE_URL}/package/updates`);
  },

  register: (user: User): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });
  },

  verifyEmail: (code: string): Promise<null> => {
    return apiFetch(`${API_BASE_URL}/user/verifyEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `code=${code}`,
    });
  },

  login: (user: UserLogin): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `email=${user.email}&password=${user.password}`,
    });
  },

  logout: (): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/user/logout`);
  },

  getUserAlias: (): Promise<Alias> => {
    return apiFetch(`${API_BASE_URL}/user/alias`);
  },
};
