import { PackagesList, PackageDetail } from '../types';
import fetchApi, {  } from '../utils/fetchApi';

const API_ROUTE = 'http://localhost:8000/api/v1/';

const API = {
  getPackage: (id?: string, version?: string): Promise<PackageDetail> => {
    return fetchApi(`${API_ROUTE}package/${id}${version ? `/${version}` : ''}`);
  },
  searchPackages: (q: string): Promise<PackagesList> => {
    return fetchApi(`${API_ROUTE}/search?q=${q}`);
  },
};

export default API;
