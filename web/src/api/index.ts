import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { isNull } from 'lodash';
import camelCase from 'lodash/camelCase';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';

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
  TwoFactorAuth,
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

class API_CLASS {
  private EXCEPTIONS = ['policies', 'rules', 'policyData', 'roles', 'crds', 'crdsExamples'];
  private CSRF_HEADER = 'X-Csrf-Token';
  private SESSION_APPROVED_HEADER = 'X-Session-Approved';
  private csrfToken: string | null = null;
  private API_BASE_URL = `${getHubBaseURL()}/api/v1`;

  private toCamelCase(r: any): any {
    if (isArray(r)) {
      return r.map((v) => this.toCamelCase(v));
    } else if (isObject(r)) {
      return Object.keys(r).reduce(
        (result, key) => ({
          ...result,
          [camelCase(key)]: this.EXCEPTIONS.includes(key) ? (r as Result)[key] : this.toCamelCase((r as Result)[key]),
        }),
        {}
      );
    }
    return r;
  }

  private async handleErrors(res: any) {
    if (!res.ok) {
      let error: Error;
      switch (res.status) {
        case 401:
          try {
            let text = await res.json();
            error = {
              kind: ErrorKind.Unauthorized,
              message: text.message !== '' ? text.message : undefined,
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
            const er = await res.text();
            if (er.includes('CSRF token invalid')) {
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
  }

  private checkIfApprovedSession(res: any) {
    if (res.headers.has(this.SESSION_APPROVED_HEADER)) {
      const isApproved = res.headers.get(this.SESSION_APPROVED_HEADER);
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

  private getHeadersValue(res: any, params?: string[]): any {
    if (!isUndefined(params) && params.length > 0) {
      let headers: any = {};
      params.forEach((param: string) => {
        const value = res.headers.get(param);
        if (value) {
          headers[param] = value;
        }
      });
      return headers;
    }
    return null;
  }

  private async handleContent(
    res: any,
    skipCamelConversion?: boolean,
    checkApprovedSession?: boolean,
    headers?: string[]
  ) {
    let response = res;
    if (!isUndefined(checkApprovedSession) && checkApprovedSession) {
      response = this.checkIfApprovedSession(res);
    }

    switch (response.headers.get('Content-Type')) {
      case 'text/plain; charset=utf-8':
        const text = await response.text();
        return text;
      case 'application/json':
        let json = await response.json();
        const tmpHeaders = this.getHeadersValue(res, headers);
        if (!isNull(tmpHeaders)) {
          json = { ...json, ...tmpHeaders };
        }
        return skipCamelConversion ? json : this.toCamelCase(json);
      default:
        return response;
    }
  }

  private async processFetchOptions(opts?: FetchOptions): Promise<FetchOptions | any> {
    let options: FetchOptions | any = opts || {};
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
          [this.CSRF_HEADER]: this.csrfToken,
        },
      };
    }
    return options;
  }

  private async apiFetch(
    url: string,
    opts?: FetchOptions,
    skipCamelConversion?: boolean,
    checkApprovedSession?: boolean,
    headers?: string[]
  ): Promise<any> {
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
      let options: FetchOptions | any = await this.processFetchOptions(opts);

      return fetch(url, options)
        .then(this.handleErrors)
        .then((res) => this.handleContent(res, skipCamelConversion, checkApprovedSession, headers))
        .catch((error) => Promise.reject(error));
    });
  }

  private getUrlContext(fromOrgName?: string): string {
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
    return this.apiFetch(url);
  }

  public toggleStar(packageId: string): Promise<null | string> {
    return this.apiFetch(`${this.API_BASE_URL}/packages/${packageId}/stars`, {
      method: 'PUT',
    });
  }

  public getStars(packageId: string): Promise<PackageStars> {
    return this.apiFetch(`${this.API_BASE_URL}/packages/${packageId}/stars`);
  }

  public searchPackages(query: SearchQuery, facets: boolean = true): Promise<SearchResults> {
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
    return this.apiFetch(`${this.API_BASE_URL}/packages/search?${q.toString()}`, undefined, false, false, [
      'Pagination-Total-Count',
    ]);
  }

  public getStats(): Promise<Stats> {
    return this.apiFetch(`${this.API_BASE_URL}/packages/stats`);
  }

  public getRandomPackages(): Promise<Package[]> {
    return this.apiFetch(`${this.API_BASE_URL}/packages/random`);
  }

  public getCSRFToken(): Promise<string | null> {
    const tokenError = { kind: ErrorKind.Other };
    return fetch(`${this.API_BASE_URL}/csrf`).then((res) => {
      if (!res.ok) {
        throw tokenError;
      } else {
        if (res.headers.has(this.CSRF_HEADER)) {
          const token = res.headers.get(this.CSRF_HEADER);
          return token === '' ? null : token;
        } else {
          throw tokenError;
        }
      }
    });
  }

  public register(user: User): Promise<null | string> {
    const newUser = renameKeysInObject(user, { firstName: 'first_name', lastName: 'last_name' });
    return this.apiFetch(`${this.API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newUser),
    });
  }

  public verifyEmail(code: string): Promise<null> {
    return this.apiFetch(`${this.API_BASE_URL}/users/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
      }),
    });
  }

  public login(user: UserLogin): Promise<null | string> {
    return this.apiFetch(
      `${this.API_BASE_URL}/users/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
        }),
      },
      false,
      true
    );
  }

  public logout(): Promise<null | string> {
    return this.apiFetch(`${this.API_BASE_URL}/users/logout`);
  }

  public getUserProfile(): Promise<Profile> {
    return this.apiFetch(`${this.API_BASE_URL}/users/profile`);
  }

  public checkPasswordStrength(pwd: string): Promise<boolean> {
    return this.apiFetch(`${this.API_BASE_URL}/users/check-password-strength`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: pwd,
      }),
    });
  }

  public getAllRepositories(): Promise<Repository[]> {
    return this.apiFetch(`${this.API_BASE_URL}/repositories`);
  }

  public getRepositories(fromOrgName?: string): Promise<Repository[]> {
    return this.apiFetch(`${this.API_BASE_URL}/repositories${this.getUrlContext(fromOrgName)}`);
  }

  public addRepository(repository: Repository, fromOrgName?: string): Promise<null | string> {
    const repo = renameKeysInObject(repository, {
      displayName: 'display_name',
      authUser: 'auth_user',
      authPass: 'auth_pass',
      scannerDisabled: 'scanner_disabled',
    });
    return this.apiFetch(`${this.API_BASE_URL}/repositories${this.getUrlContext(fromOrgName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(repo),
    });
  }

  public deleteRepository(repositoryName: string, fromOrgName?: string): Promise<null | string> {
    return this.apiFetch(`${this.API_BASE_URL}/repositories${this.getUrlContext(fromOrgName)}/${repositoryName}`, {
      method: 'DELETE',
    });
  }

  public updateRepository(repository: Repository, fromOrgName?: string): Promise<null | string> {
    const repo = renameKeysInObject(repository, {
      displayName: 'display_name',
      authUser: 'auth_user',
      authPass: 'auth_pass',
      scannerDisabled: 'scanner_disabled',
    });
    return this.apiFetch(`${this.API_BASE_URL}/repositories${this.getUrlContext(fromOrgName)}/${repository.name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(repo),
    });
  }

  public transferRepository(params: TransferRepositoryRequest): Promise<null | string> {
    return this.apiFetch(
      `${this.API_BASE_URL}/repositories${this.getUrlContext(params.fromOrgName)}/${params.repositoryName}/transfer${
        isUndefined(params.toOrgName) ? '' : `?org=${params.toOrgName}`
      }`,
      {
        method: 'PUT',
      }
    );
  }

  public claimRepositoryOwnership(repo: Repository, toOrgName?: string): Promise<null | string> {
    return this.apiFetch(
      `${this.API_BASE_URL}/repositories${this.getUrlContext(repo.organizationName || undefined)}/${
        repo.name
      }/claim-ownership${isUndefined(toOrgName) ? '' : `?org=${toOrgName}`}`,
      {
        method: 'PUT',
      }
    );
  }

  public async checkAvailability(props: CheckAvailabilityProps): Promise<boolean> {
    return fetch(`${this.API_BASE_URL}/check-availability/${props.resourceKind}?v=${encodeURIComponent(props.value)}`, {
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
  }

  public getUserOrganizations(): Promise<Organization[]> {
    return this.apiFetch(`${this.API_BASE_URL}/orgs/user`);
  }

  public getOrganization(organizationName: string): Promise<Organization | null> {
    return this.apiFetch(`${this.API_BASE_URL}/orgs/${organizationName}`);
  }

  public addOrganization(organization: Organization): Promise<null | string> {
    const org = renameKeysInObject(organization, {
      displayName: 'display_name',
      logoImageId: 'logo_image_id',
      homeUrl: 'home_url',
    });
    return this.apiFetch(`${this.API_BASE_URL}/orgs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(org),
    });
  }

  public updateOrganization(organization: Organization, name: string): Promise<null | string> {
    const org = renameKeysInObject(organization, {
      displayName: 'display_name',
      logoImageId: 'logo_image_id',
      homeUrl: 'home_url',
    });
    return this.apiFetch(`${this.API_BASE_URL}/orgs/${name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(org),
    });
  }

  public deleteOrganization(orgName: string): Promise<null | string> {
    return this.apiFetch(`${this.API_BASE_URL}/orgs/${orgName}`, {
      method: 'DELETE',
    });
  }

  public getOrganizationMembers(organizationName: string): Promise<User[]> {
    return this.apiFetch(`${this.API_BASE_URL}/orgs/${organizationName}/members`);
  }

  public addOrganizationMember(organizationName: string, alias: string): Promise<null | string> {
    return this.apiFetch(`${this.API_BASE_URL}/orgs/${organizationName}/member/${encodeURI(alias)}`, {
      method: 'POST',
    });
  }

  public deleteOrganizationMember(organizationName: string, alias: string): Promise<null | string> {
    return this.apiFetch(`${this.API_BASE_URL}/orgs/${organizationName}/member/${encodeURI(alias)}`, {
      method: 'DELETE',
    });
  }

  public confirmOrganizationMembership(organizationName: string): Promise<null> {
    return this.apiFetch(`${this.API_BASE_URL}/orgs/${organizationName}/accept-invitation`);
  }

  public getStarredByUser(): Promise<Package[]> {
    return this.apiFetch(`${this.API_BASE_URL}/packages/starred`);
  }

  public updateUserProfile(profile: UserFullName): Promise<null | string> {
    const updatedProfile = renameKeysInObject(profile, {
      firstName: 'first_name',
      lastName: 'last_name',
      profileImageId: 'profile_image_id',
    });
    return this.apiFetch(`${this.API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedProfile),
    });
  }

  public updatePassword(oldPassword: string, newPassword: string): Promise<null | string> {
    return this.apiFetch(`${this.API_BASE_URL}/users/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        old: oldPassword,
        new: newPassword,
      }),
    });
  }

  public saveImage(data: string | ArrayBuffer): Promise<LogoImage> {
    return this.apiFetch(`${this.API_BASE_URL}/images`, {
      method: 'POST',
      body: data,
    });
  }

  public getPackageSubscriptions(packageId: string): Promise<Subscription[]> {
    return this.apiFetch(`${this.API_BASE_URL}/subscriptions/${packageId}`);
  }

  public addSubscription(packageId: string, eventKind: EventKind): Promise<string | null> {
    return this.apiFetch(`${this.API_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_id: packageId,
        event_kind: eventKind,
      }),
    });
  }

  public deleteSubscription(packageId: string, eventKind: EventKind): Promise<string | null> {
    return this.apiFetch(`${this.API_BASE_URL}/subscriptions?package_id=${packageId}&event_kind=${eventKind}`, {
      method: 'DELETE',
    });
  }

  public getUserSubscriptions(): Promise<Package[]> {
    return this.apiFetch(`${this.API_BASE_URL}/subscriptions`);
  }

  public getWebhooks(fromOrgName?: string): Promise<Webhook[]> {
    return this.apiFetch(`${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}`);
  }

  public getWebhook(webhookId: string, fromOrgName?: string): Promise<Webhook> {
    return this.apiFetch(`${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}/${webhookId}`);
  }

  public addWebhook(webhook: Webhook, fromOrgName?: string): Promise<null | string> {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });
    const formattedPackages = webhook.packages.map((packageItem: Package) => ({
      package_id: packageItem.packageId,
    }));
    return this.apiFetch(`${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formattedWebhook,
        packages: formattedPackages,
      }),
    });
  }

  public deleteWebhook(webhookId: string, fromOrgName?: string): Promise<null | string> {
    return this.apiFetch(`${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}/${webhookId}`, {
      method: 'DELETE',
    });
  }

  public updateWebhook(webhook: Webhook, fromOrgName?: string): Promise<null | string> {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });
    const formattedPackages = webhook.packages.map((packageItem: Package) => ({
      package_id: packageItem.packageId,
    }));
    return this.apiFetch(`${this.API_BASE_URL}/webhooks${this.getUrlContext(fromOrgName)}/${webhook.webhookId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...formattedWebhook, packages: formattedPackages }),
    });
  }

  public triggerWebhookTest(webhook: TestWebhook): Promise<string | null> {
    const formattedWebhook = renameKeysInObject(webhook, { contentType: 'content_type', eventKinds: 'event_kinds' });

    return this.apiFetch(`${this.API_BASE_URL}/webhooks/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedWebhook),
    });
  }

  public getAPIKeys(): Promise<APIKey[]> {
    return this.apiFetch(`${this.API_BASE_URL}/api-keys`);
  }

  public getAPIKey(apiKeyId: string): Promise<APIKey> {
    return this.apiFetch(`${this.API_BASE_URL}/api-keys/${apiKeyId}`);
  }

  public addAPIKey(name: string): Promise<APIKeyCode> {
    return this.apiFetch(`${this.API_BASE_URL}/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
      }),
    });
  }

  public updateAPIKey(apiKeyId: string, name: string): Promise<string | null> {
    return this.apiFetch(`${this.API_BASE_URL}/api-keys/${apiKeyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name }),
    });
  }

  public deleteAPIKey(apiKeyId: string): Promise<string | null> {
    return this.apiFetch(`${this.API_BASE_URL}/api-keys/${apiKeyId}`, {
      method: 'DELETE',
    });
  }

  public getOptOutList(): Promise<OptOutItem[]> {
    return this.apiFetch(`${this.API_BASE_URL}/subscriptions/opt-out`);
  }

  public addOptOut(repositoryId: string, eventKind: EventKind): Promise<string | null> {
    return this.apiFetch(`${this.API_BASE_URL}/subscriptions/opt-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repository_id: repositoryId,
        event_kind: eventKind,
      }),
    });
  }

  public deleteOptOut(optOutId: string): Promise<string | null> {
    return this.apiFetch(`${this.API_BASE_URL}/subscriptions/opt-out/${optOutId}`, {
      method: 'DELETE',
    });
  }

  public getAuthorizationPolicy(orgName: string): Promise<OrganizationPolicy> {
    return this.apiFetch(`${this.API_BASE_URL}/orgs/${orgName}/authorization-policy`);
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

    return this.apiFetch(`${this.API_BASE_URL}/orgs/${orgName}/authorization-policy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedPolicy),
    });
  }

  public getUserAllowedActions(orgName: string): Promise<AuthorizerAction[]> {
    return this.apiFetch(`${this.API_BASE_URL}/orgs/${orgName}/user-allowed-actions`);
  }

  public getSnapshotSecurityReport(packageId: string, version: string): Promise<SecurityReport> {
    return this.apiFetch(`${this.API_BASE_URL}/packages/${packageId}/${version}/security-report`, undefined, true);
  }

  public getValuesSchema(packageId: string, version: string): Promise<JSONSchema> {
    return this.apiFetch(`${this.API_BASE_URL}/packages/${packageId}/${version}/values-schema`, undefined, true);
  }

  public getChangelog(packageId: string): Promise<ChangeLog[]> {
    return this.apiFetch(`${this.API_BASE_URL}/packages/${packageId}/changelog`);
  }

  public getChartTemplates(packageId: string, version: string): Promise<ChartTemplatesData | null> {
    return this.apiFetch(`${this.API_BASE_URL}/packages/${packageId}/${version}/templates`, undefined, true);
  }

  // Reset password
  public requestPasswordResetCode(email: string): Promise<string | null> {
    return this.apiFetch(`${this.API_BASE_URL}/users/password-reset-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
      }),
    });
  }

  public verifyPasswordResetCode(code: string): Promise<string | null> {
    return this.apiFetch(`${this.API_BASE_URL}/users/verify-password-reset-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
      }),
    });
  }

  public resetPassword(code: string, password: string): Promise<null> {
    return this.apiFetch(`${this.API_BASE_URL}/users/reset-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        password: password,
      }),
    });
  }

  public getAHStats(): Promise<AHStats | null> {
    return this.apiFetch(`${this.API_BASE_URL}/stats`);
  }

  // 2FA
  public setUpTFA(): Promise<TwoFactorAuth> {
    return this.apiFetch(`${this.API_BASE_URL}/users/tfa`, { method: 'POST' });
  }

  public enableTFA(passcode: string): Promise<null> {
    return this.apiFetch(`${this.API_BASE_URL}/users/tfa/enable`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        passcode: passcode,
      }),
    });
  }

  public disableTFA(passcode: string): Promise<null> {
    return this.apiFetch(`${this.API_BASE_URL}/users/tfa/disable`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        passcode: passcode,
      }),
    });
  }

  public approveSession(passcode: string): Promise<null> {
    return this.apiFetch(`${this.API_BASE_URL}/users/approve-session`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        passcode: passcode,
      }),
    });
  }

  // External API call
  public triggerTestInRegoPlayground(data: RegoPlaygroundPolicy): Promise<RegoPlaygroundResult> {
    return this.apiFetch('https://play.openpolicyagent.org/v1/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }
}

const API = new API_CLASS();
export default API;
