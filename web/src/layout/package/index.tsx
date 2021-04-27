import { isArray } from 'lodash';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import map from 'lodash/map';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { AiOutlineStop } from 'react-icons/ai';
import { FiPlus } from 'react-icons/fi';
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
  FalcoRules,
  OPAPolicies,
  Package,
  RepositoryKind,
  SearchFiltersURL,
  Version,
} from '../../types';
import isPackageOfficial from '../../utils/isPackageOfficial';
import prepareQueryString from '../../utils/prepareQueryString';
import sortPackageVersions from '../../utils/sortPackageVersions';
import updateMetaIndex from '../../utils/updateMetaIndex';
import AnchorHeader from '../common/AnchorHeader';
import BlockCodeButtons from '../common/BlockCodeButtons';
import ExternalLink from '../common/ExternalLink';
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
import Footer from '../navigation/Footer';
import SubNavbar from '../navigation/SubNavbar';
import ChangelogModal from './ChangelogModal';
import ChartTemplatesModal from './chartTemplates';
import CustomResourceDefinition from './CustomResourceDefinition';
import Details from './Details';
import InstallationModal from './installation/Modal';
import ModalHeader from './ModalHeader';
import MoreActionsButton from './MoreActionsButton';
import styles from './PackageView.module.css';
import ReadmeWrapper from './readme';
import RecommendedPackages from './RecommendedPackages';
import RelatedPackages from './RelatedPackages';
import ResourcesList from './ResourcesList';
import StarButton from './StarButton';
import Stats from './Stats';
import SubscriptionsButton from './SubscriptionsButton';
import TektonManifestModal from './TektonManifestModal';
import ValuesSchema from './valuesSchema';

interface Props {
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  packageName: string;
  version?: string;
  repositoryKind: string;
  repositoryName: string;
  hash?: string;
  channel?: string;
  visibleModal?: string;
  visibleValuesSchemaPath?: string;
  visibleTemplate?: string;
}

