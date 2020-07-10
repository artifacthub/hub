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
import {
  CustomResourcesDefinition,
  CustomResourcesDefinitionExample,
  Package,
  RepositoryKind,
  SearchFiltersURL,
  Version,
} from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import sortPackageVersions from '../../utils/sortPackageVersions';
import updateMetaIndex from '../../utils/updateMetaIndex';
import AnchorHeader from '../common/AnchorHeader';
import Image from '../common/Image';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import NoData from '../common/NoData';
import OrganizationInfo from '../common/OrganizationInfo';
import RepositoryIcon from '../common/RepositoryIcon';
import SignedBadge from '../common/SignedBadge';
import SubNavbar from '../navigation/SubNavbar';
import CustomResourceDefinition from './CustomResourceDefinition';
import Details from './Details';
import FalcoInstall from './FalcoInstall';
import HelmInstall from './HelmInstall';
import ModalHeader from './ModalHeader';
import OLMInstall from './OLMInstall';
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
  packageName: string;
  version?: string;
  repositoryKind: string;
  repositoryName: string;
  hash?: string;
  channel?: string;
}

const PackageView = (props: Props) => {
  const history = useHistory();
  const [packageName, setPackageName] = useState(props.packageName);
  const [repositoryKind, setRepositoryKind] = useState(props.repositoryKind);
  const [repositoryName, setRepositoryName] = useState(props.repositoryName);
  const [version, setVersion] = useState(props.version);
  const [detail, setDetail] = useState<Package | null | undefined>(undefined);
  const { tsQueryWeb, pageNumber, filters, deprecated } = props.searchUrlReferer || {};
  const { isLoadingPackage, setIsLoadingPackage } = props;
  const [apiError, setApiError] = useState<null | string>(null);
  const [activeChannel, setActiveChannel] = useState<string | undefined>(props.channel);

  useScrollRestorationFix();

  useEffect(() => {
    if (!isUndefined(props.packageName) && !isLoadingPackage) {
      setPackageName(props.packageName);
      setVersion(props.version);
      setRepositoryKind(props.repositoryKind);
      setRepositoryName(props.repositoryName);
    }
  }, [props, isLoadingPackage]);

  async function fetchPackageDetail() {
    try {
      const detail = await API.getPackage({
        packageName: packageName,
        version: version,
        repositoryKind: repositoryKind,
        repositoryName: repositoryName,
      });
      let metaTitle = `${detail.normalizedName} ${detail.version} · ${
        detail.repository.userAlias || detail.repository.organizationName
      }/${detail.repository.name}`;
      updateMetaIndex(metaTitle, detail.description);
      setDetail(detail);
      if (isUndefined(activeChannel) && detail.repository.kind === RepositoryKind.OLM) {
        if (!isNull(detail.defaultChannel)) {
          setActiveChannel(detail.defaultChannel);
        } else if (detail.channels && detail.channels.length > 0) {
          setActiveChannel(detail.channels[0].name);
        }
      }
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
  }, [packageName, version, repositoryName, repositoryKind, setIsLoadingPackage]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    return () => {
      setIsLoadingPackage(false);
    };
  }, [setIsLoadingPackage]);

  let sortedVersions: Version[] = [];
  if (detail && detail.availableVersions) {
    sortedVersions = sortPackageVersions(detail.availableVersions);
  }

  const onChannelChange = (channel: string) => {
    history.replace({
      search: `?channel=${channel}`,
    });
    setActiveChannel(channel);
  };

  const InstallationModal = (buttonIcon: boolean, buttonType?: string): JSX.Element | null => {
    // OPA policies doesn't have any installation modal info
    if (
      isNull(detail) ||
      isUndefined(detail) ||
      detail!.repository.kind === RepositoryKind.OPA ||
      (detail.repository.kind === RepositoryKind.OLM && detail.repository.name !== 'community-operators')
    ) {
      return null;
    }

    const isDisabled =
      detail.repository.kind === RepositoryKind.OLM &&
      sortedVersions.length > 0 &&
      detail!.version !== sortedVersions[0].version;

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
        disabledOpenBtn={isDisabled}
        tooltipMessage={isDisabled ? 'Only the current version can be installed' : undefined}
      >
        <>
          {(() => {
            switch (detail!.repository.kind) {
              case RepositoryKind.Helm:
                return <HelmInstall name={detail.name} version={detail.version} repository={detail.repository} />;
              case RepositoryKind.Falco:
                return <FalcoInstall normalizedName={detail.normalizedName!} />;
              case RepositoryKind.OLM:
                return (
                  <OLMInstall
                    name={detail.name}
                    activeChannel={activeChannel!}
                    isGlobalOperator={detail.data!.isGlobalOperator}
                  />
                );
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

  const getOLMResources = (): CustomResourcesDefinition[] | undefined => {
    let resources: CustomResourcesDefinition[] | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.customResourcesDefinitions)
    ) {
      let examples: CustomResourcesDefinitionExample[] = [];
      if (
        !isUndefined(detail.data.customResourcesDefinitionsExamples) &&
        detail.data.customResourcesDefinitionsExamples !== ''
      ) {
        examples = JSON.parse(detail.data.customResourcesDefinitionsExamples!) as CustomResourcesDefinitionExample[];
      }
      resources = detail.data.customResourcesDefinitions.map((resourceDefinition: CustomResourcesDefinition) => {
        return {
          ...resourceDefinition,
          example: examples.find((info: any) => info.kind === resourceDefinition.kind),
        };
      });
    }
    return resources;
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
                  tsQueryWeb: tsQueryWeb,
                  filters: filters || {},
                  deprecated: deprecated || false,
                }),
                state: { fromDetail: true },
              });
            }}
          >
            <IoIosArrowBack className="mr-2" />
            {!isUndefined(tsQueryWeb) ? (
              <>
                Back to "<span className="font-weight-bold">{tsQueryWeb}</span>" results
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
                            <div className={`badge badge-pill text-uppercase ml-3 mt-1 ${styles.deprecatedBadge}`}>
                              Deprecated
                            </div>
                          )}
                          <SignedBadge
                            repositoryKind={detail.repository.kind}
                            signed={detail.signed}
                            className="ml-3 mt-1"
                          />
                        </div>

                        <div className="d-block d-md-none text-truncate w-100">
                          <span className={`text-dark d-inline-block text-truncate mw-100 ${styles.mobileVersion}`}>
                            {detail.repository.userAlias ||
                              detail.repository.organizationDisplayName ||
                              detail.repository.organizationName}
                            <span className="px-1">/</span>
                            <RepositoryIcon kind={detail.repository.kind} className={`mr-1 ${styles.repoIcon}`} />
                            {detail.repository.displayName || detail.repository.name}
                          </span>
                        </div>

                        <div className={`d-none d-md-flex flex-row mt-2 ${styles.subtitle}`}>
                          {!isNull(detail.repository.userAlias) ? (
                            <div className="mr-2 text-truncate">
                              <small className="mr-1 text-uppercase text-muted">User: </small>

                              <Link
                                className="text-dark"
                                to={{
                                  pathname: '/packages/search',
                                  search: prepareQueryString({
                                    pageNumber: 1,
                                    filters: {
                                      user: [detail.repository.userAlias!],
                                    },
                                    deprecated: detail.deprecated || false,
                                  }),
                                }}
                              >
                                {detail.repository.userAlias}
                              </Link>
                            </div>
                          ) : (
                            <OrganizationInfo
                              className="mr-2"
                              labelClassName={styles.labelOrg}
                              organizationName={detail.repository.organizationName!}
                              organizationDisplayName={detail.repository.organizationDisplayName}
                              deprecated={detail.deprecated}
                              visibleLegend
                            />
                          )}

                          <div className="text-truncate">
                            <small className="mr-1 text-muted text-uppercase">Repo: </small>
                            <RepositoryIcon kind={detail.repository.kind} className={`mr-1 ${styles.repoIcon}`} />
                            <Link
                              className="text-dark"
                              data-testid="repoLink"
                              to={{
                                pathname: '/packages/search',
                                search: prepareQueryString({
                                  pageNumber: 1,
                                  filters: {
                                    repo: [detail.repository.name],
                                  },
                                  deprecated: false,
                                }),
                              }}
                            >
                              {detail.repository.displayName || detail.repository.name}
                            </Link>
                          </div>
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
                            activeChannel={activeChannel}
                            onChannelChange={onChannelChange}
                            sortedVersions={sortedVersions}
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
                          <Readme
                            packageName={detail.displayName || detail.name}
                            markdownContent={detail.readme}
                            scrollIntoView={scrollIntoView}
                          />
                        )}

                        {(() => {
                          switch (detail.repository.kind) {
                            case RepositoryKind.Falco:
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

                            case RepositoryKind.OPA:
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

                            case RepositoryKind.OLM:
                              const resources = getOLMResources();
                              if (!isUndefined(resources) && resources.length > 0) {
                                return (
                                  <div className={`mb-5 ${styles.codeWrapper}`}>
                                    <AnchorHeader
                                      level={2}
                                      scrollIntoView={scrollIntoView}
                                      title="Custom Resource Definitions"
                                    />

                                    <CustomResourceDefinition resources={resources} />
                                  </div>
                                );
                              } else {
                                return null;
                              }

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
                              activeChannel={activeChannel}
                              onChannelChange={onChannelChange}
                              sortedVersions={sortedVersions}
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
