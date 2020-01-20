import { useEffect, useState } from 'react'
import API from '../api';
import { PackageDetail } from '../types';

const useFetchPackageDetail = (id?: string, version?: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState<PackageDetail | null>(null);

  useEffect(() => {
    async function fetchPackageDetail() {
      try {
        setDetail(await API.getPackage(id, version));
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };
    fetchPackageDetail();
  }, [id, version]);

  return { detail, isLoading };
}

export default useFetchPackageDetail;
