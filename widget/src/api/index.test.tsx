import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';

import { PackageSummary, SearchResults } from '../types';
import API from './index';
enableFetchMocks();

const getData = (fixtureId: string): object => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`) as object;
};

describe('API', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getPackage', () => {
    it('success', async () => {
      const packageItem = getData('1') as PackageSummary;
      fetchMock.mockResponse(JSON.stringify(packageItem), {
        headers: {
          'content-type': 'application/json',
        },
        status: 200,
      });

      const response = await API.getPackageInfo('https://localhost:8000', '/helm/artifact-hub/artifact-hub');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toEqual(
        'https://localhost:8000/api/v1/helm/artifact-hub/artifact-hub/summary'
      );
      expect(response).toEqual(API.toCamelCase(packageItem));
    });
  });

  describe('searchPackages', () => {
    it('success', async () => {
      const pkgs = getData('2') as SearchResults;
      fetchMock.mockResponse(JSON.stringify(pkgs), {
        headers: {
          'content-type': 'application/json',
        },
        status: 200,
      });

      const response = await API.searchPackages('https://localhost:8000', '');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toEqual(
        'https://localhost:8000/api/v1/packages/search?facets=false&limit=50&offset=0'
      );
      expect(response).toEqual(API.toCamelCase(pkgs));
    });

    it('success with querystring', async () => {
      const pkgs = getData('2') as SearchResults;
      fetchMock.mockResponse(JSON.stringify(pkgs), {
        headers: {
          'content-type': 'application/json',
        },
        status: 200,
      });

      const response = await API.searchPackages(
        'https://localhost:8000',
        '?page=1&ts_query=integration-and-delivery+%7C+monitoring'
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toEqual(
        'https://localhost:8000/api/v1/packages/search?ts_query=%28integration+%7C+delivery%29+%7C+%28monitoring%29&facets=false&limit=50&offset=0'
      );
      expect(response).toEqual(API.toCamelCase(pkgs));
    });
  });
});
