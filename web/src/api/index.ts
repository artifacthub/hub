import camelCase from 'lodash/camelCase';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

import {
  APIKey,
  APIKeyCode,
  ChartRepository,
  CheckAvailabilityProps,
  EventKind,
  LogoImage,
  Organization,
  Package,
  PackageStars,
  Profile,
  SearchQuery,
  SearchResults,
  Stats,
  Subscription,
  TestWebhook,
  User,
  UserFullName,
  UserLogin,
  Webhook,
} from '../types';
import getHubBaseURL from '../utils/getHubBaseURL';
import renameKeysInObject from '../utils/renameKeysInObject';

interface PackageRequest {
  repoName: string;
  packageName: string;
  version?: string;
  packageKind?: string;
}

interface TransferChartRepositoryRequest {
  chartRepositoryName: string;
  toOrgName?: string;
  fromOrgName?: string;
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

export const toCamelCase = (r: any): Result => {
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

export const handleUnauthorizedRequests = async (res: any) => {
  if (res.status === 401) {
    return Promise.reject({
      status: res.status,
      statusText: 'ErrLoginRedirect',
    });
  }
  return res;
};

const handleErrors = async (res: any) => {
  if (!res.ok) {
    try {
      let text = await res.json();
      return Promise.reject({
        status: res.status,
        statusText: text.message !== '' ? text.message : res.statusText,
      });
    } catch {
      return Promise.reject({
        status: res.status,
        statusText: res.statusText,
      });
    }
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

export const apiFetch = (url: string, opts?: FetchOptions): any => {
  const options = opts || {};
  return fetch(url, options)
    .then(handleUnauthorizedRequests)
    .then(handleErrors)
    .then(handleContent)
    .catch((error) => Promise.reject(error));
};

export const getUrlContext = (fromOrgName?: string): string => {
  let context = '/user';
  if (!isUndefined(fromOrgName)) {
    context = `/org/${fromOrgName}`;
  }
  return context;
};

const API_BASE_URL = `${getHubBaseURL()}/api/v1`;

export const API = {
  getPackage: (request: PackageRequest): Promise<Package> => {
    let url = `${API_BASE_URL}/packages`;
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
    return apiFetch(`${API_BASE_URL}/packages/${packageId}/stars`, {
      method: 'PUT',
    });
  },

  getStars: (packageId: string): Promise<PackageStars> => {
    return apiFetch(`${API_BASE_URL}/packages/${packageId}/stars`);
  },

  searchPackages: (query: SearchQuery, facets: boolean = true): Promise<SearchResults> => {
    const q = new URLSearchParams();
    q.set('facets', facets ? 'true' : 'false');
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

  getRandomPackages: (): Promise<Package[]> => {
    return apiFetch(`${API_BASE_URL}/packages/random`);
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
    return apiFetch(`${API_BASE_URL}/users/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
      }),
    });
  },

  login: (user: UserLogin): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
      }),
    });
  },

  logout: (): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/users/logout`);
  },

  getUserProfile: (): Promise<Profile> => {
    return apiFetch(`${API_BASE_URL}/users/profile`);
  },

  getChartRepositories: (fromOrgName?: string): Promise<ChartRepository[]> => {
    return apiFetch(`${API_BASE_URL}/chart-repositories${getUrlContext(fromOrgName)}`);
  },

  addChartRepository: (chartRepository: ChartRepository, fromOrgName?: string): Promise<null | string> => {
    const chartRepo = renameKeysInObject(chartRepository, { displayName: 'display_name' });
    return apiFetch(`${API_BASE_URL}/chart-repositories${getUrlContext(fromOrgName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chartRepo),
    });
  },

  deleteChartRepository: (chartRepositoryName: string, fromOrgName?: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/chart-repositories${getUrlContext(fromOrgName)}/${chartRepositoryName}`, {
      method: 'DELETE',
    });
  },

  updateChartRepository: (chartRepository: ChartRepository, fromOrgName?: string): Promise<null | string> => {
    const chartRepo = renameKeysInObject(chartRepository, { displayName: 'display_name' });
    return apiFetch(`${API_BASE_URL}/chart-repositories${getUrlContext(fromOrgName)}/${chartRepository.name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chartRepo),
    });
  },

  transferChartRepository: (params: TransferChartRepositoryRequest): Promise<null | string> => {
    return apiFetch(
      `${API_BASE_URL}/chart-repositories${getUrlContext(params.fromOrgName)}/${params.chartRepositoryName}/transfer${
        isUndefined(params.toOrgName) ? '' : `?org=${params.toOrgName}`
      }`,
      {
        method: 'PUT',
      }
    );
  },

  checkAvailability: (props: CheckAvailabilityProps): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/check-availability/${props.resourceKind}?v=${encodeURIComponent(props.value)}`, {
      method: 'HEAD',
    });
  },

  getUserOrganizations: (): Promise<Organization[]> => {
    return apiFetch(`${API_BASE_URL}/orgs/user`);
  },

  getOrganization: (organizationName: string): Promise<Organization> => {
    return apiFetch(`${API_BASE_URL}/orgs/${organizationName}`);
  },

  addOrganization: (organization: Organization): Promise<null | string> => {
    const org = renameKeysInObject(organization, {
      displayName: 'display_name',
      logoImageId: 'logo_image_id',
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
      logoImageId: 'logo_image_id',
      homeUrl: 'home_url',
    });
    return apiFetch(`${API_BASE_URL}/orgs/${org.name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(org),
    });
  },

  getOrganizationMembers: (organizationName: string): Promise<User[]> => {
    return apiFetch(`${API_BASE_URL}/orgs/${organizationName}/members`);
  },

  addOrganizationMember: (organizationName: string, alias: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/orgs/${organizationName}/member/${encodeURI(alias)}`, {
      method: 'POST',
    });
  },

  deleteOrganizationMember: (organizationName: string, alias: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/orgs/${organizationName}/member/${encodeURI(alias)}`, {
      method: 'DELETE',
    });
  },

  confirmOrganizationMembership: (organizationName: string): Promise<null> => {
    return apiFetch(`${API_BASE_URL}/orgs/${organizationName}/accept-invitation`);
  },

  getStarredByUser: (): Promise<Package[]> => {
    return apiFetch(`${API_BASE_URL}/packages/starred`);
  },

  updateUserProfile: (profile: UserFullName): Promise<null | string> => {
    const updatedProfile = renameKeysInObject(profile, {
      firstName: 'first_name',
      lastName: 'last_name',
      profileImageId: 'profile_image_id',
    });
    return apiFetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedProfile),
    });
  },

  updatePassword: (oldPassword: string, newPassword: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/users/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        old: oldPassword,
        new: newPassword,
      }),
    });
  },

  saveImage: (data: string | ArrayBuffer): Promise<LogoImage> => {
    return apiFetch(`${API_BASE_URL}/images`, {
      method: 'POST',
      body: data,
    });
  },

  getPackageSubscriptions: (packageId: string): Promise<Subscription[]> => {
    return apiFetch(`${API_BASE_URL}/subscriptions/${packageId}`);
  },

  addSubscription: (packageId: string, eventKind: EventKind): Promise<string | null> => {
    return apiFetch(`${API_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: packageId,
        event_kind: eventKind,
      }),
    });
  },

  deleteSubscription: (packageId: string, eventKind: EventKind): Promise<string | null> => {
    return apiFetch(`${API_BASE_URL}/subscriptions?package_id=${packageId}&event_kind=${eventKind}`, {
      method: 'DELETE',
    });
  },

  getUserSubscriptions: (): Promise<Package[]> => {
    return apiFetch(`${API_BASE_URL}/subscriptions`);
  },

  getWebhooks: (fromOrgName?: string): Promise<Webhook[]> => {
    return apiFetch(`${API_BASE_URL}/webhooks${getUrlContext(fromOrgName)}`);
  },

  getWebhook: (webhookId: string, fromOrgName?: string): Promise<Webhook> => {
    return apiFetch(`${API_BASE_URL}/webhooks${getUrlContext(fromOrgName)}/${webhookId}`);
  },

  addWebhook: (webhook: Webhook, fromOrgName?: string): Promise<null | string> => {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });
    const formattedPackages = webhook.packages.map((packageItem: Package) => ({
      package_id: packageItem.packageId,
    }));
    return apiFetch(`${API_BASE_URL}/webhooks${getUrlContext(fromOrgName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formattedWebhook,
        packages: formattedPackages,
      }),
    });
  },

  deleteWebhook: (webhookId: string, fromOrgName?: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/webhooks${getUrlContext(fromOrgName)}/${webhookId}`, {
      method: 'DELETE',
    });
  },

