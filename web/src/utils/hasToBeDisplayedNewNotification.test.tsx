import hasToBeDisplayedNewNotification from './hasToBeDisplayedNewNotification';

interface Test {
  title: string;
  dateLimit: boolean;
  lastDisplayedTime: null | number;
  result: boolean;
}

const tests: Test[] = [
  {
    title: 'when dateLimit is false',
    dateLimit: false,
    lastDisplayedTime: null,
    result: true,
  },
  {
    title: 'when not previous notifications has been displayed',
    dateLimit: true,
    lastDisplayedTime: null,
    result: true,
  },
  {
    title: 'when 3 days ago',
    dateLimit: true,
    lastDisplayedTime: 1614078799000,
    result: true,
  },
  {
    title: 'when same day',
    dateLimit: true,
    lastDisplayedTime: 1614339168827,
    result: false,
  },
];

describe('hasToBeDisplayedNewNotification', () => {
  for (let i = 0; i < tests.length; i++) {
    it(`checks if has to be displayed - ${tests[i].title}`, () => {
      jest.spyOn(global.Date, 'now').mockImplementationOnce(() => 1614344598966);

      const actual = hasToBeDisplayedNewNotification(tests[i].dateLimit, tests[i].lastDisplayedTime);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
