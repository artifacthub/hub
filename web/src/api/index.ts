import { SearchResults, PackageDetail, Stats } from '../types';
import fetchApi from '../utils/fetchApi';

let API_ROUTE = '/api/v1';
if (process.env.NODE_ENV === 'development') {
  API_ROUTE = `${process.env.REACT_APP_API_ENDPOINT}${API_ROUTE}`;
}

const API = {
  getPackage: (id?: string, version?: string): Promise<PackageDetail> => {
    return fetchApi(`${API_ROUTE}/package/${id}${version ? `/${version}` : ''}`);
  },
  searchPackages: (text: string): Promise<SearchResults> => {
    return fetchApi(`${API_ROUTE}/search?text=${encodeURIComponent(text)}`);
  },
  getStats: (): Promise<Stats> => {
    return fetchApi(`${API_ROUTE}/stats`);
  },
};

export default API;
