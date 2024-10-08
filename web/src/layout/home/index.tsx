import isNull from 'lodash/isNull';
import { useEffect, useState } from 'react';
import { FaGithub, FaSlack, FaTwitter } from 'react-icons/fa';
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';

import API from '../../api';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import { Banner as IBanner, OutletContext, RepositoryKind, Stats } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import bannerDispatcher from '../../utils/bannerDispatcher';
import getSampleQueries from '../../utils/getSampleQueries';
import isWhiteLabel from '../../utils/isWhiteLabel';
import scrollToTop from '../../utils/scrollToTop';
import ExternalLink from '../common/ExternalLink';
import RepositoryIcon from '../common/RepositoryIcon';
import SampleQueries from '../common/SampleQueries';
import SearchBar from '../common/SearchBar';
import SearchTipsModal from '../common/SearchTipsModal';
import UserInvitation from '../controlPanel/members/UserInvitation';
import Banner from '../package/Banner';
import AccountDeletion from './AccountDeletion';
import Counter from './Counter';
import styles from './HomeView.module.css';
import RandomPackages from './RandomPackages';
import ResetPasswordModal from './ResetPasswordModal';
import SearchTip from './SearchTip';
import UserConfirmation from './UserConfirmation';

const HomeView = () => {
  const point = useBreakpointDetect();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sampleQueries = getSampleQueries();
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [openTips, setOpenTips] = useState<boolean>(false);
  const [banner, setBanner] = useState<IBanner | null>(null);
  const { isSearching } = useOutletContext() as OutletContext;

  const whiteLabel = isWhiteLabel();

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

    async function getBanner() {
      try {
        const CNCFBanner = await bannerDispatcher.getBanner();
        setBanner(CNCFBanner);
      } catch {
        setBanner(null);
      }
    }

    scrollToTop(0, 'instant');
    fetchStats();
    getBanner();
  }, []);

  useEffect(() => {
    if (location.pathname === '/oauth-failed') {
      navigate(
        {
          pathname: '/',
          search: '',
        },
        { replace: true }
      );
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'Authentication process failed. Please try again later.',
        autoClose: false,
      });
    }
  }, [location]);

  return (
    <div className="d-flex flex-column flex-grow-1 bg-white home">
      <div className={`jumbotron mb-0 text-center border-0 ${styles.jumbotron}`}>
        <div
          role="banner"
          aria-label="Find, install and publisher Cloud Native packages"
          className={`display-4 text-center d-block d-xxl-flex justify-content-center noFocus ${styles.mainTitle}`}
          id="content"
          tabIndex={-1}
        >
          Find, install and publish
          <br />
          <span className={styles.secondLine}>Cloud Native packages</span>
        </div>

        <div className="mt-4 mt-sm-5 text-center">
          <SearchBar
            formClassName={`m-auto w-50 ${styles.search}`}
            size="big"
            isSearching={isSearching}
            openTips={openTips}
            setOpenTips={setOpenTips}
            autoFocus={location.pathname === '/' && location.search === ''}
          />
          <SearchTipsModal size="big" openTips={openTips} setOpenTips={setOpenTips} />
          <SearchTip />

          <div className="d-inline-block d-md-none text-center mt-3">
            - or -
            <Link
              className={`btn btn-link textLighter fw-semibold py-0 pb-1 ps-1 ${styles.allPkgBtn}`}
              to={{
                pathname: '/packages/search',
              }}
              aria-label="Browse all packages"
            >
              browse all packages
            </Link>
          </div>

          <div className="d-none d-md-inline-block text-center mt-5">
            {sampleQueries.length > 0 ? <>You can also </> : <>Or you can also </>}
            <Link
              className="btn btn-link textLighter fw-semibold py-0 pb-1 ps-1 pe-0"
              to={{
                pathname: '/packages/search',
              }}
              aria-label="Browse all packages"
            >
              browse all packages
            </Link>{' '}
            {sampleQueries.length > 0 ? (
              <span className="ms-3">
                - or - <span className="ms-3">try one of the sample queries:</span>
              </span>
            ) : (
              <>.</>
            )}
          </div>

          <div className="d-none d-md-flex flex-row align-items-end justify-content-center flex-wrap">
            <SampleQueries lineBreakIn={3} className="bg-secondary" />
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-center mt-4 mt-md-5">
          <Counter isLoading={isLoadingStats} value={isNull(stats) ? null : stats.packages} name="packages" />
          <div className={`mx-3 mx-md-5 separator ${styles.separator}`} />
          <Counter isLoading={isLoadingStats} value={isNull(stats) ? null : stats.releases} name="releases" />
        </div>

        {!isNull(banner) && (
          <Banner
            className={`${styles.banner} banner`}
            wrapperClassName="d-inline-block position-relative mt-4 mt-md-5"
            banner={banner}
            removeBanner={() => setBanner(null)}
            maxEqualRatio={point !== 'xs'}
          />
        )}

        {!whiteLabel && (
          <>
            <div className={`text-center h5 my-4 mt-md-5 ${styles.legend}`}>
              Artifact Hub is an <span className="fw-semibold">Open Source</span> project
            </div>

            <div className="d-flex flex-row align-items-center justify-content-center flex-wrap">
              <ExternalLink
                className={`btn btn-secondary mb-4 mb-md-2 ${styles.socialBtn}`}
                href="https://github.com/artifacthub/hub"
                label="Open GitHub link"
              >
                <div className="d-flex align-items-center justify-content-center">
                  <FaGithub className="me-2" />
                  GitHub
                </div>
              </ExternalLink>

              <ExternalLink
                className={`btn btn-secondary ms-2 ms-md-3 mb-4 mb-md-2 ${styles.socialBtn}`}
                href="https://cloud-native.slack.com/channels/artifact-hub"
                label="Open Slack channel"
              >
                <div className="d-flex align-items-center justify-content-center">
                  <FaSlack className="me-2" />
                  Slack
                </div>
              </ExternalLink>

              <ExternalLink
                className={`btn btn-secondary ms-2 ms-md-3 mb-4 mb-md-2 ${styles.socialBtn}`}
                href="https://twitter.com/cncfartifacthub"
                label="Open Twitter link"
              >
                <div className="d-flex align-items-center justify-content-center">
                  <FaTwitter className="me-2" />
                  Twitter
                </div>
              </ExternalLink>
            </div>

            <div className={`text-center mx-3 mt-md-4 mb-0 mb-sm-4 fw-light ${styles.repoGuideText}`}>
              Please see the{' '}
              <ExternalLink
                className={`btn btn-link text-light fw-semibold textLight p-0 align-baseline ${styles.inlineLink}`}
                href="/docs/topics/repositories"
                label="Open documentation"
              >
                repositories guide
              </ExternalLink>{' '}
              for more information about how to list your content on Artifact Hub.
            </div>
          </>
        )}
      </div>

      <RandomPackages />

      {!whiteLabel && (
        <>
          <div className={`py-5 textLight fs-4 fw-light ${styles.about}`}>
            <div className="container-lg px-4 px-sm-0 py-0 py-md-5">
              <div className="text-center px-3 px-xs-0">
                Artifact Hub is a web-based application that enables finding, installing, and publishing Cloud Native
                packages and configurations. For example, this could include Helm charts and plugins, Falco
                configurations, Open Policy Agent (OPA) and Gatekeeper policies, OLM operators, Tinkerbell actions,
                kubectl plugins, Tekton tasks, pipelines and stepactions, KEDA scalers, CoreDNS plugins, Keptn
                integrations, container images, Kubewarden policies, Kyverno policies, Knative client, Backstage
                plugins, Argo templates, KubeArmor policies, KCL modules, Headlamp plugins, Inspektor gadgets, Meshery
                designs, OpenCost plugins and Radius recipes.
                <div className="py-0 py-lg-5">
                  <div className="mx-0 mx-md-3 mx-lg-5 my-4 my-sm-5 d-flex flex-row align-items-stretch justify-content-around">
                    <ExternalLink
                      href="https://argoproj.github.io/argo-workflows/"
                      className={`col ${styles.iconLink}`}
                      label="Open Argo templates web"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.ArgoTemplate} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Argo templates</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://backstage.io/plugins"
                      className={`col ${styles.iconLink}`}
                      label="Open Backstage web"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.Backstage} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Backstage plugins</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://opencontainers.org"
                      className={`col ${styles.iconLink}`}
                      label="Open Container Initiative site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.Container} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Container images</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://coredns.io"
                      className={`col ${styles.iconLink}`}
                      label="Open CoreDNS site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.CoreDNS} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>CoreDNS plugins</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink href="https://falco.org" className={`col ${styles.iconLink}`} label="Open Falco site">
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.Falco} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Falco rules</small>
                        </div>
                      </div>
                    </ExternalLink>
                  </div>
                  <div className="mx-0 mx-md-3 mx-lg-5 my-4 my-sm-5 d-flex flex-row align-items-stretch justify-content-around">
                    <ExternalLink
                      href="https://headlamp.dev"
                      className={`col ${styles.iconLink}`}
                      label="Open Headlamp site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.Headlamp} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Headlamp plugins</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink href="https://helm.sh" className={`col ${styles.iconLink}`} label="Open Helm site">
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.Helm} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small className="text-nowrap">Helm charts and plugins</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://www.inspektor-gadget.io"
                      className={`col ${styles.iconLink}`}
                      label="Open Inspektor gadget site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon
                          kind={RepositoryKind.InspektorGadget}
                          type="white"
                          className={styles.aboutIcon}
                        />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Inspektor gadgets</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink href="https://kcl-lang.io" className={`col ${styles.iconLink}`} label="Open KCL site">
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.KCL} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>KCL modules</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink href="https://keda.sh" className={`col ${styles.iconLink}`} label="Open KEDA site">
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.KedaScaler} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>KEDA scalers</small>
                        </div>
                      </div>
                    </ExternalLink>
                  </div>
                  <div className="mx-0 mx-md-3 mx-lg-5 my-4 my-sm-5 d-flex flex-row align-items-stretch justify-content-around">
                    <ExternalLink href="https://keptn.sh" className={`col ${styles.iconLink}`} label="Open Keptn site">
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.Keptn} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Keptn integrations</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://github.com/knative/client"
                      className={`col ${styles.iconLink}`}
                      label="Open Knative client repository"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon
                          kind={RepositoryKind.KnativeClientPlugin}
                          type="white"
                          className={styles.aboutIcon}
                        />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Knative client plugins</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://krew.sigs.k8s.io"
                      className={`col ${styles.iconLink}`}
                      label="Open Krew site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.Krew} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Kubectl plugins</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://kubearmor.io"
                      className={`col ${styles.iconLink}`}
                      label="Open KubeArmor policies web"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.KubeArmor} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>KubeArmor policies</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://www.kubewarden.io"
                      className={`col ${styles.iconLink}`}
                      label="Open Kubewarden site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.Kubewarden} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Kubewarden policies</small>
                        </div>
                      </div>
                    </ExternalLink>
                  </div>
                  <div className="mx-0 mx-md-3 mx-lg-5 my-4 my-sm-5 d-flex flex-row align-items-stretch justify-content-around">
                    <ExternalLink
                      href="https://www.kyverno.io"
                      className={`col ${styles.iconLink}`}
                      label="Open Kubewarden site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.Kyverno} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Kyverno policies</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://meshery.io"
                      className={`col ${styles.iconLink}`}
                      label="Open Meshery site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.MesheryDesign} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Meshery designs</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://github.com/operator-framework"
                      className={`col ${styles.iconLink}`}
                      label="Open Operator framework site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.OLM} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>OLM operators</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://www.openpolicyagent.org"
                      className={`col ${styles.iconLink}`}
                      label="Open Policy Agent site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.OPA} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>OPA and Gatekeeper policies</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://www.opencost.io"
                      className={`col ${styles.iconLink}`}
                      label="Open Policy Agent site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.OpenCost} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>OpenCost plugins</small>
                        </div>
                      </div>
                    </ExternalLink>
                  </div>
                  <div className="mx-0 mx-md-3 mx-lg-5 my-4 my-sm-5 d-flex flex-row align-items-stretch justify-content-around">
                    <ExternalLink href="https://radapp.io" className={`col ${styles.iconLink}`} label="Radius site">
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.RadiusRecipe} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Radius recipes</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://tekton.dev"
                      className={`col ${styles.iconLink}`}
                      label="Open Tekton site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.TektonTask} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Tekton packages</small>
                        </div>
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      href="https://tinkerbell.org"
                      className={`col ${styles.iconLink}`}
                      label="Open Tinkerbell site"
                    >
                      <div className="d-flex flex-column justify-content-between align-items-center h-100">
                        <RepositoryIcon kind={RepositoryKind.TBAction} type="white" className={styles.aboutIcon} />
                        <div className={`d-none d-sm-block text-light mt-2 ${styles.legendIcon}`}>
                          <small>Tinkerbell actions</small>
                        </div>
                      </div>
                    </ExternalLink>
                  </div>
                </div>
                Discovering artifacts to use with CNCF projects can be difficult. If every CNCF project that needs to
                share artifacts creates its own Hub this creates a fair amount of repeat work for each project and a
                fractured experience for those trying to find the artifacts to consume. The Artifact Hub attempts to
                solve that by providing a single experience for consumers that any CNCF project can leverage.
              </div>
            </div>
          </div>
          <div className="py-5 text-dark fs-4 fw-light">
            <div className="container-lg px-sm-4 px-lg-0 py-0 py-md-5">
              <div className="d-flex flex-column justify-content-center px-4 px-xs-0">
                <img
                  className={`${styles.logo} ${styles.colorLogo} homeLogo`}
                  src="/static/media/cncf-incubating-color.svg"
                  alt="Logo CNCF incubating project"
                />
                <img
                  className={`${styles.logo} ${styles.whiteLogo} homeLogo`}
                  src="/static/media/cncf-incubating-white.svg"
                  alt="Logo CNCF incubating project"
                />
                <div className="px-3 pt-4 text-center w-100">
                  Artifact Hub is a{' '}
                  <ExternalLink
                    href="https://www.cncf.io/projects/"
                    className="fw-semibold text-dark"
                    label="Open CNCF projects site"
                  >
                    Cloud Native Computing Foundation
                  </ExternalLink>{' '}
                  incubating project.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <UserConfirmation emailCode={location.pathname === '/verify-email' ? searchParams.get('code') : undefined} />
      <AccountDeletion code={location.pathname === '/delete-user' ? searchParams.get('code') : undefined} />
      <UserInvitation orgToConfirm={location.pathname === '/accept-invitation' ? searchParams.get('org') : undefined} />
      <ResetPasswordModal code={location.pathname === '/reset-password' ? searchParams.get('code') : undefined} />
    </div>
  );
};

export default HomeView;
