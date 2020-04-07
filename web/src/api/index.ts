import camelCase from 'lodash/camelCase';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

import {
  ChartRepository,
  CheckAvailabilityProps,
  Organization,
  Package,
  PackagesUpdatesList,
  Profile,
  SearchQuery,
  SearchResults,
  Stats,
  User,
  UserLogin,
} from '../types';
import getHubBaseURL from '../utils/getHubBaseURL';
import history from '../utils/history';
import renameKeysInObject from '../utils/renameKeysInObject';

interface PackageRequest {
  repoName: string;
  packageName: string;
  version?: string;
  packageKind?: string;
}

interface Result {
  [key: string]: any;
}

interface FetchOptions {
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD';
  headers?: {
    [key: string]: string;
  };
  body?: any;
}

const toCamelCase = (r: any): Result => {
  if (isArray(r)) {
    return r.map((v) => toCamelCase(v));
  } else if (isObject(r)) {
    return Object.keys(r).reduce(
      (result, key) => ({
        ...result,
        [camelCase(key)]: toCamelCase((r as Result)[key]),
      }),
      {}
    );
  }
  return r;
};

const handleUnauthorizedRequests = async (res: any) => {
  if (res.status === 401 && !res.url.includes('/user/alias')) {
    history.push(`/login?redirect=${history.location.pathname}`);
    return Promise.reject({
      status: res.status,
      statusText: 'ErrLoginRedirect',
    });
  }
  return res;
};

const handleErrors = async (res: any) => {
  if (!res.ok) {
    let text = await res.text();
    return Promise.reject({
      status: res.status,
      statusText: text || res.statusText,
    });
  }
  return res;
};

const handleContent = async (res: any) => {
  switch (res.headers.get('Content-Type')) {
    case 'text/plain; charset=utf-8':
      const text = await res.text();
      return text;
    case 'application/json':
      const json = await res.json();
      return toCamelCase(json);
  }
};

const apiFetch = (url: string, opts?: FetchOptions): any => {
  const options = opts || {};
  return fetch(url, options)
    .then(handleUnauthorizedRequests)
    .then(handleErrors)
    .then(handleContent)
    .catch((error) => Promise.reject(error));
};

const getChartRepositoryUrlContext = (fromOrgName?: string): string => {
  let context = '/user';
  if (!isUndefined(fromOrgName)) {
    context = `/org/${fromOrgName}`;
  }
  return context;
};

const API_BASE_URL = `${getHubBaseURL()}/api/v1`;

export const API = {
  getPackage: (request: PackageRequest): Promise<Package> => {
    let url = `${API_BASE_URL}/package`;
    if (!isUndefined(request.packageKind)) {
      url += `/${request.packageKind}`;
    }
    if (!isUndefined(request.repoName)) {
      url += `/chart/${request.repoName}`;
    }
    url += `/${request.packageName}`;
    if (!isUndefined(request.version)) {
      url += `/${request.version}`;
    }
    return apiFetch(url);
  },

  toggleStar: (packageId: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/package/${packageId}`, {
      method: 'PUT',
    });
  },

  searchPackages: (query: SearchQuery): Promise<SearchResults> => {
    const q = new URLSearchParams();
    q.set('facets', 'true');
    q.set('limit', query.limit.toString());
    q.set('offset', query.offset.toString());
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
    return apiFetch(`${API_BASE_URL}/packages/search?${q.toString()}`);
  },

  getStats: (): Promise<Stats> => {
    return apiFetch(`${API_BASE_URL}/packages/stats`);
  },

  getPackagesUpdates: (): Promise<PackagesUpdatesList> => {
    return apiFetch(`${API_BASE_URL}/packages/updates`);
  },

  register: (user: User): Promise<null | string> => {
    const newUser = renameKeysInObject(user, { firstName: 'first_name', lastName: 'last_name' });
    return apiFetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    });
  },

  verifyEmail: (code: string): Promise<null> => {
    return apiFetch(`${API_BASE_URL}/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `code=${code}`,
    });
  },

  login: (user: UserLogin): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `email=${user.email}&password=${user.password}`,
    });
  },

  logout: (): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/logout`);
  },

  getUserProfile: (): Promise<Profile> => {
    return apiFetch(`${API_BASE_URL}/user`);
  },

  getChartRepositories: (fromOrgName?: string): Promise<ChartRepository[]> => {
    return apiFetch(`${API_BASE_URL}${getChartRepositoryUrlContext(fromOrgName)}/chart-repositories`);
  },

  addChartRepository: (chartRepository: ChartRepository, fromOrgName?: string): Promise<null | string> => {
    const chartRepo = renameKeysInObject(chartRepository, { displayName: 'display_name' });
    return apiFetch(`${API_BASE_URL}${getChartRepositoryUrlContext(fromOrgName)}/chart-repositories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chartRepo),
    });
  },

  deleteChartRepository: (chartRepositoryName: string, fromOrgName?: string): Promise<null | string> => {
    return apiFetch(
      `${API_BASE_URL}${getChartRepositoryUrlContext(fromOrgName)}/chart-repository/${chartRepositoryName}`,
      {
        method: 'DELETE',
      }
    );
  },

  updateChartRepository: (chartRepository: ChartRepository, fromOrgName?: string): Promise<null | string> => {
    const chartRepo = renameKeysInObject(chartRepository, { displayName: 'display_name' });
    return apiFetch(
      `${API_BASE_URL}${getChartRepositoryUrlContext(fromOrgName)}/chart-repository/${chartRepository.name}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chartRepo),
      }
    );
  },

  checkAvailability: (props: CheckAvailabilityProps): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/check-availability/${props.resourceKind}?v=${props.value}`, {
      method: 'HEAD',
    });
  },

  getUserOrganizations: (): Promise<Organization[]> => {
    return apiFetch(`${API_BASE_URL}/user/orgs`);
  },

  getOrganization: (organizationName: string): Promise<Organization> => {
    return apiFetch(`${API_BASE_URL}/org/${organizationName}`);
  },

  addOrganization: (organization: Organization): Promise<null | string> => {
    const org = renameKeysInObject(organization, {
      displayName: 'display_name',
      logoUrl: 'logo_url',
      homeUrl: 'home_url',
    });
    return apiFetch(`${API_BASE_URL}/orgs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(org),
    });
  },

  updateOrganization: (organization: Organization): Promise<null | string> => {
    const org = renameKeysInObject(organization, {
      displayName: 'display_name',
      logoUrl: 'logo_url',
      homeUrl: 'home_url',
    });
    return apiFetch(`${API_BASE_URL}/org/${org.name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(org),
    });
  },

  getOrganizationMembers: (organizationName: string): Promise<User[]> => {
    return apiFetch(`${API_BASE_URL}/org/${organizationName}/members`);
  },

  addOrganizationMember: (organizationName: string, alias: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/org/${organizationName}/member/${alias}`, {
      method: 'POST',
    });
  },

  deleteOrganizationMember: (organizationName: string, alias: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/org/${organizationName}/member/${alias}`, {
      method: 'DELETE',
    });
  },

  confirmOrganizationMembership: (organizationName: string): Promise<null> => {
    return apiFetch(`${API_BASE_URL}/org/${organizationName}/accept-invitation`);
  },

  getStarredByUser: (): Promise<Package[]> => {
    return apiFetch(`${API_BASE_URL}/packages/starred`);
  },
};
