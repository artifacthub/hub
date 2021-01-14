import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import camelCase from 'lodash/camelCase';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

import {
  APIKey,
  APIKeyCode,
  AuthorizerAction,
  ChangeLog,
  CheckAvailabilityProps,
  Error,
  ErrorKind,
  EventKind,
  LogoImage,
  OptOutItem,
  Organization,
  OrganizationPolicy,
  Package,
  PackageStars,
  Profile,
  RegoPlaygroundPolicy,
  RegoPlaygroundResult,
  Repository,
  SearchQuery,
  SearchResults,
  SecurityReport,
  Stats,
  Subscription,
  TestWebhook,
  TsQuery,
  User,
  UserFullName,
  UserLogin,
  Webhook,
} from '../types';
import { TS_QUERY } from '../utils/data';
import getHubBaseURL from '../utils/getHubBaseURL';
import renameKeysInObject from '../utils/renameKeysInObject';

interface PackageRequest {
  packageName: string;
  repositoryKind: string;
  repositoryName: string;
  version?: string;
}

interface TransferRepositoryRequest {
  repositoryName: string;
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

const EXCEPTIONS = ['policies', 'rules', 'policyData', 'roles', 'crds', 'crdsExamples'];

export const toCamelCase = (r: any): Result => {
  if (isArray(r)) {
    return r.map((v) => toCamelCase(v));
  } else if (isObject(r)) {
    return Object.keys(r).reduce(
      (result, key) => ({
        ...result,
        [camelCase(key)]: EXCEPTIONS.includes(key) ? (r as Result)[key] : toCamelCase((r as Result)[key]),
      }),
      {}
    );
  }
  return r;
};

const handleErrors = async (res: any) => {
  if (!res.ok) {
    let error: Error;
    switch (res.status) {
      case 401:
        error = {
          kind: ErrorKind.Unauthorized,
        };
        break;
      case 404:
        error = {
          kind: ErrorKind.NotFound,
        };
        break;
      case 403:
        error = {
          kind: ErrorKind.Forbidden,
        };
        break;
      default:
        try {
          let text = await res.json();
          error = {
            kind: ErrorKind.Other,
            message: text.message !== '' ? text.message : undefined,
          };
        } catch {
          error = {
            kind: ErrorKind.Other,
          };
        }
    }
    throw error;
  }
  return res;
};

const handleContent = async (res: any, skipCamelConversion?: boolean) => {
  switch (res.headers.get('Content-Type')) {
    case 'text/plain; charset=utf-8':
      const text = await res.text();
      return text;
    case 'application/json':
      const json = await res.json();
      return skipCamelConversion ? json : toCamelCase(json);
    default:
      return res;
  }
};

export const apiFetch = (url: string, opts?: FetchOptions, skipCamelConversion?: boolean): any => {
  const options = opts || {};
  return fetch(url, options)
    .then(handleErrors)
    .then((res) => handleContent(res, skipCamelConversion))
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
    let url = `${API_BASE_URL}/packages/${request.repositoryKind}/${request.repositoryName}/${request.packageName}`;
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
    if (!isUndefined(query.tsQueryWeb)) {
      q.set('ts_query_web', query.tsQueryWeb);
    }
    if (!isUndefined(query.tsQuery)) {
      let values: string[] = [];

      query.tsQuery.forEach((value: string) => {
        if (value !== '') {
          const activeTsQuery = TS_QUERY.find((ts: TsQuery) => ts.label === value);
          if (!isUndefined(activeTsQuery)) {
            values.push(activeTsQuery.value);
          }
        }
      });

      q.set('ts_query', values.join(' | '));
    }
    if (query.deprecated) {
      q.set('deprecated', 'true');
    }
    if (!isUndefined(query.operators) && query.operators) {
      q.set('operators', 'true');
    }
    if (!isUndefined(query.verifiedPublisher) && query.verifiedPublisher) {
      q.set('verified_publisher', 'true');
    }
    if (!isUndefined(query.official) && query.official) {
      q.set('official', 'true');
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

  getAllRepositories: (): Promise<Repository[]> => {
    return apiFetch(`${API_BASE_URL}/repositories`);
  },

  getRepositories: (fromOrgName?: string): Promise<Repository[]> => {
    return apiFetch(`${API_BASE_URL}/repositories${getUrlContext(fromOrgName)}`);
  },

  addRepository: (repository: Repository, fromOrgName?: string): Promise<null | string> => {
    const repo = renameKeysInObject(repository, {
      displayName: 'display_name',
      authUser: 'auth_user',
      authPass: 'auth_pass',
      scannerDisabled: 'scanner_disabled',
    });
    return apiFetch(`${API_BASE_URL}/repositories${getUrlContext(fromOrgName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(repo),
    });
  },

  deleteRepository: (repositoryName: string, fromOrgName?: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/repositories${getUrlContext(fromOrgName)}/${repositoryName}`, {
      method: 'DELETE',
    });
  },

  updateRepository: (repository: Repository, fromOrgName?: string): Promise<null | string> => {
    const repo = renameKeysInObject(repository, {
      displayName: 'display_name',
      authUser: 'auth_user',
      authPass: 'auth_pass',
      scannerDisabled: 'scanner_disabled',
    });
    return apiFetch(`${API_BASE_URL}/repositories${getUrlContext(fromOrgName)}/${repository.name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(repo),
    });
  },

  transferRepository: (params: TransferRepositoryRequest): Promise<null | string> => {
    return apiFetch(
      `${API_BASE_URL}/repositories${getUrlContext(params.fromOrgName)}/${params.repositoryName}/transfer${
        isUndefined(params.toOrgName) ? '' : `?org=${params.toOrgName}`
      }`,
      {
        method: 'PUT',
      }
    );
  },

  claimRepositoryOwnership: (repo: Repository, toOrgName?: string): Promise<null | string> => {
    return apiFetch(
      `${API_BASE_URL}/repositories${getUrlContext(repo.organizationName || undefined)}/${repo.name}/claimOwnership${
        isUndefined(toOrgName) ? '' : `?org=${toOrgName}`
      }`,
      {
        method: 'PUT',
      }
    );
  },

  checkAvailability: async (props: CheckAvailabilityProps): Promise<boolean> => {
    return fetch(`${API_BASE_URL}/check-availability/${props.resourceKind}?v=${encodeURIComponent(props.value)}`, {
      method: 'HEAD',
    })
      .then((res: any) => {
        switch (res.status) {
          case 404:
            return Promise.resolve(false);
          default:
            return Promise.resolve(true);
        }
      })
      .catch(() => {
        return Promise.resolve(true);
      });
  },

  getUserOrganizations: (): Promise<Organization[]> => {
    return apiFetch(`${API_BASE_URL}/orgs/user`);
  },

  getOrganization: (organizationName: string): Promise<Organization | null> => {
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

  updateOrganization: (organization: Organization, name: string): Promise<null | string> => {
    const org = renameKeysInObject(organization, {
      displayName: 'display_name',
      logoImageId: 'logo_image_id',
      homeUrl: 'home_url',
    });
    return apiFetch(`${API_BASE_URL}/orgs/${name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(org),
    });
  },

  deleteOrganization: (orgName: string): Promise<null | string> => {
    return apiFetch(`${API_BASE_URL}/orgs/${orgName}`, {
      method: 'DELETE',
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

  getOptOutList: (): Promise<OptOutItem[]> => {
    return apiFetch(`${API_BASE_URL}/subscriptions/opt-out`);
  },

  addOptOut: (repositoryId: string, eventKind: EventKind): Promise<string | null> => {
    return apiFetch(`${API_BASE_URL}/subscriptions/opt-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repository_id: repositoryId,
        event_kind: eventKind,
      }),
    });
  },

  deleteOptOut: (optOutId: string): Promise<string | null> => {
    return apiFetch(`${API_BASE_URL}/subscriptions/opt-out/${optOutId}`, {
      method: 'DELETE',
    });
  },

  getAuthorizationPolicy: (orgName: string): Promise<OrganizationPolicy> => {
    return apiFetch(`${API_BASE_URL}/orgs/${orgName}/authorizationPolicy`);
  },

  updateAuthorizationPolicy: (orgName: string, policy: OrganizationPolicy): Promise<string | null> => {
    const formattedPolicy = renameKeysInObject(
      { ...policy },
      {
        authorizationEnabled: 'authorization_enabled',
        predefinedPolicy: 'predefined_policy',
        customPolicy: 'custom_policy',
        policyData: 'policy_data',
      }
    );

    return apiFetch(`${API_BASE_URL}/orgs/${orgName}/authorizationPolicy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedPolicy),
    });
  },

  getUserAllowedActions: (orgName: string): Promise<AuthorizerAction[]> => {
    return apiFetch(`${API_BASE_URL}/orgs/${orgName}/userAllowedActions`);
  },

  getSnapshotSecurityReport: (packageId: string, version: string): Promise<SecurityReport> => {
    return apiFetch(`${API_BASE_URL}/packages/${packageId}/${version}/securityReport`, undefined, true);
  },

  getValuesSchema: (packageId: string, version: string): Promise<JSONSchema> => {
    return apiFetch(`${API_BASE_URL}/packages/${packageId}/${version}/valuesSchema`, undefined, true);
  },

  getChangelog: (packageId: string): Promise<ChangeLog[]> => {
    return apiFetch(`${API_BASE_URL}/packages/${packageId}/changelog`);
  },

  // External API call
  triggerTestInRegoPlayground: (data: RegoPlaygroundPolicy): Promise<RegoPlaygroundResult> => {
    return apiFetch('https://play.openpolicyagent.org/v1/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },
};
