import React, { useEffect, useState } from 'react';
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
  isSearching: boolean;
}

const Home = (props: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [packagesUpdates, setPackagesUpdates] = useState<PackagesUpdatesInfo | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setStats(await API.getStats());
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchPackagesUpdates() {
      try {
        setPackagesUpdates(await API.getPackagesUpdates());
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackagesUpdates();
  }, []);

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
            isSearching={props.isSearching}
          />
        </div>

        <div className="d-flex align-items-center justify-content-center mt-5">
          <InfoSection isLoading={isLoading} stats={stats} type="packages" />
          <div className={`ml-5 mr-5 ${styles.separator}`} />
          <InfoSection isLoading={isLoading} stats={stats} type="releases" />
        </div>

        <div className="mt-5 mb-2 text-center">
          <ExternalLink className="btn btn-secondary" href="https://github.com/cncf/hub">
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
