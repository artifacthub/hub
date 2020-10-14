import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import map from 'lodash/map';
import moment from 'moment';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { AiOutlineStop } from 'react-icons/ai';
import { FiDownload, FiPlus } from 'react-icons/fi';
import { IoIosArrowBack } from 'react-icons/io';
import { Link, useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { API } from '../../api';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import {
  CustomResourcesDefinition,
  CustomResourcesDefinitionExample,
  ErrorKind,
  OPAPolicies,
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
import Label from '../common/Label';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import NoData from '../common/NoData';
import OfficialBadge from '../common/OfficialBadge';
import OrganizationInfo from '../common/OrganizationInfo';
import RepositoryIcon from '../common/RepositoryIcon';
import RepositoryInfo from '../common/RepositoryInfo';
import SignedBadge from '../common/SignedBadge';
import VerifiedPublisherBadge from '../common/VerifiedPublisherBadge';
import SubNavbar from '../navigation/SubNavbar';
import CustomResourceDefinition from './CustomResourceDefinition';
import Details from './Details';
import FalcoInstall from './FalcoInstall';
import HelmInstall from './HelmInstall';
import ModalHeader from './ModalHeader';
import OLMInstall from './OLMInstall';
import OPAInstall from './OPAInstall';
import OPAPoliciesList from './OPAPoliciesList';
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
  const { tsQueryWeb, tsQuery, pageNumber, filters, deprecated, operators, verifiedPublisher, official } =
    props.searchUrlReferer || {};
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
      window.scrollTo(0, 0); // Scroll to top when a new version is loaded
      setIsLoadingPackage(false);
    } catch (err) {
      if (err.kind === ErrorKind.NotFound) {
        setApiError('Sorry, the package you requested was not found.');
      } else if (!isUndefined(err.message)) {
        setApiError(err.message);
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

  const InstallationModal = (buttonType?: string): JSX.Element | null => {
    if (
      isNull(detail) ||
      isUndefined(detail) ||
      (detail!.repository.kind === RepositoryKind.OPA && (isUndefined(detail.install) || isNull(detail.install))) ||
      (detail.repository.kind === RepositoryKind.OLM && detail.repository.name !== 'community-operators')
    ) {
      return <div className="pt-2" />;
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
            <FiDownload className="mr-2" />
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
              case RepositoryKind.OPA:
                return <OPAInstall install={detail.install} />;
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

  const getOPAPolicies = (): OPAPolicies | undefined => {
    let policies: OPAPolicies | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.policies)
    ) {
      policies = detail.data.policies;
    }
    return policies;
  };

  const getOLMResources = (): CustomResourcesDefinition[] | undefined => {
    let resources: CustomResourcesDefinition[] | undefined;
    let examples: CustomResourcesDefinitionExample[] = [];

    if (detail && detail.crds) {
      if (detail.crdsExamples) {
        examples = detail.crdsExamples;
      }
      resources = detail.crds.map((resourceDefinition: CustomResourcesDefinition) => {
        return {
          ...resourceDefinition,
          example: examples.find((info: any) => info.kind === resourceDefinition.kind),
        };
      });
    } else if (detail && detail.data && detail.data.customResourcesDefinitions) {
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

  const getHelmCRDs = (): CustomResourcesDefinition[] | undefined => {
    let resources: CustomResourcesDefinition[] | undefined;
    if (detail && detail.crds) {
      let examples: CustomResourcesDefinitionExample[] = detail.crdsExamples || [];
      resources = detail.crds.map((resourceDefinition: CustomResourcesDefinition) => {
        return {
          ...resourceDefinition,
          example: examples.find((info: any) => info.kind === resourceDefinition.kind),
        };
      });
    }
    return resources;
  };

  const getCRDsCards = (resources: CustomResourcesDefinition[] | undefined): JSX.Element | null => {
    if (!isUndefined(resources) && resources.length > 0) {
      return (
        <div className={`mb-5 ${styles.codeWrapper}`}>
          <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Custom Resource Definitions" />

          <CustomResourceDefinition resources={resources} />
        </div>
      );
    } else {
      return null;
    }
  };

  const getBadges = (withRepoInfo: boolean, extraStyle?: string): JSX.Element => (
    <>
      {withRepoInfo && (
        <>
          <OfficialBadge official={detail!.repository.official} className={`d-inline mr-3 ${extraStyle}`} />
          <VerifiedPublisherBadge
            verifiedPublisher={detail!.repository.verifiedPublisher}
            className={`d-inline mr-3 ${extraStyle}`}
          />
        </>
      )}
      {detail!.deprecated && (
        <Label
          text="Deprecated"
          icon={<AiOutlineStop />}
          labelStyle="danger"
          className={`d-inline mr-3 ${extraStyle}`}
        />
      )}
      <SignedBadge
        repositoryKind={detail!.repository.kind}
        signed={detail!.signed}
        className={`d-inline ${extraStyle}`}
      />
    </>
  );

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

  const createdAt = () => (
    <span className={`d-block d-md-none text-muted text-nowrap ${styles.date}`}>
      Updated {moment(detail!.createdAt * 1000).fromNow()}
    </span>
  );

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
                  tsQuery: tsQuery,
                  filters: filters || {},
                  deprecated: deprecated,
                  operators: operators,
                  verifiedPublisher: verifiedPublisher,
                  official: official,
                }),
                state: { fromDetail: true },
              });
            }}
          >
            <IoIosArrowBack className="mr-2" />
            {tsQueryWeb ? (
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
        {isLoadingPackage && <Loading className="position-fixed" />}

        {!isUndefined(detail) && (
          <>
            {!isNull(detail) && (
              <div className={`jumbotron package-detail-jumbotron ${styles.jumbotron}`}>
                <div className="container position-relative">
                  <div className="d-flex align-items-start w-100 mb-3">
                    <div className="d-flex align-items-center flex-grow-1 mw-100">
                      <div
                        className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper} imageWrapper`}
                      >
                        <Image
                          className={styles.image}
                          alt={detail.displayName || detail.name}
                          imageId={detail.logoImageId}
                          kind={detail.repository.kind}
                        />
                      </div>

                      <div className={`ml-3 flex-grow-1 ${styles.wrapperWithContentEllipsis}`}>
                        <div className={`d-flex flex-row align-items-center ${styles.titleWrapper}`}>
                          <div className={`h3 mb-0 text-nowrap text-truncate ${styles.title}`}>
                            {detail.displayName || detail.name}
                          </div>
                          <div className="d-none d-md-flex ml-3">{getBadges(false, 'mt-1')}</div>
                        </div>

                        <div className={`d-flex d-md-none text-truncate mt-2 w-100 ${styles.mobileSubtitle}`}>
                          <small className="text-muted text-uppercase">Repo: </small>
                          <div className={`mx-1 d-inline ${styles.mobileIcon}`}>
                            <RepositoryIcon kind={detail.repository.kind} className={styles.repoIcon} />
                          </div>
                          <span className={`text-dark d-inline-block text-truncate mw-100 ${styles.mobileVersion}`}>
                            {detail.repository.displayName || detail.repository.name}
                          </span>
                        </div>

                        <div className={`d-none d-md-flex flex-row align-items-baseline mt-2 ${styles.subtitle}`}>
                          {!isNull(detail.repository.userAlias) ? (
                            <div className={`mr-2 text-truncate ${styles.mw50}`}>
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
                                    operators: detail.isOperator || false,
                                    verifiedPublisher: detail.repository.verifiedPublisher || false,
                                    official: detail.repository.official || false,
                                  }),
                                }}
                              >
                                {detail.repository.userAlias}
                              </Link>
                            </div>
                          ) : (
                            <OrganizationInfo
                              className={`mr-2 text-truncate d-flex flex-row align-items-baseline ${styles.mw50}`}
                              organizationName={detail.repository.organizationName!}
                              organizationDisplayName={detail.repository.organizationDisplayName}
                              deprecated={detail.deprecated}
                              visibleLegend
                            />
                          )}

                          <RepositoryInfo
                            repository={detail.repository}
                            deprecated={detail.deprecated}
                            className={`text-truncate d-flex flex-row align-items-baseline ${styles.mw50}`}
                            repoLabelClassName={styles.repoLabel}
                            visibleInfoIcon
                            visibleIcon
                            withLabels
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className={`mb-0 ${styles.description}`}>{detail.description}</p>

                  <div className="d-flex flex-wrap d-md-none">{getBadges(true, 'mt-3 mt-md-0')}</div>

                  <div className={`position-absolute d-flex flex-row align-items-center ${styles.optsWrapper}`}>
                    {createdAt()}
                    <StarButton packageId={detail.packageId} />
                    <SubscriptionsButton packageId={detail.packageId} />
                  </div>

                  <div className="d-flex align-items-center justify-content-between flex-wrap d-md-none">
                    <div className="d-flex w-100 mt-3">
                      <div className="pr-1 w-50">
                        <Modal
                          buttonType="btn-outline-secondary btn-sm"
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

                      <div className="pl-1 w-50">{InstallationModal('btn-outline-secondary btn-sm')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="container">
              {isNull(detail) && !isLoadingPackage ? (
                <NoData issuesLinkVisible={!isNull(apiError)}>
                  {isNull(apiError) ? (
                    <>An error occurred getting this package, please try again later.</>
                  ) : (
                    <>{apiError}</>
                  )}
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
                                        style={tomorrowNight}
                                        customStyle={{ padding: '1.5rem' }}
                                      >
                                        {rules}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                </>
                              );

                            case RepositoryKind.OPA:
                              let policies: OPAPolicies | undefined = getOPAPolicies();
                              return (
                                <>
                                  {!isUndefined(policies) && (
                                    <div className={`mb-5 ${styles.codeWrapper}`}>
                                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Policies files" />
                                      <OPAPoliciesList policies={policies} />
                                    </div>
                                  )}
                                </>
                              );

                            case RepositoryKind.Helm:
                              return getCRDsCards(getHelmCRDs());

                            case RepositoryKind.OLM:
                              return getCRDsCards(getOLMResources());

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
                        {InstallationModal()}

                        <div className={`card shadow-sm position-relative info ${styles.info}`}>
                          <div className={`card-body ${styles.detailsBody}`}>
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
