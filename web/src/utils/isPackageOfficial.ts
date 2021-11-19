import { Package } from '../types';

const isPackageOfficial = (pkg?: Package | null): boolean => {
  if (pkg && (pkg.repository.official || pkg.official)) {
    return true;
  }
  return false;
};

export default isPackageOfficial;
