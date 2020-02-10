import React, { useEffect, useState, useCallback } from 'react';
import { FaGithub } from 'react-icons/fa';
import isNull from 'lodash/isNull';
import API from '../../api';
import { Stats, PackagesUpdatesInfo } from '../../types';
import SearchBar from '../common/SearchBar';
import ExternalLink from '../common/ExternalLink';
import InfoSection from './InfoSection';
import Logo from './Logo';
import Updates from './Updates';
import styles from './Home.module.css';

interface Props {
  isVisible: boolean;
}

interface Cache {
  ts: number;
}

const EXPIRATION_STATS = 30 * 60 * 1000; // 30min
const EXPIRATION_UPDATES = 15 * 60 * 1000; //15 min

const Home = (props: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [packagesUpdates, setPackagesUpdates] = useState<PackagesUpdatesInfo | null>(null);
  const [cachedStats, setCachedStats] = useState<Cache | null>(null);
  const [cachedPackagesUpdates, setCachedPackagesUpdates] = useState<Cache | null>(null);

  // shouldFetchStatsData checks if cachedStats is empty or current cachedStats has expired.
  const shouldFetchStatsData = useCallback(
    () => {
      return props.isVisible && (isNull(cachedStats) || cachedStats.ts + EXPIRATION_STATS < Date.now());
    },
    [cachedStats, props],
  );

  // shouldFetchPackagesUpdatesData checks if cachedPackagesUpdates is empty or current cachedPackagesUpdates has expired.
  const shouldFetchPackagesUpdatesData = useCallback(
    () => {
      return props.isVisible && (isNull(cachedPackagesUpdates) || cachedPackagesUpdates.ts + EXPIRATION_UPDATES < Date.now());
    },
    [cachedPackagesUpdates, props],
  );

  useEffect(() => {
    async function fetchStats() {
      try {
        if (shouldFetchStatsData()) {
          setStats(await API.getStats());
          setCachedStats({
            ts: Date.now(),
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [props.isVisible, shouldFetchStatsData]);

  useEffect(() => {
    async function fetchPackagesUpdates() {
      try {
        if (shouldFetchPackagesUpdatesData()) {
          setPackagesUpdates(await API.getPackagesUpdates());
          setCachedPackagesUpdates({
            ts: Date.now(),
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackagesUpdates();
  }, [props.isVisible, shouldFetchPackagesUpdatesData]);

  if (!props.isVisible) return null;

  return (
    <>
      <div className={`jumbotron text-center ${styles.jumbotron}`}>
        <div className={`display-4 text-center font-weight-light ${styles.mainTitle}`}>
          Find, install and publish
          <br />
          Kubernetes packages
        </div>

        <div className="mt-5 text-center">
          <SearchBar
            formClassName={`m-auto w-50 ${styles.search}`}
            size="big"
          />
        </div>

        <div className="d-flex align-items-center justify-content-center mt-5">
          <InfoSection isLoading={isLoading} stats={stats} type="packages" />
          <div className={`ml-5 mr-5 ${styles.separator}`} />
          <InfoSection isLoading={isLoading} stats={stats} type="releases" />
        </div>

        <div className="mt-5 mb-2 text-center">
          <ExternalLink className="btn btn-secondary" href="https://github.com/tegioz/hub">
            <div className="d-flex align-items-center">
              <FaGithub className="mr-2" />
              GitHub
            </div>
          </ExternalLink>
        </div>
      </div>

      {!isNull(packagesUpdates) && (
        <Updates packages={packagesUpdates} />
      )}

      <Logo />
    </>
  );
}

export default Home;
