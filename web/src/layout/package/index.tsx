import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import map from 'lodash/map';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FiDownload, FiPlus } from 'react-icons/fi';
import { IoIosArrowBack } from 'react-icons/io';
import { Link, useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNightBright } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { API } from '../../api';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import { Package, PackageKind, SearchFiltersURL } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import updateMetaIndex from '../../utils/updateMetaIndex';
import AnchorHeader from '../common/AnchorHeader';
import Image from '../common/Image';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import NoData from '../common/NoData';
import OrganizationInfo from '../common/OrganizationInfo';
import SignedBadge from '../common/SignedBadge';
import SubNavbar from '../navigation/SubNavbar';
import ChartInstall from './ChartInstall';
import Details from './Details';
import FalcoInstall from './FalcoInstall';
import ModalHeader from './ModalHeader';
import styles from './PackageView.module.css';
import Readme from './Readme';
import RelatedPackages from './RelatedPackages';
import StarButton from './StarButton';
import SubscriptionsButton from './SubscriptionsButton';

interface Props {
  isLoadingPackage: boolean;
  setIsLoadingPackage: Dispatch<SetStateAction<boolean>>;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  repoName: string;
  packageName: string;
  version?: string;
  packageKind?: string;
  hash?: string;
}

const PackageView = (props: Props) => {
  const history = useHistory();
  const [repoName, setRepoName] = useState(props.repoName);
  const [packageName, setPackageName] = useState(props.packageName);
  const [packageKind, setPackageKind] = useState(props.packageKind);
  const [version, setVersion] = useState(props.version);
  const [detail, setDetail] = useState<Package | null | undefined>(undefined);
  const { text, pageNumber, filters, deprecated } = props.searchUrlReferer || {};
  const { isLoadingPackage, setIsLoadingPackage } = props;
  const [apiError, setApiError] = useState<null | string>(null);

  useScrollRestorationFix();

  useEffect(() => {
    if (!isUndefined(props.packageName) && !isLoadingPackage) {
      setRepoName(props.repoName);
      setPackageName(props.packageName);
      setVersion(props.version);
      setPackageKind(props.packageKind);
    }
  }, [props, isLoadingPackage]);

  async function fetchPackageDetail() {
    try {
      const detail = await API.getPackage({
        repoName: repoName,
        packageName: packageName,
        version: version,
        packageKind: packageKind,
      });
      let metaTitle = `${detail.normalizedName} ${detail.version} · ${detail.userAlias || detail.organizationName}`;
      if (detail.chartRepository) {
        metaTitle += `/${detail.chartRepository.name}`;
      }
      updateMetaIndex(metaTitle, detail.description);
      setDetail(detail);
      setApiError(null);
      setIsLoadingPackage(false);
      window.scrollTo(0, 0); // Scroll to top when a new version is loaded
    } catch (err) {
      if (err.status !== 404) {
        setApiError('An error occurred getting this package, please try again later');
      }
      setDetail(null);
      setIsLoadingPackage(false);
    }
  }

  useEffect(() => {
    setIsLoadingPackage(true);
    fetchPackageDetail();
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [repoName, packageName, version, packageKind, setIsLoadingPackage]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    return () => {
      setIsLoadingPackage(false);
    };
  }, [setIsLoadingPackage]);

  const InstallationModal = (buttonIcon: boolean, buttonType?: string): JSX.Element | null => {
    // OPA policies doesn't have any installation modal info
    if (detail!.kind === PackageKind.Opa) {
      return null;
    }

    return (
      <Modal
        buttonType={buttonType}
        buttonContent={
          <>
            {buttonIcon ? <FiDownload className="mr-2" /> : undefined}
            <span>Install</span>
          </>
        }
        header={<ModalHeader package={detail!} />}
        className={styles.modalInstallationWrapper}
      >
        <>
          {(() => {
            switch (detail!.kind) {
              case PackageKind.Chart:
                return (
                  <ChartInstall name={detail!.name} version={detail!.version} repository={detail!.chartRepository!} />
                );
              case PackageKind.Falco:
                return <FalcoInstall normalizedName={detail!.normalizedName!} />;
              default:
                return null;
            }
          })()}
        </>
      </Modal>
    );
  };

  const getFalcoRules = (): string | undefined => {
    let rules: string | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.rules)
    ) {
      rules = map(detail.data.rules, 'raw').join(' ');
    }
    return rules;
  };

  const getOPAPolicies = (): string | undefined => {
    let policies: string | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.policies)
    ) {
      policies = map(detail.data.policies, 'raw').join(' ');
    }
    return policies;
  };

  const scrollIntoView = (id?: string) => {
    const elId = id || props.hash;
    if (!elId) return null;

    try {
      const element = document.querySelector(elId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });

        if (id) {
          history.replace({
            pathname: history.location.pathname,
            hash: elId,
          });
        }
      }
    } finally {
      return;
    }
  };

  return (
    <>
      {!isUndefined(props.searchUrlReferer) && (
        <SubNavbar>
          <button
            data-testid="goBack"
            className={`btn btn-link btn-sm pl-0 d-flex align-items-center ${styles.link}`}
            onClick={() => {
              history.push({
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: pageNumber || 1,
                  text: text,
                  filters: filters || {},
                  deprecated: deprecated || false,
                }),
                state: { fromDetail: true },
              });
            }}
          >
            <IoIosArrowBack className="mr-2" />
            {!isUndefined(text) ? (
              <>
                Back to "<span className="font-weight-bold">{text}</span>" results
              </>
            ) : (
              <>
                Back to
                <span className={`font-weight-bold ${styles.extraSpace}`}> search results</span>
              </>
            )}
          </button>
        </SubNavbar>
      )}

      {!isUndefined(props.fromStarredPage) && props.fromStarredPage && (
        <SubNavbar>
          <button
            data-testid="goBack"
            className={`btn btn-link btn-sm pl-0 d-flex align-items-center ${styles.link}`}
            onClick={() => {
              history.push({
                pathname: '/packages/starred',
                state: { fromDetail: true },
              });
            }}
          >
            <IoIosArrowBack className="mr-2" />
            <div>
              Back to <span className="font-weight-bold">starred packages</span>
            </div>
          </button>
        </SubNavbar>
      )}

      <div data-testid="mainPackage" className="position-relative flex-grow-1">
        {isLoadingPackage && <Loading />}

        {!isUndefined(detail) && (
          <>
            {!isNull(detail) && (
              <div className={`jumbotron ${styles.jumbotron}`}>
                <div className="container position-relative">
                  <div className="d-flex align-items-start w-100 mb-3">
                    <div className="d-flex align-items-center flex-grow-1 mw-100">
                      <div
                        className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper}`}
                      >
                        <Image
                          className={styles.image}
                          alt={detail.displayName || detail.name}
                          imageId={detail.logoImageId}
                        />
                      </div>

                      <div className="ml-3 text-truncate">
                        <div className={`d-flex flex-row align-items-center ${styles.titleWrapper}`}>
                          <div className="h3 mb-0 text-nowrap text-truncate">{detail.displayName || detail.name}</div>
                          {!isNull(detail.deprecated) && detail.deprecated && (
                            <div className={`badge badge-pill text-uppercase ml-2 mt-1 ${styles.deprecatedBadge}`}>
                              Deprecated
                            </div>
                          )}
                          <SignedBadge packageKind={detail.kind} signed={detail.signed} />
                        </div>

                        <div className="d-block d-md-none text-truncate w-100">
                          <span className={`text-dark d-inline-block text-truncate mw-100 ${styles.mobileVersion}`}>
                            {isNull(detail.userAlias) && (
                              <>{detail.organizationDisplayName || detail.organizationName}</>
                            )}
                            {!isNull(detail.userAlias) && <>{detail.userAlias}</>}
                            {(() => {
                              switch (detail.kind) {
                                case PackageKind.Chart:
                                  return (
                                    <>
                                      <span className="px-1">/</span>
                                      {detail.chartRepository!.displayName || detail.chartRepository!.name}
                                    </>
                                  );
                                default:
                                  return null;
                              }
                            })()}
                          </span>
                        </div>

                        <div className={`d-none d-md-flex flex-row mt-2 ${styles.subtitle}`}>
                          {!isUndefined(detail.organizationName) && detail.organizationName && (
                            <OrganizationInfo
                              className="mr-2"
                              labelClassName={styles.labelOrg}
                              organizationName={detail.organizationName}
                              organizationDisplayName={detail.organizationDisplayName}
                              deprecated={detail.deprecated}
                              visibleLegend
                            />
                          )}

                          {!isNull(detail.userAlias) && (
                            <div className="mr-2 text-truncate">
                              <small className="mr-1 text-uppercase text-muted">User: </small>

                              <Link
                                className="text-dark"
                                to={{
                                  pathname: '/packages/search',
                                  search: prepareQueryString({
                                    pageNumber: 1,
                                    filters: {
                                      user: [detail.userAlias],
                                    },
                                    deprecated: detail.deprecated || false,
                                  }),
                                }}
                              >
                                {detail.userAlias}
                              </Link>
                            </div>
                          )}

                          {(() => {
                            switch (detail.kind) {
                              case PackageKind.Chart:
                                return (
                                  <div className="text-truncate">
                                    <small className="mr-1 text-muted text-uppercase">Repo: </small>
                                    <Link
                                      className="text-dark"
                                      data-testid="repoLink"
                                      to={{
                                        pathname: '/packages/search',
                                        search: prepareQueryString({
                                          pageNumber: 1,
                                          filters: {
                                            repo: [detail.chartRepository!.name],
                                          },
                                          deprecated: false,
                                        }),
                                      }}
                                    >
                                      {detail.chartRepository!.displayName || detail.chartRepository!.name}
                                    </Link>
                                  </div>
                                );

                              default:
                                return null;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mb-0">{detail.description}</p>

                  <div className="d-flex align-items-center justify-content-between flex-wrap d-md-none">
                    <div className="d-flex mt-3">
                      <div className="mr-2">
                        <Modal
                          buttonType="btn-outline-secondary"
                          buttonContent={
                            <>
                              <FiPlus className="mr-2" />
                              <span>Info</span>
                            </>
                          }
                          header={<ModalHeader package={detail} />}
                          className={styles.wrapper}
                        >
                          <Details
                            package={detail}
                            searchUrlReferer={props.searchUrlReferer}
                            fromStarredPage={props.fromStarredPage}
                          />
                        </Modal>
                      </div>

                      <div>{InstallationModal(true, 'btn-outline-secondary')}</div>
                    </div>
                  </div>

                  <div className={`position-absolute d-flex flex-row ${styles.optsWrapper}`}>
                    <StarButton packageId={detail.packageId} />
                    <SubscriptionsButton packageId={detail.packageId} />
                  </div>
                </div>
              </div>
            )}

            <div className="container">
              {isNull(detail) && !isLoadingPackage ? (
                <NoData issuesLinkVisible={!isNull(apiError)}>
                  {isNull(apiError) ? <>Sorry, the package you requested was not found.</> : <>{apiError}</>}
                </NoData>
              ) : (
                <div className="row">
                  {!isNull(detail) && (
                    <>
                      <div className={styles.mainContent}>
                        {isNull(detail.readme) || isUndefined(detail.readme) ? (
                          <NoData>No README file available for this package</NoData>
                        ) : (
                          <Readme markdownContent={detail.readme} scrollIntoView={scrollIntoView} />
                        )}

                        {(() => {
                          switch (detail.kind) {
                            case PackageKind.Falco:
                              let rules: string | undefined = getFalcoRules();
                              return (
                                <>
                                  {!isUndefined(rules) && (
                                    <div className={`mb-5 ${styles.codeWrapper}`}>
                                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Rules" />
                                      <SyntaxHighlighter
                                        language="yaml"
                                        style={tomorrowNightBright}
                                        customStyle={{ padding: '1.5rem' }}
                                      >
                                        {rules}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                </>
                              );

                            case PackageKind.Opa:
                              let policies: string | undefined = getOPAPolicies();
                              return (
                                <>
                                  {!isUndefined(policies) && (
                                    <div className={`mb-5 ${styles.codeWrapper}`}>
                                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Policies" />
                                      <SyntaxHighlighter
                                        language="rego"
                                        style={tomorrowNightBright}
                                        customStyle={{ padding: '1.5rem' }}
                                      >
                                        {policies}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                </>
                              );

                            default:
                              return null;
                          }
                        })()}
                      </div>
                    </>
                  )}

                  <div className="col col-auto pl-5 pb-4 d-none d-md-block">
                    {!isNull(detail) && (
                      <>
                        {InstallationModal(false)}

                        <div className={`card shadow-sm position-relative ${styles.info}`}>
                          <div className="card-body">
                            <Details
                              package={detail}
                              searchUrlReferer={props.searchUrlReferer}
                              fromStarredPage={props.fromStarredPage}
                            />
                          </div>
                        </div>

                        <div className={styles.relatedPackagesWrapper}>
                          <RelatedPackages packageId={detail.packageId} name={detail.name} keywords={detail.keywords} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PackageView;
