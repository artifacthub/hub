import { useEffect, useState } from 'react'
import API from '../api';
import { Stats } from '../types';

const useFetchStats = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setStats(await API.getStats());
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  return { stats, isLoading };
}

export default useFetchStats;
