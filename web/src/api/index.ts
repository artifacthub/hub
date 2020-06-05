import camelCase from 'lodash/camelCase';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

import {
  ChartRepository,
  CheckAvailabilityProps,
  EventKind,
  LogoImage,
  Organization,
  Package,
  PackageStars,
  PackagesUpdatesList,
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

const getUrlContext = (fromOrgName?: string): string => {
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
    return apiFetch(`${API_BASE_URL}/package/${packageId}/stars`, {
      method: 'PUT',
    });
  },

  getStars: (packageId: string): Promise<PackageStars> => {
    return apiFetch(`${API_BASE_URL}/package/${packageId}/stars`);
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
      body: `code=${encodeURIComponent(code)}`,
    });
  },

  login: (user: UserLogin): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `email=${encodeURIComponent(user.email)}&password=${encodeURIComponent(user.password)}`,
    });
  },

  logout: (): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/logout`);
  },

  getUserProfile: (): Promise<Profile> => {
    return apiFetch(`${API_BASE_URL}/user`);
  },

  getChartRepositories: (fromOrgName?: string): Promise<ChartRepository[]> => {
    return apiFetch(`${API_BASE_URL}${getUrlContext(fromOrgName)}/chart-repositories`);
  },

  addChartRepository: (chartRepository: ChartRepository, fromOrgName?: string): Promise<null | string> => {
    const chartRepo = renameKeysInObject(chartRepository, { displayName: 'display_name' });
    return apiFetch(`${API_BASE_URL}${getUrlContext(fromOrgName)}/chart-repositories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chartRepo),
    });
  },

  deleteChartRepository: (chartRepositoryName: string, fromOrgName?: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}${getUrlContext(fromOrgName)}/chart-repositories/${chartRepositoryName}`, {
      method: 'DELETE',
    });
  },

  updateChartRepository: (chartRepository: ChartRepository, fromOrgName?: string): Promise<null | string> => {
    const chartRepo = renameKeysInObject(chartRepository, { displayName: 'display_name' });
    return apiFetch(`${API_BASE_URL}${getUrlContext(fromOrgName)}/chart-repositories/${chartRepository.name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chartRepo),
    });
  },

  transferChartRepository: (params: TransferChartRepositoryRequest): Promise<null | string> => {
    return apiFetch(
      `${API_BASE_URL}${getUrlContext(params.fromOrgName)}/chart-repositories/${params.chartRepositoryName}/transfer${
        isUndefined(params.toOrgName) ? '' : `?org=${params.toOrgName}`
      }`,
      {
        method: 'PUT',
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

  updateUserProfile: (profile: UserFullName): Promise<null | string> => {
    const updatedProfile = renameKeysInObject(profile, {
      firstName: 'first_name',
      lastName: 'last_name',
      profileImageId: 'profile_image_id',
    });
    return apiFetch(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedProfile),
    });
  },

  updatePassword: (oldPassword: string, newPassword: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/user/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `old=${encodeURIComponent(oldPassword)}&new=${encodeURIComponent(newPassword)}`,
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
    return apiFetch(`${API_BASE_URL}/subscriptions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: packageId,
        event_kind: eventKind,
      }),
    });
  },

  getUserSubscriptions: (): Promise<Package[]> => {
    return apiFetch(`${API_BASE_URL}/user/subscriptions`);
  },

  getWebhooks: (fromOrgName?: string): Promise<Webhook[]> => {
    return apiFetch(`${API_BASE_URL}${getUrlContext(fromOrgName)}/webhooks`);
  },

  getWebhook: (webhookId: string, fromOrgName?: string): Promise<Webhook> => {
    return apiFetch(`${API_BASE_URL}${getUrlContext(fromOrgName)}/webhooks/${webhookId}`);
  },

  addWebhook: (webhook: Webhook, fromOrgName?: string): Promise<null | string> => {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });
    const formattedPackages = webhook.packages.map((packageItem: Package) => ({
      package_id: packageItem.packageId,
    }));
    return apiFetch(`${API_BASE_URL}${getUrlContext(fromOrgName)}/webhooks`, {
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
    return apiFetch(`${API_BASE_URL}${getUrlContext(fromOrgName)}/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  },

  updateWebhook: (webhook: Webhook, fromOrgName?: string): Promise<null | string> => {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });
    const formattedPackages = webhook.packages.map((packageItem: Package) => ({
      package_id: packageItem.packageId,
    }));
    return apiFetch(`${API_BASE_URL}${getUrlContext(fromOrgName)}/webhooks/${webhook.webhookId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...formattedWebhook, packages: formattedPackages }),
    });
  },

  triggerWebhookTest: (webhook: TestWebhook): Promise<string | null> => {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });

    return apiFetch(`${API_BASE_URL}/webhook-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedWebhook),
    });
  },
};
