import isValidJSON from './isValidJSON';

interface Test {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
  result: boolean;
}

const tests: Test[] = [
  {
    json: null,
    result: true,
  },
  {
    json: '',
    result: false,
  },
  {
    json: undefined,
    result: false,
  },
  {
    json: `{
      "roles": {
        "owner": {
          "users": [
            "demo"
          ]
        }
      }
    }`,
    result: true,
  },
  {
    json: `{
      "roles": {
        "owner": {
          "users": [
            "demo",
          ]
        }
      }
    }`,
    result: false,
  },
  {
    json: `{
      "roles": {
        "owner": {
          "users": [
            "demo", user1"
          ]
        }
      }
    }`,
    result: false,
  },
  {
    json: `{
      "roles": {
        "owner": {
          "users": [
            "demo", "user1"
          ]
        }
      }
    }`,
    result: true,
  },
  {
    json: `text`,
    result: false,
  },
];

describe('isValidJSON', () => {
  for (let i = 0; i < tests.length; i++) {
    it('check if valid', () => {
      const actual = isValidJSON(tests[i].json);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
