import { PackagesList, PackageDetail, Stats } from '../types';
import fetchApi from '../utils/fetchApi';

console.log(process.env);

let API_ROUTE = '/api/v1';
if (process.env.NODE_ENV === 'development') {
  API_ROUTE = `${process.env.REACT_APP_API_ENDPOINT}${API_ROUTE}`;
}

const API = {
  getPackage: (id?: string, version?: string): Promise<PackageDetail> => {
    return fetchApi(`${API_ROUTE}/package/${id}${version ? `/${version}` : ''}`);
  },
  searchPackages: (q: string): Promise<PackagesList> => {
    return fetchApi(`${API_ROUTE}/search?q=${q}`);
  },
  getStats: (): Promise<Stats> => {
    return fetchApi(`${API_ROUTE}/stats`);
  },
};

export default API;
