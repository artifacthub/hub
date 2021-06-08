import prepareRegoPolicyForPlayground from './prepareRegoPolicyForPlayground';

const regoData = {
  roles: {
    owner: { users: ['user1'] },
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
};

const policy = `package artifacthub.authz

# Get user allowed actions
allowed_actions[action] {
  # Owner can perform all actions
  user_roles[_] == "owner"
  action := "all"
}
allowed_actions[action] {
  # Users can perform actions allowed for their roles
  action := data.roles[role].allowed_actions[_]
  user_roles[_] == role
}

# Get user roles
user_roles[role] {
  data.roles[role].users[_] == input.user
}`;

const result = {
  data: {
    roles: {
      customRole1: {
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
        users: [],
      },
      owner: { users: ['user1'] },
    },
  },
  input: { user: 'user1' },
  rego_modules: {
    'policy.rego': `package artifacthub.authz

# Get user allowed actions
allowed_actions[action] {
  # Owner can perform all actions
  user_roles[_] == "owner"
  action := "all"
}
allowed_actions[action] {
  # Users can perform actions allowed for their roles
  action := data.roles[role].allowed_actions[_]
  user_roles[_] == role
}

# Get user roles
user_roles[role] {
  data.roles[role].users[_] == input.user
}`,
  },
};

describe('prepareRegoPolicyForPlayground', () => {
  it('returns correct content', () => {
    const actual = prepareRegoPolicyForPlayground(policy, regoData, 'user1');
    expect(actual).toStrictEqual(result);
  });
});
