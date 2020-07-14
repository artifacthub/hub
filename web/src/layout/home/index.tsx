import isNull from 'lodash/isNull';
import React, { useEffect, useState } from 'react';
import { FaGithub, FaSlack, FaTwitter } from 'react-icons/fa';
import { Link, useHistory } from 'react-router-dom';

import { API } from '../../api';
import { RepositoryKind, Stats } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import prepareQueryString from '../../utils/prepareQueryString';
import ExternalLink from '../common/ExternalLink';
import RepositoryIcon from '../common/RepositoryIcon';
import SearchBar from '../common/SearchBar';
import UserInvitation from '../controlPanel/members/UserInvitation';
import Counter from './Counter';
import styles from './HomeView.module.css';
import RandomPackages from './RandomPackages';
import SearchTip from './SearchTip';
import UserConfirmation from './UserConfirmation';

interface Props {
  isSearching: boolean;
  emailCode?: string;
  orgToConfirm?: string;
  onOauthFailed: boolean;
}

const HomeView = (props: Props) => {
  const history = useHistory();
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
    }
    fetchStats();
  }, []);

  useEffect(() => {
    if (props.onOauthFailed) {
      history.replace({
        pathname: '/',
        search: '',
      });
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'Authentication process failed. Please try again later.',
        autoClose: false,
      });
    }
  }, [props.onOauthFailed, history]);

  return (
    <div className={`d-flex flex-column flex-grow-1 ${styles.home}`}>
      <div className={`jumbotron mb-0 text-center ${styles.jumbotron}`}>
        <div role="heading" className={`display-4 text-center font-weight-light ${styles.mainTitle}`}>
          Find, install and publish
          <br />
          Kubernetes packages
        </div>

        <div className="mt-5 text-center">
          <SearchBar formClassName={`m-auto w-50 ${styles.search}`} size="big" isSearching={props.isSearching} />
          <SearchTip />

          <div className="d-inline-block d-md-none text-center mt-3">
            - or -
            <Link
              className="btn btn-link text-light font-weight-bold py-0 pb-1 pl-1"
              to={{
                pathname: '/packages/search',
              }}
            >
              <u>browse all packages</u>
            </Link>
          </div>

          <div className="d-none d-md-inline-block text-center mt-5">
            You can also{' '}
            <Link
              className="btn btn-link text-light font-weight-bold py-0 pb-1 pl-1"
              to={{
                pathname: '/packages/search',
              }}
            >
              <u>browse all packages</u>
            </Link>{' '}
            - or - <span className="ml-3">try one of the sample filters:</span>
          </div>

          <div className="d-none d-md-flex flex-row align-items-end justify-content-center flex-wrap">
            <Link
              data-testid="sampleFilter"
              className="badge badge-pill badge-secondary border border-light font-weight-normal mx-2 mt-3"
              to={{
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: 1,
                  tsQueryWeb: 'database',
                  filters: {
                    kind: ['3'],
                  },
                }),
              }}
            >
              OLM operators for databases
            </Link>
            <Link
              data-testid="sampleFilter"
              className="badge badge-pill badge-secondary border border-light font-weight-normal mx-2 mt-3"
              to={{
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: 1,
                  filters: {
                    kind: ['0'],
                    org: ['bitnami'],
                  },
                }),
              }}
            >
              Helm Charts provided by Bitnami
            </Link>
            <Link
              data-testid="sampleFilter"
              className="badge badge-pill badge-secondary border border-light font-weight-normal mx-2 mt-3"
              to={{
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: 1,
                  tsQueryWeb: 'etcd',
                  filters: {},
                }),
              }}
            >
              Packages of any kind related to etcd
            </Link>
          </div>
          <div className="d-none d-md-flex flex-row align-items-start justify-content-center flex-wrap">
            <Link
              data-testid="sampleFilter"
              className="badge badge-pill badge-secondary border border-light font-weight-normal mx-2 mt-3"
              to={{
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: 1,
                  tsQueryWeb: 'CVE',
                  filters: {
                    kind: ['1'],
                  },
                }),
              }}
            >
              Falco rules for CVE
            </Link>
            <Link
              data-testid="sampleFilter"
              className="badge badge-pill badge-secondary border border-light font-weight-normal mx-2 mt-3"
              to={{
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: 1,
                  tsQueryWeb: 'monitoring',
                  filters: {
                    kind: ['3'],
                  },
                }),
              }}
            >
              OLM operators in the monitoring category
            </Link>
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-center mt-4 mt-md-5">
          <Counter isLoading={isLoadingStats} value={isNull(stats) ? null : stats.packages} name="packages" />
          <div className={`mx-3 mx-md-5 ${styles.separator}`} />
          <Counter isLoading={isLoadingStats} value={isNull(stats) ? null : stats.releases} name="releases" />
        </div>

        <div className={`text-center h5 my-4 mt-md-5 ${styles.legend}`}>
          Artifact Hub is an <b>Open Source</b> project
        </div>

        <div className="mb-4 mb-md-2 text-center">
          <ExternalLink className={`btn btn-secondary ${styles.socialBtn}`} href="https://github.com/cncf/hub">
            <div className="d-flex align-items-center justify-content-center">
              <FaGithub className="mr-2" />
              GitHub
            </div>
          </ExternalLink>

          <ExternalLink
            className={`btn btn-secondary ml-2 ml-md-3 ${styles.socialBtn}`}
            href="https://cloud-native.slack.com/channels/artifact-hub"
          >
            <div className="d-flex align-items-center justify-content-center">
              <FaSlack className="mr-2" />
              Slack
            </div>
          </ExternalLink>

          <ExternalLink
            className={`btn btn-secondary ml-2 ml-md-3 ${styles.socialBtn}`}
            href="https://twitter.com/cncfartifacthub"
          >
            <div className="d-flex align-items-center justify-content-center">
              <FaTwitter className="mr-2" />
              Twitter
            </div>
          </ExternalLink>
        </div>
      </div>

      <RandomPackages />

      <div className={`py-5 text-light ${styles.about}`}>
        <div className="container py-0 py-md-5">
          <div className="text-center px-3 px-md-0">
            Artifact Hub is a web-based application that enables finding, installing, and publishing packages and
            configurations for CNCF projects. For example, this could include Helm charts, Falco configurations, Open
            Policy Agent (OPA) policies, and OLM operators.
            <div className="mx-3 mx-lg-5 my-4 my-lg-5 d-flex flex-row align-items-center justify-content-around">
              <RepositoryIcon kind={RepositoryKind.Helm} type="white" className={styles.aboutIcon} />
              <RepositoryIcon kind={RepositoryKind.Falco} type="white" className={styles.aboutIcon} />
              <RepositoryIcon kind={RepositoryKind.OPA} type="white" className={styles.aboutIcon} />
              <RepositoryIcon kind={RepositoryKind.OLM} type="white" className={styles.aboutIcon} />
            </div>
            Discovering artifacts to use with CNCF projects can be difficult. If every CNCF project that needs to share
            artifacts creates its own Hub this creates a fair amount of repeat work for each project and a fractured
            experience for those trying to find the artifacts to consume. The Artifact Hub attempts to solve that by
            providing a single experience for consumers that any CNCF project can leverage.
          </div>
        </div>
      </div>

      <div className={`py-5 text-secondary ${styles.extraInfo}`}>
        <div className="container py-0 py-md-5">
          <div className="text-center px-3 px-md-0">
            <img
              className={styles.logo}
              src="/static/media/cncf-sandbox-horizontal-color.png"
              alt="Logo CNCF sandbox project"
            />
            <div className="px-3 pt-4">
              Artifact Hub is a{' '}
              <ExternalLink href="https://www.cncf.io/sandbox-projects/" className="font-weight-bold text-primary">
                Cloud Native Computing Foundation
              </ExternalLink>{' '}
              sandbox project.
            </div>
          </div>
        </div>
      </div>

      <UserConfirmation emailCode={props.emailCode} />
      <UserInvitation orgToConfirm={props.orgToConfirm} />
    </div>
  );
};

export default HomeView;
