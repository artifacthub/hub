import React from 'react';
import { FaGithub } from 'react-icons/fa';
import isNull from 'lodash/isNull';
import SearchBar from '../common/SearchBar';
import useFetchStats from '../../hooks/useFetchStats';
import CountUpNumber from './CountUpNumber';
import ExternalLink from '../common/ExternalLink';
import styles from './Jumbotron.module.css';

const Jumbotron = () => {
  const { stats, isLoading } = useFetchStats();

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
        <div className={`text-center ${styles.counterWrapper}`}>
          {isNull(stats) ? (
            <h3><div className="spinner-grow text-primary" /></h3>
          ) : (
            <CountUpNumber number={stats.packages} />
          )}
          <small className="text-uppercase">Packages</small>
        </div>

        <div className={`ml-5 mr-5 ${styles.separator}`} />

        <div className={`text-center ${styles.counterWrapper}`}>
          {isNull(stats) ? (
            <h3><div className="spinner-grow text-primary" /></h3>
          ) : (
            <CountUpNumber number={stats.releases} />
          )}
          <small className="text-uppercase">Releases</small>
        </div>
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
