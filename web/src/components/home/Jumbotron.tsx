import React, { useEffect, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import API from '../../api';
import { Stats } from '../../types';
import SearchBar from '../common/SearchBar';
import ExternalLink from '../common/ExternalLink';
import styles from './Jumbotron.module.css';
import InfoSection from './InfoSection';

const Jumbotron = () => {
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

  return (
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
  );
};

export default Jumbotron;
