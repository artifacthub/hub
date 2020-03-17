import React, { useEffect, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import isNull from 'lodash/isNull';
import { API } from '../../api';
import { Stats } from '../../types';
import SearchBar from '../common/SearchBar';
import Counter from './Counter';
import PackagesUpdates from './PackagesUpdates';
import logo from '../../images/cncf.svg';
import ExternalLink from '../common/ExternalLink';
import UserConfirmation from './UserConfirmation';
import styles from './HomeView.module.css';

interface Props {
  isSearching: boolean;
  emailCode?: string;
}

const HomeView = (props: Props) => {
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setIsLoadingStats(true);
    async function fetchStats() {
      try {
        setStats(await API.getStats());
      } catch {
        setStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className={`d-flex flex-column flex-grow-1 ${styles.home}`}>
      <div className={`jumbotron mb-0 text-center ${styles.jumbotron}`}>
        <div role="heading" className={`display-4 text-center font-weight-light ${styles.mainTitle}`}>
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
          <Counter isLoading={isLoadingStats} value={isNull(stats) ? null : stats.packages} name="packages" />
          <div className={`ml-5 mr-5 ${styles.separator}`} />
          <Counter isLoading={isLoadingStats} value={isNull(stats) ? null : stats.releases} name="releases" />
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

      <PackagesUpdates />

      <div data-testid="CNCFInfo" className="text-center align-items-center justify-content-center pb-5 pt-5 d-flex flex-grow-1">
        <div>
          <img className={`${styles.logo} m-3`} src={logo} alt="Logo CNCF" />
          <div className="h5 px-3 pt-4">
            Artifact Hub aspires to be a <ExternalLink href="https://www.cncf.io/" className="font-weight-bold text-primary">Cloud Native Computing Foundation</ExternalLink> sandbox project.
          </div>
        </div>
      </div>

      <UserConfirmation
        emailCode={props.emailCode}
      />
    </div>
  );
}

export default HomeView;
