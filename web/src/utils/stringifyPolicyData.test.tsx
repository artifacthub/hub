import stringifyPolicyData from './stringifyPolicyData';

interface Test {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  result: string;
}

const tests: Test[] = [
  {
    data: null,
    result: '',
  },
  {
    data: undefined,
    result: '',
  },
  {
    data: '',
    result: '',
  },
  {
    data: {},
    result: '{}',
  },
  {
    data: {
      roles: {
        owner: {
          users: ['demo'],
        },
        customRole1: {
          users: [],
          allowed_actions: [
            'addOrganizationMember',
            'addOrganizationRepository',
            'deleteOrganization',
            'deleteOrganizationMember',
            'deleteOrganizationRepository',
            'getAuthorizationPolicy',
            'transferOrganizationRepository',
            'updateAuthorizationPolicy',
            'updateOrganization',
            'updateOrganizationRepository',
          ],
        },
      },
    },
    result: `{
  "roles": {
    "owner": {
      "users": [
        "demo"
      ]
    },
    "customRole1": {
      "users": [],
      "allowed_actions": [
        "addOrganizationMember",
        "addOrganizationRepository",
        "deleteOrganization",
        "deleteOrganizationMember",
        "deleteOrganizationRepository",
        "getAuthorizationPolicy",
        "transferOrganizationRepository",
        "updateAuthorizationPolicy",
        "updateOrganization",
        "updateOrganizationRepository"
      ]
    }
  }
}`,
  },
  {
    data: {
      roles: {
        owner: {
          users: ['demo'],
        },
      },
    },
    result: `{
  "roles": {
    "owner": {
      "users": [
        "demo"
      ]
    }
  }
}`,
  },
];

describe('stringifyPolicyData', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns correct string', () => {
      const actual = stringifyPolicyData(tests[i].data);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
