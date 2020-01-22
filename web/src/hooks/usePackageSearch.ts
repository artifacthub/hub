import { useEffect, useState } from 'react'
import API from '../api';
import { PackagesList } from '../types';

const usePackageSearch = (text: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [packagesList, setPackages] = useState<PackagesList>({packages: []});

  useEffect(() => {
    async function fetchPackageDetail() {
      try {
        setPackages(await API.searchPackages(text || ''));
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };
    fetchPackageDetail();
  }, [text]);

  return { packages: packagesList.packages, isLoading };
}

export default usePackageSearch;