  updateWebhook: (webhook: Webhook, fromOrgName?: string): Promise<null | string> => {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });
    const formattedPackages = webhook.packages.map((packageItem: Package) => ({
      package_id: packageItem.packageId,
    }));
    return apiFetch(`${API_BASE_URL}/webhooks${getUrlContext(fromOrgName)}/${webhook.webhookId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...formattedWebhook, packages: formattedPackages }),
    });
  },

  triggerWebhookTest: (webhook: TestWebhook): Promise<string | null> => {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });

    return apiFetch(`${API_BASE_URL}/webhooks/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedWebhook),
    });
  },

  getAPIKeys: (): Promise<APIKey[]> => {
    return apiFetch(`${API_BASE_URL}/api-keys`);
  },

  getAPIKey: (apiKeyId: string): Promise<APIKey> => {
    return apiFetch(`${API_BASE_URL}/api-keys/${apiKeyId}`);
  },

  addAPIKey: (name: string): Promise<APIKeyCode> => {
    return apiFetch(`${API_BASE_URL}/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
      }),
    });
  },

  updateAPIKey: (apiKeyId: string, name: string): Promise<string | null> => {
    return apiFetch(`${API_BASE_URL}/api-keys/${apiKeyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name }),
    });
  },

  deleteAPIKey: (apiKeyId: string): Promise<string | null> => {
    return apiFetch(`${API_BASE_URL}/api-keys/${apiKeyId}`, {
      method: 'DELETE',
    });
  },
};
