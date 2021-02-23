import { Package } from '../types';

export default (pkg?: Package | null): boolean => {
  if (pkg && (pkg.repository.official || pkg.official)) {
    return true;
  }
  return false;
};
