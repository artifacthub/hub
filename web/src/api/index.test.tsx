import * as methods from './index';

interface TestToCamelCase {
  entry: {
    [key: string]: any;
  };
  result: {
    [key: string]: any;
  };
}

interface Test {
  entry?: string;
  output: string;
}

const tests1: TestToCamelCase[] = [
  {
    entry: {
      alias: 'alias',
      first_name: 'name',
      last_name: 'lastName',
      email: 'email@email.com',
      profile_image_id: 'kjshjkd-jsdhkkjdsh',
    },
    result: {
      alias: 'alias',
      firstName: 'name',
      lastName: 'lastName',
      email: 'email@email.com',
      profileImageId: 'kjshjkd-jsdhkkjdsh',
    },
  },
  {
    entry: [
      {
        package_id: '94ca9775-dae4-41cc-9b5a-79d172074e41',
        name: 'ibm-istio-remote',
        normalized_name: 'ibm-istio-remote',
        logo_image_id: 'b82ed471-aae8-4490-be11-9c27927a6863',
        stars: 0,
        display_name: null,
        description: 'Helm chart needed for remote Kubernetes clusters to join the main Istio control plane',
        version: '1.0.5',
        app_version: '1.0.2',
        deprecated: false,
        signed: false,
        created_at: 1583881020,
        repository: {
          kind: 0,
          name: 'ibm-charts',
          display_name: 'IBM charts',
          repository_id: 'ad530337-9f42-41de-8b28-beb013ea1c32',
          user_alias: null,
          organization_name: 'helm',
          organization_display_name: 'Helm',
        },
      },
      {
        package_id: '80ead412-d356-4a79-8105-605f7250c1d6',
        name: 'FluentD',
        normalized_name: 'fluentd',
        logo_image_id: '91916588-f410-4833-9041-092329caca2d',
        stars: 0,
        display_name: null,
        description: 'Falco rules for securing FluentD',
        version: '1.0.0',
        app_version: null,
        deprecated: false,
        signed: false,
        created_at: 1592469454,
        repository: {
          kind: 1,
          name: 'test',
          display_name: 'test',
          repository_id: 'ad530337-9f42-41de-8b28-beb013ea1c32',
          user_alias: null,
          organization_name: 'falco',
          organization_display_name: 'Falco rules',
        },
      },
    ],
    result: [
      {
        packageId: '94ca9775-dae4-41cc-9b5a-79d172074e41',
        name: 'ibm-istio-remote',
        normalizedName: 'ibm-istio-remote',
        logoImageId: 'b82ed471-aae8-4490-be11-9c27927a6863',
        stars: 0,
        displayName: null,
        description: 'Helm chart needed for remote Kubernetes clusters to join the main Istio control plane',
        version: '1.0.5',
        appVersion: '1.0.2',
        deprecated: false,
        signed: false,
        createdAt: 1583881020,
        repository: {
          kind: 0,
          name: 'ibm-charts',
          displayName: 'IBM charts',
          repositoryId: 'ad530337-9f42-41de-8b28-beb013ea1c32',
          userAlias: null,
          organizationName: 'helm',
          organizationDisplayName: 'Helm',
        },
      },
      {
        packageId: '80ead412-d356-4a79-8105-605f7250c1d6',
        name: 'FluentD',
        normalizedName: 'fluentd',
        logoImageId: '91916588-f410-4833-9041-092329caca2d',
        stars: 0,
        displayName: null,
        description: 'Falco rules for securing FluentD',
        version: '1.0.0',
        appVersion: null,
        deprecated: false,
        signed: false,
        createdAt: 1592469454,
        repository: {
          kind: 1,
          name: 'test',
          displayName: 'test',
          repositoryId: 'ad530337-9f42-41de-8b28-beb013ea1c32',
          userAlias: null,
          organizationName: 'falco',
          organizationDisplayName: 'Falco rules',
        },
      },
    ],
  },
  {
    entry: [
      {
        name: 'org',
        display_name: 'Org',
        description: null,
        home_url: null,
        logo_image_id: null,
        confirmed: true,
        members_count: 1,
      },
      {
        name: 'org1',
        display_name: 'Org 1',
        description: null,
        home_url: null,
        logo_image_id: null,
        confirmed: true,
        members_count: 1,
      },
    ],
    result: [
      {
        name: 'org',
        displayName: 'Org',
        description: null,
        homeUrl: null,
        logoImageId: null,
        confirmed: true,
        membersCount: 1,
      },
      {
        name: 'org1',
        displayName: 'Org 1',
        description: null,
        homeUrl: null,
        logoImageId: null,
        confirmed: true,
        membersCount: 1,
      },
    ],
  },
];

const tests2: Test[] = [
  {
    entry: 'org1',
    output: '/org/org1',
  },
  {
    entry: 'org2',
    output: '/org/org2',
  },
  {
    entry: undefined,
    output: '/user',
  },
];

describe('index API', () => {
  describe('Test toCamelCase method', () => {
    for (let i = 0; i < tests1.length; i++) {
      it('renders proper content', () => {
        const actual = methods.toCamelCase(tests1[i].entry);
        expect(actual).toEqual(tests1[i].result);
      });
    }
  });

  describe('getUrlContext', () => {
    for (let i = 0; i < tests2.length; i++) {
      it('renders proper content', () => {
        const actual = methods.getUrlContext(tests2[i].entry);
        expect(actual).toEqual(tests2[i].output);
      });
    }
  });

  describe('handleUnauthorizedRequests', () => {
    it('when is authorized', async () => {
      expect.assertions(1);
      const test = await methods.handleUnauthorizedRequests({ status: 200 });
      expect(test).toEqual({
        status: 200,
      });
    });
  });
});