const PackageView = (props: Props) => {
  const history = useHistory();
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [packageName, setPackageName] = useState(props.packageName);
  const [repositoryKind, setRepositoryKind] = useState(props.repositoryKind);
  const [repositoryName, setRepositoryName] = useState(props.repositoryName);
  const [version, setVersion] = useState(props.version);
  const [detail, setDetail] = useState<Package | null | undefined>(undefined);
  const { tsQueryWeb, tsQuery, pageNumber, filters, deprecated, operators, verifiedPublisher, official } =
    props.searchUrlReferer || {};
  const [apiError, setApiError] = useState<null | string | JSX.Element>(null);
  const [activeChannel, setActiveChannel] = useState<string | undefined>(props.channel);
  const [currentHash, setCurrentHash] = useState<string | undefined>(props.hash);

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
      const detailPkg = await API.getPackage({
        packageName: packageName,
        version: version,
        repositoryKind: repositoryKind,
        repositoryName: repositoryName,
      });
      let metaTitle = `${detailPkg.normalizedName} ${detailPkg.version} · ${
        detailPkg.repository.userAlias || detailPkg.repository.organizationName
      }/${detailPkg.repository.name}`;
      updateMetaIndex(metaTitle, detailPkg.description);
      setDetail(detailPkg);
      if (currentHash) {
        setCurrentHash(undefined);
      }
      if (isUndefined(activeChannel) && detailPkg.repository.kind === RepositoryKind.OLM) {
        if (detailPkg.defaultChannel) {
          setActiveChannel(detailPkg.defaultChannel);
        } else if (detailPkg.channels && detailPkg.channels.length > 0) {
          setActiveChannel(detailPkg.channels[0].name);
        }
      }
      setApiError(null);
      window.scrollTo(0, 0); // Scroll to top when a new version is loaded
      setIsLoadingPackage(false);
      scrollIntoView();
    } catch (err) {
      if (err.kind === ErrorKind.NotFound) {
        setApiError(
          <>
            <div className={`mb-4 mb-lg-5 h2 ${styles.noDataTitleContent}`}>
              Sorry, the package you requested was not found.
            </div>

            <p className={`h5 mb-4 mb-lg-5 ${styles.noDataTitleContent}`}>
              The package you are looking for may have been deleted by the provider, or it may now belong to a different
              repository. Please try searching for it, as it may help locating the package in a different repository or
              discovering other alternatives.
            </p>

            <p className={`h6 ${styles.noDataContent}`}>
              NOTE: The official Helm <span className="font-weight-bold">stable</span> and{' '}
              <span className="font-weight-bold">incubator</span> repositories were removed from Artifact Hub on
              November 6th as part of the deprecation plan announced by the Helm project. For more information please
              see <ExternalLink href="https://helm.sh/blog/charts-repo-deprecation/">this blog post</ExternalLink> and{' '}
              <ExternalLink href="https://github.com/helm/charts/issues/23944">this Github issue</ExternalLink>.
            </p>
          </>
        );
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

  const getInstallationModal = (wrapperClassName?: string): JSX.Element | null => (
    <div className={wrapperClassName}>
      <InstallationModal
        package={detail}
        sortedVersions={sortedVersions}
        activeChannel={activeChannel}
        visibleInstallationModal={!isUndefined(props.visibleModal) && props.visibleModal === 'install'}
        searchUrlReferer={props.searchUrlReferer}
        fromStarredPage={props.fromStarredPage}
      />
    </div>
  );

  const getFalcoRules = (): string | FalcoRules | undefined => {
    let rules: string | FalcoRules | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.rules)
    ) {
      if (isArray(detail.data.rules)) {
        rules = map(detail.data.rules, 'Raw').join(' ');
      } else {
        rules = detail.data.rules as FalcoRules;
      }
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

  const getManifestRaw = (): string | undefined => {
    let manifest: string | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.manifestRaw)
    ) {
      manifest = detail.data.manifestRaw as string;
    }
    return manifest;
  };

  const getCRDs = (): CustomResourcesDefinition[] | undefined => {
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

  const getCRDsCards = (): JSX.Element | null => {
    const resources = getCRDs();
    if (!isUndefined(resources) && resources.length > 0) {
      return (
        <div className={`mb-5 ${styles.codeWrapper}`}>
          <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Custom Resource Definitions" />

          <CustomResourceDefinition resources={resources} normalizedName={detail!.normalizedName} />
        </div>
      );
    } else {
      return null;
    }
  };

  const getBadges = (withRepoInfo: boolean, extraStyle?: string): JSX.Element => (
    <>
      <OfficialBadge official={isPackageOfficial(detail)} className={`d-inline mr-3 ${extraStyle}`} type="package" />
      {withRepoInfo && (
        <VerifiedPublisherBadge
          verifiedPublisher={detail!.repository.verifiedPublisher}
          className={`d-inline mr-3 ${extraStyle}`}
        />
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

  useEffect(() => {
    if (props.hash !== currentHash) {
      setCurrentHash(props.hash);
      if (isUndefined(props.hash) || props.hash === '') {
        window.scrollTo(0, 0);
      } else {
        scrollIntoView();
      }
    }
  }, [props.hash]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const scrollIntoView = useCallback(
    (id?: string) => {
      const elId = id || props.hash;
      if (isUndefined(elId) || elId === '') return;

      try {
        const element = document.querySelector(elId);
        if (element) {
          element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });

          if (isUndefined(id)) {
            history.replace({
              pathname: history.location.pathname,
              hash: elId,
              state: {
                searchUrlReferer: props.searchUrlReferer,
                fromStarredPage: props.fromStarredPage,
              },
            });
          } else if (props.hash !== elId) {
            history.push({
              pathname: history.location.pathname,
              hash: elId,
              state: {
                searchUrlReferer: props.searchUrlReferer,
                fromStarredPage: props.fromStarredPage,
              },
            });
          }
        }
      } finally {
        return;
      }
    },
    [props.hash, props.searchUrlReferer, props.fromStarredPage, history]
  );

  const getAdditionalPkgContent = (): { content: JSX.Element; titles: string } | null => {
    if (isNull(detail) || isUndefined(detail)) return null;
    let additionalTitles = '';
    const additionalContent = (
      <>
        {(() => {
          switch (detail.repository.kind) {
            case RepositoryKind.Falco:
              let rules: string | FalcoRules | undefined = getFalcoRules();
              if (!isUndefined(rules)) {
                additionalTitles += '# Rules\n';
              }
              return (
                <>
                  {!isUndefined(rules) && (
                    <div className={`mb-5 ${styles.codeWrapper}`}>
                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Rules" />

                      {(() => {
                        switch (typeof rules) {
                          case 'string':
                            return (
                              <div className="d-flex d-xxl-inline-block mw-100 position-relative">
                                <BlockCodeButtons content={rules} filename={`${detail.normalizedName}-rules.yaml`} />
                                <SyntaxHighlighter
                                  language="yaml"
                                  style={tomorrowNight}
                                  customStyle={{ padding: '1.5rem' }}
                                >
                                  {rules}
                                </SyntaxHighlighter>
                              </div>
                            );
                          default:
                            return (
                              <ResourcesList
                                resources={rules}
                                normalizedName={detail.normalizedName}
                                kind={detail.repository.kind}
                              />
                            );
                        }
                      })()}
                    </div>
                  )}
                </>
              );

            case RepositoryKind.OPA:
              let policies: OPAPolicies | undefined = getOPAPolicies();
              if (!isUndefined(policies)) {
                additionalTitles += '# Policies files\n';
              }
              return (
                <>
                  {!isUndefined(policies) && (
                    <div className={`mb-5 ${styles.codeWrapper}`}>
                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Policies files" />
                      <ResourcesList
                        resources={policies}
                        normalizedName={detail.normalizedName}
                        kind={detail.repository.kind}
                      />
                    </div>
                  )}
                </>
              );

            case RepositoryKind.Krew:
              let manifest: string | undefined = getManifestRaw();
              if (!isUndefined(manifest)) {
                additionalTitles += '# Manifest\n';
              }
              return (
                <>
                  {!isUndefined(manifest) && (
                    <div className={`mb-5 ${styles.codeWrapper}`}>
                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Manifest" />

                      <div className="d-flex d-xxl-inline-block mw-100 position-relative">
                        <BlockCodeButtons content={manifest} filename={`${detail.normalizedName}-rules.yaml`} />
                        <SyntaxHighlighter language="yaml" style={tomorrowNight} customStyle={{ padding: '1.5rem' }}>
                          {manifest}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}
                </>
              );

            case RepositoryKind.Helm:
            case RepositoryKind.OLM:
              const crds = getCRDsCards();
              if (!isNull(crds)) {
                additionalTitles += '# Custom Resource Definitions\n';
              }
              return crds;

            default:
              return null;
          }
        })()}
      </>
    );

    return { content: additionalContent, titles: additionalTitles };
  };

  const additionalInfo = getAdditionalPkgContent();

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
                state: { 'from-detail': true },
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
                state: { 'from-detail': true },
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
        {isLoadingPackage && <Loading spinnerClassName={`position-fixed ${styles.spinner}`} />}

        {!isUndefined(detail) && (
          <>
            {!isNull(detail) && (
              <>
                <div className={`jumbotron package-detail-jumbotron ${styles.jumbotron}`}>
                  <div className="container-lg px-sm-4 px-lg-0 position-relative">
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
                            {detail.repository.userAlias ? (
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

                    <Stats packageStats={detail.stats} />

                    <div className="d-flex flex-wrap d-md-none">{getBadges(true, 'mt-3 mt-md-0')}</div>

                    <div className={`position-absolute d-flex flex-row align-items-center ${styles.optsWrapper}`}>
                      <span className={`d-block d-md-none text-muted text-nowrap ${styles.date}`}>
                        Updated {moment(detail!.ts * 1000).fromNow()}
                      </span>
                      <StarButton packageId={detail.packageId} />
                      <SubscriptionsButton packageId={detail.packageId} />
                      <MoreActionsButton
                        packageId={detail.packageId}
                        packageName={detail.displayName || detail.name}
                        packageDescription={detail.description}
                        visibleWidget={!isUndefined(props.visibleModal) && props.visibleModal === 'widget'}
                        searchUrlReferer={props.searchUrlReferer}
                        fromStarredPage={props.fromStarredPage}
                      />
                    </div>

                    <div className="row align-items-baseline d-md-none">
                      <Modal
                        buttonType="btn-secondary btn-sm text-nowrap"
                        buttonContent={
                          <>
                            <FiPlus className="mr-2" />
                            <span>Info</span>
                          </>
                        }
                        header={
                          <ModalHeader
                            displayName={detail.displayName}
                            name={detail.name}
                            logoImageId={detail.logoImageId}
                            repoKind={detail.repository.kind}
                          />
                        }
                        className={`col mt-3 ${styles.btnMobileWrapper}`}
                      >
                        <Details
                          package={detail}
                          activeChannel={activeChannel}
                          onChannelChange={onChannelChange}
                          sortedVersions={sortedVersions}
                          searchUrlReferer={props.searchUrlReferer}
                          fromStarredPage={props.fromStarredPage}
                          visibleSecurityReport={false}
                        />
                      </Modal>

                      {getInstallationModal(`col mt-3 ${styles.btnMobileWrapper}`)}

                      <div className={`col mt-3 ${styles.btnMobileWrapper}`}>
                        <ChangelogModal
                          packageId={detail.packageId}
                          normalizedName={detail.normalizedName}
                          repository={detail.repository}
                          hasChangelog={detail.hasChangelog!}
                          visibleChangelog={!isUndefined(props.visibleModal) && props.visibleModal === 'changelog'}
                          searchUrlReferer={props.searchUrlReferer}
                          fromStarredPage={props.fromStarredPage}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <RecommendedPackages recommendations={detail.recommendations} />
              </>
            )}

            <div className="container-lg px-sm-4 px-lg-0">
              {isNull(detail) && !isLoadingPackage ? (
                <NoData className={styles.noDataWrapper}>
                  {isNull(apiError) ? (
                    <>An error occurred getting this package, please try again later.</>
                  ) : (
                    <>{apiError}</>
                  )}
                </NoData>
              ) : (
                <div className="d-flex flex-column-reverse d-md-block px-xs-0 px-sm-3 px-lg-0">
                  <div
                    className={`ml-0 ml-md-5 mb-5 position-relative float-none float-md-right ${styles.additionalInfo}`}
                  >
                    {!isNull(detail) && (
                      <div className={styles.rightColumnWrapper}>
                        <div className="d-none d-md-block">
                          {getInstallationModal('mb-2')}

                          <div className="d-none d-lg-block">
                            <ChartTemplatesModal
                              btnClassName="btn-block"
                              packageId={detail.packageId}
                              version={detail.version!}
                              repoKind={detail.repository.kind}
                              visibleChartTemplates={
                                !isUndefined(props.visibleModal) && props.visibleModal === 'template'
                              }
                              visibleTemplate={
                                !isUndefined(props.visibleModal) && props.visibleModal === 'template'
                                  ? props.visibleTemplate
                                  : undefined
                              }
                              searchUrlReferer={props.searchUrlReferer}
                              fromStarredPage={props.fromStarredPage}
                            />
                          </div>

                          {(() => {
                            switch (detail.repository.kind) {
                              case RepositoryKind.TektonTask:
                                return (
                                  <TektonManifestModal
                                    normalizedName={detail.normalizedName}
                                    manifestRaw={getManifestRaw()}
                                  />
                                );

                              case RepositoryKind.Helm:
                                return (
                                  <div className="mb-2">
                                    <ValuesSchema
                                      hasValuesSchema={detail.hasValuesSchema}
                                      packageId={detail.packageId}
                                      version={detail.version!}
                                      normalizedName={detail.normalizedName}
                                      searchUrlReferer={props.searchUrlReferer}
                                      fromStarredPage={props.fromStarredPage}
                                      visibleValuesSchema={
                                        !isUndefined(props.visibleModal) && props.visibleModal === 'values-schema'
                                      }
                                      visibleValuesSchemaPath={
                                        !isUndefined(props.visibleModal) && props.visibleModal === 'values-schema'
                                          ? props.visibleValuesSchemaPath
                                          : undefined
                                      }
                                    />
                                  </div>
                                );

                              default:
                                return null;
                            }
                          })()}
                          <div className="mb-2">
                            <ChangelogModal
                              packageId={detail.packageId}
                              normalizedName={detail.normalizedName}
                              repository={detail.repository}
                              hasChangelog={detail.hasChangelog!}
                              visibleChangelog={!isUndefined(props.visibleModal) && props.visibleModal === 'changelog'}
                              searchUrlReferer={props.searchUrlReferer}
                              fromStarredPage={props.fromStarredPage}
                            />
                          </div>

                          <div className={`card shadow-sm position-relative info ${styles.info}`}>
                            <div className={`card-body ${styles.detailsBody}`}>
                              <Details
                                package={detail}
                                activeChannel={activeChannel}
                                onChannelChange={onChannelChange}
                                sortedVersions={sortedVersions}
                                searchUrlReferer={props.searchUrlReferer}
                                fromStarredPage={props.fromStarredPage}
                                visibleSecurityReport={
                                  !isUndefined(props.visibleModal) && props.visibleModal === 'security-report'
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className={styles.relatedPackagesWrapper}>
                          <RelatedPackages packageId={detail.packageId} name={detail.name} keywords={detail.keywords} />
                        </div>
                      </div>
                    )}
                  </div>

                  {!isNull(detail) && (
                    <>
                      <div className={styles.mainContent}>
                        {isNull(detail.readme) || isUndefined(detail.readme) ? (
                          <div className={styles.noReadmeWrapper}>
                            <NoData>No README file available for this package</NoData>
                          </div>
                        ) : (
                          <ReadmeWrapper
                            packageName={detail.displayName || detail.name}
                            markdownContent={detail.readme}
                            scrollIntoView={scrollIntoView}
                            additionalTitles={isNull(additionalInfo) ? '' : additionalInfo.titles}
                          />
                        )}

                        {!isNull(additionalInfo) && <>{additionalInfo.content}</>}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Footer isHidden={isLoadingPackage || isUndefined(detail)} />
    </>
  );
};

export default PackageView;
