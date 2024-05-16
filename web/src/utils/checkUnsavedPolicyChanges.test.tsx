import { OrganizationPolicy } from '../types';
import { checkUnsavedPolicyChanges, PolicyChangeAction } from './checkUnsavedPolicyChanges';
import stringifyPolicyData from './stringifyPolicyData';

interface Test {
  name: string;
  server?: OrganizationPolicy;
  browser?: OrganizationPolicy;
  action?: PolicyChangeAction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  predefinedPolicyData?: { [key: string]: any };
  result: {
    lostData: boolean;
    message?: JSX.Element;
  };
}

const tests: Test[] = [
  {
    name: 'when none of the policies',
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'when browser policy is undefined',
    server: {
      authorizationEnabled: false,
      predefinedPolicy: null,
      customPolicy: null,
      policyData: null,
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'when policies are equal',
    server: {
      authorizationEnabled: false,
      predefinedPolicy: null,
      customPolicy: null,
      policyData: null,
    },
    browser: {
      authorizationEnabled: false,
      predefinedPolicy: null,
      customPolicy: null,
      policyData: null,
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'when policies are not equal',
    server: {
      authorizationEnabled: false,
      predefinedPolicy: null,
      customPolicy: null,
      policyData: null,
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    result: {
      lostData: true,
      message: (
        <span>
          You have some unsaved changes in your policy data.
          <br />
          <br />
          If you continue without saving, those changes will be lost.
        </span>
      ),
    },
  },
  {
    name: 'on disable authorization without changing data',
    action: PolicyChangeAction.OnDisableAuthorization,
    server: {
      authorizationEnabled: false,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'on disable authorization after changing data',
    action: PolicyChangeAction.OnDisableAuthorization,
    server: {
      authorizationEnabled: false,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1', 'user2'],
          },
        },
      }),
    },
    result: {
      lostData: true,
      message: (
        <span>
          You have some unsaved changes in your policy data.
          <br />
          <br />
          If you continue without saving, those changes will be lost.
        </span>
      ),
    },
  },
  {
    name: 'on change predefined policy without changing policy data',
    action: PolicyChangeAction.OnChangePredefinedPolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'on change predefined policy after changing policy data',
    action: PolicyChangeAction.OnChangePredefinedPolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1', 'user2'],
          },
        },
      }),
    },
    result: {
      lostData: true,
      message: (
        <span>
          You have some unsaved changes in your policy data.
          <br />
          <br />
          If you continue without saving, those changes will be lost.
        </span>
      ),
    },
  },
  {
    name: 'on switch from predefined to custom policy without changing data',
    action: PolicyChangeAction.OnSwitchFromPredefinedToCustomPolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'on switch from predefined to custom policy after changing data',
    action: PolicyChangeAction.OnSwitchFromPredefinedToCustomPolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1'],
          },
        },
      }),
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['user1', 'user2'],
          },
        },
      }),
    },
    result: {
      lostData: true,
      message: (
        <span>
          You have some unsaved changes in your policy data.
          <br />
          <br />
          If you continue without saving, those changes will be lost.
        </span>
      ),
    },
  },
  {
    name: 'on switch from predefined to custom policy when a predefined policy (no changes) is active but not saved',
    action: PolicyChangeAction.OnSwitchFromPredefinedToCustomPolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: null,
      policyData: null,
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['demo'],
          },
        },
      }),
    },
    predefinedPolicyData: {
      roles: {
        owner: {
          users: ['demo'],
        },
      },
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'on switch from custom to predefined policy without changing data',
    action: PolicyChangeAction.OnSwitchFromCustomToPredefinedPolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: '{}',
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: '{}',
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'on switch from custom to predefined policy with empty data but with a prev saved predefined policy',
    action: PolicyChangeAction.OnSwitchFromCustomToPredefinedPolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['demo'],
          },
        },
      }),
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: null,
      policyData: null,
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'on switch from custom to predefined policy after changing custom policy',
    action: PolicyChangeAction.OnSwitchFromCustomToPredefinedPolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: '{}',
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy 1',
      policyData: '{}',
    },
    result: {
      lostData: true,
      message: (
        <span>
          You have some unsaved changes in your policy data.
          <br />
          <br />
          If you continue without saving, those changes will be lost.
        </span>
      ),
    },
  },
  {
    name: 'on switch from custom to predefined policy after changing policy data',
    action: PolicyChangeAction.OnSwitchFromCustomToPredefinedPolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: '{}',
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['demo'],
          },
        },
      }),
    },
    result: {
      lostData: true,
      message: (
        <span>
          You have some unsaved changes in your policy data.
          <br />
          <br />
          If you continue without saving, those changes will be lost.
        </span>
      ),
    },
  },
  {
    name: 'on save after updating policy data',
    action: PolicyChangeAction.OnSavePolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: '{}',
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['demo'],
          },
        },
      }),
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'on save a custom policy after updating policy itself',
    action: PolicyChangeAction.OnSavePolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: '{}',
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy 1',
      policyData: '{}',
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'on save a predefined policy after updating policy data',
    action: PolicyChangeAction.OnSavePolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: '{}',
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: stringifyPolicyData({
        roles: {
          owner: {
            users: ['demo'],
          },
        },
      }),
    },
    result: {
      lostData: false,
      message: undefined,
    },
  },
  {
    name: 'on save a predefined policy with a prev saved custom policy',
    action: PolicyChangeAction.OnSavePolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: '{}',
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: '{}',
    },
    result: {
      lostData: true,
      message: (
        <span>
          Your custom policy and previous policy data will be lost.
          <br />
          <br />
          Are you sure you want to continue?
        </span>
      ),
    },
  },
  {
    name: 'on save a custom policy with a prev saved predefined policy',
    action: PolicyChangeAction.OnSavePolicy,
    server: {
      authorizationEnabled: true,
      predefinedPolicy: 'rbac.v1',
      customPolicy: null,
      policyData: '{}',
    },
    browser: {
      authorizationEnabled: true,
      predefinedPolicy: null,
      customPolicy: 'custom policy',
      policyData: '{}',
    },
    result: {
      lostData: true,
      message: (
        <span>
          Your selected predefined policy and previous policy data will be lost.
          <br />
          <br />
          Are you sure you want to continue?
        </span>
      ),
    },
  },
];

describe('checkUnsavedPolicyChanges', () => {
  for (let i = 0; i < tests.length; i++) {
    it(tests[i].name, () => {
      const actual = checkUnsavedPolicyChanges(
        tests[i].server,
        tests[i].browser,
        tests[i].action,
        tests[i].predefinedPolicyData
      );
      expect(actual).toStrictEqual(tests[i].result);
    });
  }
});
