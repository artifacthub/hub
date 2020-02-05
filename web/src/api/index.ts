import { SearchResults, PackageDetail, Stats, Filters, PackagesUpdatesInfo } from '../types';
import fetchApi from '../utils/fetchApi';
import prepareFiltersQuery from '../utils/prepareFiltersQuery';

let API_ROUTE = '/api/v1';
if (process.env.NODE_ENV === 'development') {
  API_ROUTE = `${process.env.REACT_APP_API_ENDPOINT}${API_ROUTE}`;
}

const API = {
  getPackage: (id?: string, version?: string): Promise<PackageDetail> => {
    return fetchApi(`${API_ROUTE}/package/${id}${version ? `/${version}` : ''}`);
  },
  searchPackages: (text: string, filters?: Filters): Promise<SearchResults> => {
    return fetchApi(`${API_ROUTE}/search?facets=true&text=${encodeURIComponent(text)}${prepareFiltersQuery(filters)}`);
  },
  getStats: (): Promise<Stats> => {
    return fetchApi(`${API_ROUTE}/stats`);
  },
  getPackagesUpdates: (): Promise<PackagesUpdatesInfo> => {
    return fetchApi(`${API_ROUTE}/updates`);
  },
};

export default API;
