import isNull from 'lodash/isNull';
import React, { useEffect, useState } from 'react';
import { FaGithub, FaSlack, FaTwitter } from 'react-icons/fa';
import { Link, useHistory } from 'react-router-dom';

import { API } from '../../api';
import { RepositoryKind, Stats } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import ExternalLink from '../common/ExternalLink';
import RepositoryIcon from '../common/RepositoryIcon';
import SampleQueries from '../common/SampleQueries';
import SearchBar from '../common/SearchBar';
import UserInvitation from '../controlPanel/members/UserInvitation';
import Counter from './Counter';
import styles from './HomeView.module.css';
import RandomPackages from './RandomPackages';
import ResetPasswordModal from './ResetPasswordModal';
import SearchTip from './SearchTip';
import UserConfirmation from './UserConfirmation';

interface Props {
  isSearching: boolean;
  emailCode?: string;
  resetPwdCode?: string;
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
    <div className={`d-flex flex-column flex-grow-1 ${styles.home} home`}>
      <div className={`jumbotron mb-0 text-center ${styles.jumbotron}`}>
        <div
          role="heading"
          className={`display-4 text-center font-weight-light d-block d-xxl-flex justify-content-center ${styles.mainTitle}`}
        >
          <div>Find, install and publish</div>
          <div className={styles.secondLine}>Kubernetes packages</div>
        </div>

        <div className="mt-5 text-center">
          <SearchBar formClassName={`m-auto w-50 ${styles.search}`} size="big" isSearching={props.isSearching} />
          <SearchTip />

          <div className="d-inline-block d-md-none text-center mt-3">
            - or -
            <Link
              className="btn btn-link textLight font-weight-bold py-0 pb-1 pl-1"
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
              className="btn btn-link textLight font-weight-bold py-0 pb-1 pl-1"
              to={{
                pathname: '/packages/search',
              }}
            >
              <u>browse all packages</u>
            </Link>{' '}
            - or - <span className="ml-3">try one of the sample queries:</span>
          </div>

          <div className="d-none d-md-flex flex-row align-items-end justify-content-center flex-wrap">
            <SampleQueries lineBreakIn={3} className="badge-secondary border-light" />
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-center mt-4 mt-md-5">
          <Counter isLoading={isLoadingStats} value={isNull(stats) ? null : stats.packages} name="packages" />
          <div className={`mx-3 mx-md-5 separator ${styles.separator}`} />
          <Counter isLoading={isLoadingStats} value={isNull(stats) ? null : stats.releases} name="releases" />
        </div>

        <div className={`text-center h5 my-4 mt-md-5 ${styles.legend}`}>
          Artifact Hub is an <b>Open Source</b> project
        </div>

        <div className="d-flex flex-row align-items-center justify-content-center flex-wrap">
          <ExternalLink
            className={`btn btn-secondary mb-4 mb-md-2 ${styles.socialBtn}`}
            href="https://github.com/cncf/hub"
          >
            <div className="d-flex align-items-center justify-content-center">
              <FaGithub className="mr-2" />
              GitHub
            </div>
          </ExternalLink>

          <ExternalLink
            className={`btn btn-secondary ml-2 ml-md-3 mb-4 mb-md-2 ${styles.socialBtn}`}
            href="https://cloud-native.slack.com/channels/artifact-hub"
          >
            <div className="d-flex align-items-center justify-content-center">
              <FaSlack className="mr-2" />
              Slack
            </div>
          </ExternalLink>

          <ExternalLink
            className={`btn btn-secondary ml-2 ml-md-3 mb-4 mb-md-2 ${styles.socialBtn}`}
            href="https://twitter.com/cncfartifacthub"
          >
            <div className="d-flex align-items-center justify-content-center">
              <FaTwitter className="mr-2" />
              Twitter
            </div>
          </ExternalLink>
        </div>

        <div className={`text-center mx-3 mt-md-4 mb-4 ${styles.repoGuideText}`}>
          Please see the{' '}
          <ExternalLink
            className={`btn btn-link text-light font-weight-bold textLight p-0 ${styles.inlineLink}`}
            href="/docs/topics/repositories"
          >
            repositories guide
          </ExternalLink>{' '}
          for more information about how to list your content on Artifact Hub.
        </div>
      </div>

      <RandomPackages />

