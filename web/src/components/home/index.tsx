import React, { useEffect, useState, useCallback } from 'react';
import { FaGithub } from 'react-icons/fa';
import isNull from 'lodash/isNull';
import API from '../../api';
import { Stats } from '../../types';
import SearchBar from '../common/SearchBar';
import ExternalLink from '../common/ExternalLink';
import InfoSection from './InfoSection';
import Logo from './Logo';
import Content from './Content';
import styles from './Home.module.css';

interface Props {
  isVisible: boolean;
}

interface Cache {
  ts: number;
}

const EXPIRATION = 30 * 60 * 1000; // 30min

const Home = (props: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cachedStats, setCachedStats] = useState<Cache | null>(null);

  // shouldFetchData checks if cachedStats is empty or current cachedStats has expired.
  const shouldFetchData = useCallback(
    () => {
      return props.isVisible && (isNull(cachedStats) || cachedStats.ts + EXPIRATION < Date.now());
    },
    [cachedStats, props],
  );

  useEffect(() => {
    async function fetchStats() {
      try {
        if (shouldFetchData()) {
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
  }, [props.isVisible, shouldFetchData]);

  if (!props.isVisible) return null;

  return (
    <>
      <div className={`jumbotron text-center ${styles.jumbotron}`}>
        <h1 className="display-4 text-center font-weight-light">
          Find, install and publish
          <br />
          Kubernetes packages
        </h1>

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

        <div className="mt-5 text-center">
          <ExternalLink className="btn btn-secondary" href="https://github.com/tegioz/hub">
            <div className="d-flex align-items-center">
              <FaGithub className="mr-2" />
              GitHub
            </div>
          </ExternalLink>
        </div>
      </div>
      <Content />
      <Logo />
    </>
  );
}

export default Home;
