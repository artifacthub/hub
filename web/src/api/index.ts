import { SearchResults, PackageDetail, Stats, SearchQuery, PackagesUpdatesInfo } from '../types';
import fetchApi from '../utils/fetchApi';
import getEndpointPrefix from '../utils/getEndpointPrefix';
import prepareFiltersQuery from '../utils/prepareFiltersQuery';

const API_ROUTE = `${getEndpointPrefix()}/api/v1`;

const API = {
  getPackage: (id?: string, version?: string): Promise<PackageDetail> => {
    return fetchApi(`${API_ROUTE}/package/${id}${version ? `/${version}` : ''}`);
  },
  searchPackages: (params: SearchQuery): Promise<SearchResults> => {
    return fetchApi(`${API_ROUTE}/search?facets=true&text=${encodeURIComponent(params.text!)}&limit=${params.limit}&offset=${params.offset}${prepareFiltersQuery(params.filters)}`);
  },
  getStats: (): Promise<Stats> => {
    return fetchApi(`${API_ROUTE}/stats`);
  },
  getPackagesUpdates: (): Promise<PackagesUpdatesInfo> => {
    return fetchApi(`${API_ROUTE}/updates`);
  },
};

export default API;