      <div className={`py-5 textLight ${styles.about}`}>
        <div className="container-lg px-4 px-sm-0 py-0 py-md-5">
          <div className="text-center px-3 px-xs-0">
            Artifact Hub is a web-based application that enables finding, installing, and publishing packages and
            configurations for CNCF projects. For example, this could include Helm charts and plugins, Falco
            configurations, Open Policy Agent (OPA) policies, OLM operators, Tinkerbell actions, kubectl plugins, Tekton
            tasks, KEDA scalers and CoreDNS plugins.
            <div className="mx-0 mx-md-3 mx-lg-5 my-4 my-sm-5 d-flex flex-row align-items-strecht justify-content-around">
              <ExternalLink href="https://helm.sh" className={`col ${styles.iconLink}`}>
                <div className="d-flex flex-column justify-content-between align-items-center h-100">
                  <RepositoryIcon kind={RepositoryKind.Helm} type="white" className={styles.aboutIcon} />
                  <div className={`d-none d-sm-block text-light ${styles.legendIcon}`}>
                    <small className="text-nowrap">Helm charts and plugins</small>
                  </div>
                </div>
              </ExternalLink>
              <ExternalLink href="https://falco.org" className={`col ${styles.iconLink}`}>
                <div className="d-flex flex-column justify-content-between align-items-center h-100">
                  <RepositoryIcon kind={RepositoryKind.Falco} type="white" className={styles.aboutIcon} />
                  <div className={`d-none d-sm-block text-light ${styles.legendIcon}`}>
                    <small>Falco rules</small>
                  </div>
                </div>
              </ExternalLink>
              <ExternalLink href="https://www.openpolicyagent.org" className={`col ${styles.iconLink}`}>
                <div className="d-flex flex-column justify-content-between align-items-center h-100">
                  <RepositoryIcon kind={RepositoryKind.OPA} type="white" className={styles.aboutIcon} />
                  <div className={`d-none d-sm-block text-light ${styles.legendIcon}`}>
                    <small>OPA policies</small>
                  </div>
                </div>
              </ExternalLink>
            </div>
            <div className="mx-0 mx-md-3 mx-lg-5 my-4 my-sm-5 d-flex flex-row align-items-strecht justify-content-around">
              <ExternalLink href="https://github.com/operator-framework" className={`col ${styles.iconLink}`}>
                <div className="d-flex flex-column justify-content-between align-items-center h-100">
                  <RepositoryIcon kind={RepositoryKind.OLM} type="white" className={styles.aboutIcon} />
                  <div className={`d-none d-sm-block text-light ${styles.legendIcon}`}>
                    <small>OLM operators</small>
                  </div>
                </div>
              </ExternalLink>
              <ExternalLink href="https://tinkerbell.org" className={`col ${styles.iconLink}`}>
                <div className="d-flex flex-column justify-content-between align-items-center h-100">
                  <RepositoryIcon kind={RepositoryKind.TBAction} type="white" className={styles.aboutIcon} />
                  <div className={`d-none d-sm-block text-light ${styles.legendIcon}`}>
                    <small>Tinkerbell actions</small>
                  </div>
                </div>
              </ExternalLink>
              <ExternalLink href="https://krew.sigs.k8s.io" className={`col ${styles.iconLink}`}>
                <div className="d-flex flex-column justify-content-between align-items-center h-100">
                  <RepositoryIcon kind={RepositoryKind.Krew} type="white" className={styles.aboutIcon} />
                  <div className={`d-none d-sm-block text-light ${styles.legendIcon}`}>
                    <small>Kubectl plugins</small>
                  </div>
                </div>
              </ExternalLink>
            </div>
            <div className="mx-0 mx-md-3 mx-lg-5 my-4 my-sm-5 d-flex flex-row align-items-strecht justify-content-around">
              <ExternalLink href="https://tekton.dev" className={`col ${styles.iconLink}`}>
                <div className="d-flex flex-column justify-content-between align-items-center h-100">
                  <RepositoryIcon kind={RepositoryKind.TektonTask} type="white" className={styles.aboutIcon} />
                  <div className={`d-none d-sm-block text-light ${styles.legendIcon}`}>
                    <small>Tekton tasks</small>
                  </div>
                </div>
              </ExternalLink>
              <ExternalLink href="https://keda.sh" className={`col ${styles.iconLink}`}>
                <div className="d-flex flex-column justify-content-between align-items-center h-100">
                  <RepositoryIcon kind={RepositoryKind.KedaScaler} type="white" className={styles.aboutIcon} />
                  <div className={`d-none d-sm-block text-light ${styles.legendIcon}`}>
                    <small>KEDA scalers</small>
                  </div>
                </div>
              </ExternalLink>
              <ExternalLink href="https://coredns.io" className={`col ${styles.iconLink}`}>
                <div className="d-flex flex-column justify-content-between align-items-center h-100">
                  <RepositoryIcon kind={RepositoryKind.CoreDNS} type="white" className={styles.aboutIcon} />
                  <div className={`d-none d-sm-block text-light ${styles.legendIcon}`}>
                    <small>CoreDNS plugins</small>
                  </div>
                </div>
              </ExternalLink>
            </div>
            Discovering artifacts to use with CNCF projects can be difficult. If every CNCF project that needs to share
            artifacts creates its own Hub this creates a fair amount of repeat work for each project and a fractured
            experience for those trying to find the artifacts to consume. The Artifact Hub attempts to solve that by
            providing a single experience for consumers that any CNCF project can leverage.
          </div>
        </div>
      </div>

      <div className={`py-5 text-secondary ${styles.extraInfo}`}>
        <div className="container-lg px-sm-4 px-lg-0 py-0 py-md-5">
          <div className="text-center px-4 px-xs-0">
            <img
              className={`${styles.logo} homeLogo`}
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
      <ResetPasswordModal code={props.resetPwdCode} />
    </div>
  );
};

export default HomeView;
