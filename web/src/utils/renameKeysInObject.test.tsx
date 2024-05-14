import renameKeysInObject from './renameKeysInObject';

interface Test {
  obj: object;
  keys: {
    [key: string]: string;
  };
  result: object;
}

const tests: Test[] = [
  {
    obj: { last_name: 'ln', first_name: 'fn', alias: 'lf' },
    keys: { last_name: 'lastName', first_name: 'firstName' },
    result: { lastName: 'ln', firstName: 'fn', alias: 'lf' },
  },
  {
    obj: { user: { last_name: 'ln', first_name: 'fn' }, alias: 'lf' },
    keys: { last_name: 'lastName', first_name: 'firstName' },
    result: { alias: 'lf', user: { first_name: 'fn', last_name: 'ln' } },
  },
  {
    obj: {
      name: 'test',
      display_name: 'Test',
      description: 'Lorem ipsum...',
      home_url: 'https://test.org',
      confirmed: true,
      members_count: 2,
      logo_image_id: '123',
    },
    keys: {
      display_name: 'displayName',
      logo_image_id: 'logoImageId',
      home_url: 'homeUrl',
      members_count: 'membersCount',
    },
    result: {
      name: 'test',
      displayName: 'Test',
      description: 'Lorem ipsum...',
      homeUrl: 'https://test.org',
      confirmed: true,
      membersCount: 2,
      logoImageId: '123',
    },
  },
  {
    obj: { last_name: 'ln', first_name: 'fn', alias: 'lf' },
    keys: {},
    result: { last_name: 'ln', first_name: 'fn', alias: 'lf' },
  },
];

describe('renameKeysInObject', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper object', () => {
      const actual = renameKeysInObject(tests[i].obj, tests[i].keys);
      expect(actual).toStrictEqual(tests[i].result);
    });
  }
});
