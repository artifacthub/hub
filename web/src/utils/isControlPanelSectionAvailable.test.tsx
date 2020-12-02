import isControlPanelSectionAvailable from './isControlPanelSectionAvailable';

interface Test {
  data: {
    context: 'user' | 'org';
    sectionToCheck?: string;
    subsectionToCheck?: string;
  };
  result: boolean;
}

const tests: Test[] = [
  {
    data: {
      context: 'user',
    },
    result: false,
  },
  {
    data: {
      context: 'user',
      sectionToCheck: 'repositories',
    },
    result: true,
  },
  {
    data: {
      context: 'org',
      sectionToCheck: 'repositories',
    },
    result: true,
  },
  {
    data: {
      context: 'user',
      sectionToCheck: 'organizations',
    },
    result: true,
  },
  {
    data: {
      context: 'org',
      sectionToCheck: 'organizations',
    },
    result: false,
  },
  {
    data: {
      context: 'user',
      sectionToCheck: 'members',
    },
    result: false,
  },
  {
    data: {
      context: 'org',
      sectionToCheck: 'members',
    },
    result: true,
  },
  {
    data: {
      context: 'user',
      sectionToCheck: 'settings',
    },
    result: true,
  },
  {
    data: {
      context: 'org',
      sectionToCheck: 'settings',
    },
    result: true,
  },
  {
    data: {
      context: 'user',
      sectionToCheck: 'settings',
      subsectionToCheck: 'profile',
    },
    result: true,
  },
  {
    data: {
      context: 'org',
      sectionToCheck: 'settings',
      subsectionToCheck: 'profile',
    },
    result: true,
  },
  {
    data: {
      context: 'user',
      sectionToCheck: 'settings',
      subsectionToCheck: 'subscriptions',
    },
    result: true,
  },
  {
    data: {
      context: 'org',
      sectionToCheck: 'settings',
      subsectionToCheck: 'subscriptions',
    },
    result: false,
  },
];

describe('isControlPanelSectionAvailable', () => {
  for (let i = 0; i < tests.length; i++) {
    it(`check if control panel path${tests[i].data.sectionToCheck ? ` \\${tests[i].data.sectionToCheck}` : ''}${
      tests[i].data.subsectionToCheck ? `\\${tests[i].data.subsectionToCheck}` : ''
    } for context ${tests[i].data.context} is available`, () => {
      const actual = isControlPanelSectionAvailable(
        tests[i].data.context,
        tests[i].data.sectionToCheck,
        tests[i].data.subsectionToCheck
      );
      expect(actual).toEqual(tests[i].result);
    });
  }
});
