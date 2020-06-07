import history from './history';

jest.mock('./updateMetaIndex', () => jest.fn());

jest.mock('../analytics/analytics', () => ({
  page: jest.fn(),
}));

const mockAnalytics = require('../analytics/analytics');
const mockUpdateMeta = require('./updateMetaIndex');

describe('history', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls analytics and update meta', () => {
    history.push('/new-page');
    expect(mockAnalytics.page).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.page).toHaveBeenCalledWith();
    expect(mockUpdateMeta).toHaveBeenCalledTimes(1);
  });

  it('calls analytics, but not update meta when pathname starts with /packages/(chart|opa|falco)/', () => {
    history.push('/packages/chart/123');
    expect(mockAnalytics.page).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.page).toHaveBeenCalledWith();
    expect(mockUpdateMeta).toHaveBeenCalledTimes(0);
  });
});
