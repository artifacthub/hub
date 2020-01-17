import React from 'react';
import SearchBar from '../common/SearchBar';
import { FiPackage } from 'react-icons/fi';
import styles from './Jumbotron.module.css';

const Jumbotron = () => {
  return (
    <div className={`jumbotron text-center ${styles.jumbotron}`}>
      <div className="d-flex align-items-center justify-content-center display-4 mb-3">
        <FiPackage className="mr-2" />
        <h1 className="display-4 font-weight-bold">CNCF Hub</h1>
      </div>
      <h3>Discover & launch great Kubernetes-ready apps</h3>
      <div className="mt-5 text-center">
        <SearchBar
          formClassName={`m-auto w-50 ${styles.search}`}
          size="big"
        />
      </div>
    </div>
  );
};

export default Jumbotron;
