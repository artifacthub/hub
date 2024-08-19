import camelCase from 'lodash/camelCase';
import isArray from 'lodash/isArray';
import isNull from 'lodash/isNull';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

import { JSONSchema } from '../jsonschema';
import {
  AHStats,
  APIKey,
  APIKeyCode,
  AuthorizerAction,
  ChangeLog,
  ChartTemplatesData,
  CheckAvailabilityProps,
  Error,
  ErrorKind,
  EventKind,
  LogoImage,
  Member,
  OptOutItem,
  Organization,
  OrganizationPolicy,
  Package,
  PackageStars,
  PackageViewsStats,
  Profile,
  RegoPlaygroundPolicy,
  RegoPlaygroundResult,
  Repository,
  SearchQuery,
  SearchResults,
  SecurityReport,
  SecurityReportResult,
  SortOption,
  Stats,
  Subscription,
  TestWebhook,
  TwoFactorAuth,
  User,
  UserFullName,
  UserLogin,
  Webhook,
} from '../types';
import { getURLSearchParams, prepareAPIQueryString } from '../utils/prepareQueryString';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface FetchOptions {
  method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'HEAD';
  headers?: {
    [key: string]: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
}

interface APIFetchProps {
  url: string;
  opts?: FetchOptions;
  skipCamelConversion?: boolean;
  checkApprovedSession?: boolean;
  headers?: string[];
}

type SecurityReportRaw = {
  [key: string]: { Results: SecurityReportResult[] } | SecurityReportResult[];
};

class API_CLASS {
  private EXCEPTIONS = [
    'policies',
    'rules',
    'policyData',
    'roles',
    'crds',
    'crdsExamples',
    'crds_examples',
    'examples',
    'template',
    'recipe',
  ];
  private HEADERS = {
    csrf: 'X-Csrf-Token',
    sessionApproved: 'X-Session-Approved',
    pagination: 'Pagination-Total-Count',
  };
  private csrfToken: string | null = null;
  private API_BASE_URL = '/api/v1';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public toCamelCase(r: any): any {
    if (isArray(r)) {
      return r.map((v) => this.toCamelCase(v));
    } else if (isObject(r)) {
      return Object.keys(r).reduce((result, key) => {
        return {
          ...result,
          [camelCase(key)]: this.EXCEPTIONS.includes(key) ? (r as Result)[key] : this.toCamelCase((r as Result)[key]),
        };
      }, {});
    }
    return r;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleErrors(res: any) {
    if (!res.ok) {
      let error: Error;
      let tmpError;
      switch (res.status) {
        case 401:
          try {
            tmpError = await res.json();
            error = {
              kind: ErrorKind.Unauthorized,
              message: tmpError.message !== '' ? tmpError.message : undefined,
            };
          } catch {
            error = {
              kind: ErrorKind.Unauthorized,
            };
          }

          break;
        case 404:
          error = {
            kind: ErrorKind.NotFound,
          };
          break;
        case 403:
          try {
            tmpError = await res.text();
            if (tmpError.includes('CSRF token invalid')) {
              this.csrfToken = null;
              error = {
                kind: ErrorKind.InvalidCSRF,
              };
            } else {
              error = {
                kind: ErrorKind.Forbidden,
              };
            }
          } catch {
            error = {
              kind: ErrorKind.Forbidden,
            };
          }
          break;
        case 410:
          error = {
            kind: ErrorKind.Gone,
          };
          break;
        default:
          try {
            tmpError = await res.json();
            error = {
              kind: ErrorKind.Other,
              message: tmpError.message !== '' ? tmpError.message : undefined,
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
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private checkIfApprovedSession(res: any) {
    if (res.headers.has(this.HEADERS.sessionApproved)) {
      const isApproved = res.headers.get(this.HEADERS.sessionApproved);
      if (isApproved === 'false') {
        const err = {
          kind: ErrorKind.NotApprovedSession,
        };
        throw err;
      } else {
        return res;
      }
    } else {
      return res;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getHeadersValue(res: any, params?: string[]): any {
    if (!isUndefined(params) && params.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headers: any = {};
      params.forEach((param: string) => {
        if (res.headers.has(param)) {
          headers[param] = res.headers.get(param);
        }
      });
      return headers;
    }
    return null;
  }

  private async handleContent(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: any,
    skipCamelConversion?: boolean,
    checkApprovedSession?: boolean,
    headers?: string[]
  ) {
    let response = res;
    if (!isUndefined(checkApprovedSession) && checkApprovedSession) {
      response = this.checkIfApprovedSession(res);
    }
    let content;
    let tmpHeaders;

    switch (response.headers.get('Content-Type')) {
      case 'text/plain; charset=utf-8':
      case 'text/markdown':
      case 'application/yaml':
      case 'text/yaml; charset=UTF-8':
      case 'text/yaml':
        content = await response.text();
        return content;
      case 'application/json':
        content = await response.json();
        tmpHeaders = this.getHeadersValue(res, headers);
        if (!isNull(tmpHeaders)) {
          if (isArray(content)) {
            content = { items: content };
          }
          content = { ...content, ...tmpHeaders };
        }
        return skipCamelConversion ? content : this.toCamelCase(content);
      default:
        return response;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async processFetchOptions(opts?: FetchOptions): Promise<FetchOptions | any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: FetchOptions | any = opts || {};
    // Use CSRF token only when methods are DELETE, POST and PUT
    if (opts && ['DELETE', 'POST', 'PUT'].includes(opts.method)) {
      if (isNull(this.csrfToken)) {
        // Get CSRF token first time we use one of these methods
        this.csrfToken = await this.getCSRFToken();
        if (isNull(this.csrfToken)) {
          const error = { kind: ErrorKind.Other };
          throw error;
        }
      }

      return {
        ...options,
        headers: {
          ...options.headers,
          [this.HEADERS.csrf]: this.csrfToken,
        },
      };
    }
    return options;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async apiFetch(props: APIFetchProps): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csrfRetry = (func: () => Promise<any>) => {
      return func().catch((error: Error) => {
        if (error.kind === ErrorKind.InvalidCSRF) {
          return func().catch((error) => Promise.reject(error));
        } else {
          return Promise.reject(error);
        }
      });
    };

    return csrfRetry(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options: FetchOptions | any = await this.processFetchOptions(props.opts);

      return fetch(props.url, options)
        .then((res) => this.handleErrors(res))
        .then((res) => this.handleContent(res, props.skipCamelConversion, props.checkApprovedSession, props.headers))
        .catch((error) => Promise.reject(error));
    });
  }

  public getUrlContext(fromOrgName?: string): string {
    let context = '/user';
    if (!isUndefined(fromOrgName)) {
      context = `/org/${fromOrgName}`;
    }
    return context;
  }

  public getPackage(request: PackageRequest): Promise<Package> {
    let url = `${this.API_BASE_URL}/packages/${request.repositoryKind}/${request.repositoryName}/${request.packageName}`;
    if (!isUndefined(request.version)) {
      url += `/${request.version}`;
    }
    return this.apiFetch({ url: url });
  }

  public toggleStar(packageId: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${packageId}/stars`,
      opts: {
        method: 'PUT',
      },
    });
  }

  public getStars(packageId: string): Promise<PackageStars> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/packages/${packageId}/stars` });
  }

  public searchPackages(query: SearchQuery, facets: boolean = true): Promise<SearchResults> {
    const q = getURLSearchParams(query);
    q.set('facets', facets ? 'true' : 'false');
    q.set('sort', query.sort || SortOption.Relevance);
    q.set('limit', query.limit.toString());
    q.set('offset', query.offset.toString());

    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/search?${q.toString()}`,
      headers: [this.HEADERS.pagination],
    });
  }

  public getStats(): Promise<Stats> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/packages/stats` });
  }

  public getRandomPackages(): Promise<Package[]> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/packages/random` });
  }

  public getCSRFToken(): Promise<string | null> {
    const tokenError = { kind: ErrorKind.Other };
    return fetch(`${this.API_BASE_URL}/csrf`).then((res) => {
      if (!res.ok) {
        throw tokenError;
      } else {
        if (res.headers.has(this.HEADERS.csrf)) {
          const token = res.headers.get(this.HEADERS.csrf);
          return token === '' ? null : token;
        } else {
          throw tokenError;
        }
      }
    });
  }

  public register(user: User): Promise<null | string> {
    const newUser = renameKeysInObject(user, { firstName: 'first_name', lastName: 'last_name' });
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      },
    });
  }

  public verifyEmail(code: string): Promise<null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/verify-email`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
        }),
      },
    });
  }

  public login(user: UserLogin): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/login`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
        }),
      },
      checkApprovedSession: true,
    });
  }

  public logout(): Promise<null | string> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/users/logout` });
  }

  public getUserProfile(): Promise<Profile> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/users/profile` });
  }

  public checkPasswordStrength(pwd: string): Promise<boolean> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/check-password-strength`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: pwd,
        }),
      },
    });
  }

  public searchRepositories(query: SearchQuery): Promise<{ items: Repository[]; paginationTotalCount: string }> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/repositories/search${prepareAPIQueryString(query)}`,
      headers: [this.HEADERS.pagination],
    });
  }

  public addRepository(repository: Repository, fromOrgName?: string): Promise<null | string> {
    const repo = renameKeysInObject(repository, {
      displayName: 'display_name',
      authUser: 'auth_user',
      authPass: 'auth_pass',
      scannerDisabled: 'scanner_disabled',
    });
    return this.apiFetch({
      url: `${this.API_BASE_URL}/repositories${this.getUrlContext(fromOrgName)}`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(repo),
      },
    });
  }

  public deleteRepository(repositoryName: string, fromOrgName?: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/repositories${this.getUrlContext(fromOrgName)}/${repositoryName}`,
      opts: {
        method: 'DELETE',
      },
    });
  }

  public updateRepository(repository: Repository, fromOrgName?: string): Promise<null | string> {
    const repo = renameKeysInObject(repository, {
      displayName: 'display_name',
      authUser: 'auth_user',
      authPass: 'auth_pass',
      scannerDisabled: 'scanner_disabled',
    });
    return this.apiFetch({
      url: `${this.API_BASE_URL}/repositories${this.getUrlContext(fromOrgName)}/${repository.name}`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(repo),
      },
    });
  }

  public transferRepository(params: TransferRepositoryRequest): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/repositories${this.getUrlContext(params.fromOrgName)}/${
        params.repositoryName
      }/transfer${isUndefined(params.toOrgName) ? '' : `?org=${params.toOrgName}`}`,
      opts: {
        method: 'PUT',
      },
    });
  }

  public claimRepositoryOwnership(repo: Repository, toOrgName?: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/repositories${this.getUrlContext(repo.organizationName || undefined)}/${
        repo.name
      }/claim-ownership${isUndefined(toOrgName) ? '' : `?org=${toOrgName}`}`,
      opts: {
        method: 'PUT',
      },
    });
  }

  public async checkAvailability(props: CheckAvailabilityProps): Promise<boolean> {
    return (
      fetch(`${this.API_BASE_URL}/check-availability/${props.resourceKind}?v=${encodeURIComponent(props.value)}`, {
        method: 'HEAD',
      })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        })
    );
  }

  public getUserOrganizations(query: SearchQuery): Promise<{ items: Organization[]; paginationTotalCount: string }> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/orgs/user${prepareAPIQueryString(query)}`,
      headers: [this.HEADERS.pagination],
    });
  }

  public getOrganization(organizationName: string): Promise<Organization | null> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/orgs/${organizationName}` });
  }

  public addOrganization(organization: Organization): Promise<null | string> {
    const org = renameKeysInObject(organization, {
      displayName: 'display_name',
      logoImageId: 'logo_image_id',
      homeUrl: 'home_url',
    });
    return this.apiFetch({
      url: `${this.API_BASE_URL}/orgs`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(org),
      },
    });
  }

  public updateOrganization(organization: Organization, name: string): Promise<null | string> {
    const org = renameKeysInObject(organization, {
      displayName: 'display_name',
      logoImageId: 'logo_image_id',
      homeUrl: 'home_url',
    });
    return this.apiFetch({
      url: `${this.API_BASE_URL}/orgs/${name}`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(org),
      },
    });
  }

  public deleteOrganization(orgName: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/orgs/${orgName}`,
      opts: {
        method: 'DELETE',
      },
    });
  }

  public getOrganizationMembers(
    query: SearchQuery,
    organizationName: string
  ): Promise<{ items: Member[]; paginationTotalCount: string }> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/orgs/${organizationName}/members${prepareAPIQueryString(query)}`,
      headers: [this.HEADERS.pagination],
    });
  }

  public addOrganizationMember(organizationName: string, alias: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/orgs/${organizationName}/member/${encodeURI(alias)}`,
      opts: {
        method: 'POST',
      },
    });
  }

  public deleteOrganizationMember(organizationName: string, alias: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/orgs/${organizationName}/member/${encodeURI(alias)}`,
      opts: {
        method: 'DELETE',
      },
    });
  }

  public confirmOrganizationMembership(organizationName: string): Promise<null> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/orgs/${organizationName}/accept-invitation` });
  }

  public getStarredByUser(query: SearchQuery): Promise<{ items: Package[]; paginationTotalCount: string }> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/starred${prepareAPIQueryString(query)}`,
      headers: [this.HEADERS.pagination],
    });
  }

  public updateUserProfile(profile: UserFullName): Promise<null | string> {
    const updatedProfile = renameKeysInObject(profile, {
      firstName: 'first_name',
      lastName: 'last_name',
      profileImageId: 'profile_image_id',
    });
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/profile`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProfile),
      },
    });
  }

  public updatePassword(oldPassword: string, newPassword: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/password`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old: oldPassword,
          new: newPassword,
        }),
      },
    });
  }

  public saveImage(data: string | ArrayBuffer): Promise<LogoImage> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/images`,
      opts: {
        method: 'POST',
        body: data,
      },
    });
  }

  public getPackageSubscriptions(packageId: string): Promise<Subscription[]> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/subscriptions/${packageId}` });
  }

  public addSubscription(packageId: string, eventKind: EventKind): Promise<string | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/subscriptions`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: packageId,
          event_kind: eventKind,
        }),
      },
    });
  }

  public deleteSubscription(packageId: string, eventKind: EventKind): Promise<string | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/subscriptions?package_id=${packageId}&event_kind=${eventKind}`,
      opts: {
        method: 'DELETE',
      },
    });
  }

  public getUserSubscriptions(query: SearchQuery): Promise<{ items: Package[]; paginationTotalCount: string }> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/subscriptions${prepareAPIQueryString(query)}`,
      headers: [this.HEADERS.pagination],
    });
  }

  public getWebhooks(
    query: SearchQuery,
    fromOrgName?: string
  ): Promise<{ items: Webhook[]; paginationTotalCount: string }> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}${prepareAPIQueryString(query)}`,
      headers: [this.HEADERS.pagination],
    });
  }

  public getWebhook(webhookId: string, fromOrgName?: string): Promise<Webhook> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}/${webhookId}` });
  }

  public addWebhook(webhook: Webhook, fromOrgName?: string): Promise<null | string> {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });
    const formattedPackages = webhook.packages.map((packageItem: Package) => ({
      package_id: packageItem.packageId,
    }));
    return this.apiFetch({
      url: `${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formattedWebhook,
          packages: formattedPackages,
        }),
      },
    });
  }

  public deleteWebhook(webhookId: string, fromOrgName?: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}/${webhookId}`,
      opts: {
        method: 'DELETE',
      },
    });
  }

  public updateWebhook(webhook: Webhook, fromOrgName?: string): Promise<null | string> {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });
    const formattedPackages = webhook.packages.map((packageItem: Package) => ({
      package_id: packageItem.packageId,
    }));
    return this.apiFetch({
      url: `${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}/${webhook.webhookId}`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formattedWebhook, packages: formattedPackages }),
      },
    });
  }

  public triggerWebhookTest(webhook: TestWebhook): Promise<string | null> {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });

    return this.apiFetch({
      url: `${this.API_BASE_URL}/webhooks/test`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedWebhook),
      },
    });
  }

  public getAPIKeys(query: SearchQuery): Promise<{ items: APIKey[]; paginationTotalCount: string }> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/api-keys${prepareAPIQueryString(query)}`,
      headers: [this.HEADERS.pagination],
    });
  }

  public getAPIKey(apiKeyId: string): Promise<APIKey> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/api-keys/${apiKeyId}` });
  }

  public addAPIKey(name: string): Promise<APIKeyCode> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/api-keys`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
        }),
      },
    });
  }

  public updateAPIKey(apiKeyId: string, name: string): Promise<string | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/api-keys/${apiKeyId}`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name }),
      },
    });
  }

  public deleteAPIKey(apiKeyId: string): Promise<string | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/api-keys/${apiKeyId}`,
      opts: {
        method: 'DELETE',
      },
    });
  }

  public getOptOutList(query: SearchQuery): Promise<{ items: OptOutItem[]; paginationTotalCount: string }> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/subscriptions/opt-out${prepareAPIQueryString(query)}`,
      headers: [this.HEADERS.pagination],
    });
  }

  public addOptOut(repositoryId: string, eventKind: EventKind): Promise<string | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/subscriptions/opt-out`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository_id: repositoryId,
          event_kind: eventKind,
        }),
      },
    });
  }

  public deleteOptOut(optOutId: string): Promise<string | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/subscriptions/opt-out/${optOutId}`,
      opts: {
        method: 'DELETE',
      },
    });
  }

  public getAuthorizationPolicy(orgName: string): Promise<OrganizationPolicy> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/orgs/${orgName}/authorization-policy` });
  }

  public updateAuthorizationPolicy(orgName: string, policy: OrganizationPolicy): Promise<string | null> {
    const formattedPolicy = renameKeysInObject(
      { ...policy },
      {
        authorizationEnabled: 'authorization_enabled',
        predefinedPolicy: 'predefined_policy',
        customPolicy: 'custom_policy',
        policyData: 'policy_data',
      }
    );

    return this.apiFetch({
      url: `${this.API_BASE_URL}/orgs/${orgName}/authorization-policy`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedPolicy),
      },
    });
  }

  public getUserAllowedActions(orgName: string): Promise<AuthorizerAction[]> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/orgs/${orgName}/user-allowed-actions` });
  }

  public getSnapshotSecurityReport(
    packageId: string,
    version: string,
    eventId?: string | null
  ): Promise<SecurityReport> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${packageId}/${version}/security-report${
        eventId ? `?event-id=${eventId}` : ''
      }`,
      skipCamelConversion: true,
    }).then((report: SecurityReportRaw) => {
      const newFormatReport: SecurityReport = {};
      Object.keys(report).forEach((item: string) => {
        // https://github.com/aquasecurity/trivy/discussions/1050
        if (isArray(report[item])) {
          newFormatReport[item] = {
            Results: report[item] as SecurityReportResult[],
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if (isObject(report[item]) && !isUndefined((report[item] as any).Results)) {
          newFormatReport[item] = report[item] as { Results: SecurityReportResult[] };
        }
      });
      return newFormatReport;
    });
  }

  public getChartValues(packageId: string, version: string): Promise<string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${packageId}/${version}/values`,
    });
  }

  public getValuesSchema(packageId: string, version: string): Promise<JSONSchema> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${packageId}/${version}/values-schema`,
      skipCamelConversion: true,
    });
  }

  public trackView(packageId: string, version: string): Promise<null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${packageId}/${version}/views`,
      opts: {
        method: 'POST',
      },
    });
  }

  public getViews(packageId: string): Promise<PackageViewsStats> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/packages/${packageId}/views`, skipCamelConversion: true });
  }

  public getChangelog(packageId: string): Promise<ChangeLog[]> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/packages/${packageId}/changelog` });
  }

  public getChangelogMD(request: PackageRequest): Promise<string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${request.repositoryKind}/${request.repositoryName}/${request.packageName}/changelog.md`,
    });
  }

  public getChartTemplates(packageId: string, version: string): Promise<ChartTemplatesData | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${packageId}/${version}/templates`,
      skipCamelConversion: true,
    });
  }

  // Reset password
  public requestPasswordResetCode(email: string): Promise<string | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/password-reset-code`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      },
    });
  }

  public verifyPasswordResetCode(code: string): Promise<string | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/verify-password-reset-code`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
        }),
      },
    });
  }

  public resetPassword(code: string, password: string): Promise<null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/reset-password`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          password: password,
        }),
      },
    });
  }

  public getAHStats(): Promise<AHStats | null> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/stats` });
  }

  // 2FA
  public setUpTFA(): Promise<TwoFactorAuth> {
    return this.apiFetch({ url: `${this.API_BASE_URL}/users/tfa`, opts: { method: 'POST' } });
  }

  public enableTFA(passcode: string): Promise<null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/tfa/enable`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passcode: passcode,
        }),
      },
    });
  }

  public disableTFA(passcode: string): Promise<null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/tfa/disable`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passcode: passcode,
        }),
      },
    });
  }

  public approveSession(passcode: string): Promise<null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/approve-session`,
      opts: {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passcode: passcode,
        }),
      },
    });
  }

  public registerDeleteUserCode(): Promise<null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users/delete-user-code`,
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    });
  }

  public deleteUser(code: string): Promise<null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/users`,
      opts: {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
        }),
      },
    });
  }

  public getAllUserOrganizations(): Promise<Organization[]> {
    return this.getAllItems(`${this.API_BASE_URL}/orgs/user`) as Promise<Organization[]>;
  }

  public getAllOrganizationMembers(organizationName: string): Promise<Member[]> {
    return this.getAllItems(`${this.API_BASE_URL}/orgs/${organizationName}/members`) as Promise<Member[]>;
  }

  public getAllOptOut(): Promise<OptOutItem[]> {
    return this.getAllItems(`${this.API_BASE_URL}/subscriptions/opt-out`) as Promise<OptOutItem[]>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getAllItems(url: string): Promise<any[]> {
    const MAX_LIMIT = 60;
    const formattedUrl = `${url}?limit=${MAX_LIMIT}`;

    return this.apiFetch({ url: `${formattedUrl}&offset=0`, headers: [this.HEADERS.pagination] }).then(
      async (result) => {
        const paginationTotalCount = parseInt(result.paginationTotalCount);
        let items = result.items;
        if (paginationTotalCount > MAX_LIMIT) {
          const totalPages = Math.ceil(paginationTotalCount / MAX_LIMIT);
          const pagesList = Array.from(Array(totalPages - 1), (_, i) => i + 1);

          await Promise.all([
            ...pagesList.map((page: number) => this.apiFetch({ url: `${formattedUrl}&offset=${page * MAX_LIMIT}` })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ]).then((res) => res.forEach((list: any[]) => (items = [...items, ...list])));
          return items;
        } else {
          return items;
        }
      }
    );
  }

  // Production usage
  public getProductionUsage(request: PackageRequest): Promise<Organization[] | null> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${request.repositoryKind}/${request.repositoryName}/${request.packageName}/production-usage`,
    });
  }

  public addProductionUsage(request: PackageRequest, orgName: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${request.repositoryKind}/${request.repositoryName}/${request.packageName}/production-usage/${orgName}`,
      opts: {
        method: 'POST',
      },
    });
  }

  public deleteProductionUsage(request: PackageRequest, orgName: string): Promise<null | string> {
    return this.apiFetch({
      url: `${this.API_BASE_URL}/packages/${request.repositoryKind}/${request.repositoryName}/${request.packageName}/production-usage/${orgName}`,
      opts: {
        method: 'DELETE',
      },
    });
  }

  // External API call
  public triggerTestInRegoPlayground(data: RegoPlaygroundPolicy): Promise<RegoPlaygroundResult> {
    return this.apiFetch({
      url: 'https://play.openpolicyagent.org/v1/share',
      opts: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getBannersInfo(url: string): Promise<any> {
    return this.apiFetch({
      url: url,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getSchemaDef(url: string): Promise<any> {
    return this.apiFetch({
      url: url,
    });
  }

  public getPublicSignKey(url: string): Promise<string> {
    return this.apiFetch({
      url: url,
    });
  }
}

const API = new API_CLASS();
export default API;
