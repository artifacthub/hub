import { isArray } from 'lodash';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AiOutlineStop } from 'react-icons/ai';
import { FiCode, FiPlus } from 'react-icons/fi';
import { IoIosArrowBack } from 'react-icons/io';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { Link, useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import API from '../../api';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import {
  CustomResourcesDefinition,
  CustomResourcesDefinitionExample,
  ErrorKind,
  FalcoRules,
  FileModalItem,
  FileModalKind,
  Package,
  PackageLink,
  RepositoryKind,
  SearchFiltersURL,
  Version,
} from '../../types';
import isFuture from '../../utils/isFuture';
import isPackageOfficial from '../../utils/isPackageOfficial';
import { prepareQueryString } from '../../utils/prepareQueryString';
import sortPackageVersions from '../../utils/sortPackageVersions';
import updateMetaIndex from '../../utils/updateMetaIndex';
import AnchorHeader from '../common/AnchorHeader';
import BlockCodeButtons from '../common/BlockCodeButtons';
import ExternalLink from '../common/ExternalLink';
import FilesModal from '../common/FilesModal';
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
import ChangelogModal from './changelog/Modal';
import ChartTemplatesModal from './chartTemplates';
import Details from './Details';
import InProductionButton from './InProductionButton';
import InstallationModal from './installation/Modal';
import ModalHeader from './ModalHeader';
import MoreActionsButton from './MoreActionsButton';
import OrgsUsingPackage from './OrgsUsingPackage';
import styles from './PackageView.module.css';
import ReadmeWrapper from './readme';
import RecommendedPackages from './RecommendedPackages';
import RelatedPackages from './RelatedPackages';
import ScreenshotsModal from './screenshots/Modal';
import SignKeyInfo from './SignKeyInfo';
import StarButton from './StarButton';
import Stats from './Stats';
import SubscriptionsButton from './SubscriptionsButton';
import TektonManifestModal from './TektonManifestModal';
import Values from './values';
import ValuesSchema from './valuesSchema';

interface Props {
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  packageName: string;
  version?: string;
  repositoryKind: string;
  repositoryName: string;
  hash?: string;
  visibleModal?: string;
  visibleValuesPath?: string;
  visibleImage?: string;
  visibleTarget?: string;
  visibleSection?: string;
  eventId?: string;
  visibleTemplate?: string;
  visibleFile?: string;
  visibleVersion?: string;
}

const RELATED_PKGS_GAP = 400;

const PackageView = (props: Props) => {
  const history = useHistory();
  const point = useBreakpointDetect();
  const contentWrapper = useRef<HTMLDivElement | null>(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [packageName, setPackageName] = useState(props.packageName);
  const [repositoryKind, setRepositoryKind] = useState(props.repositoryKind);
  const [repositoryName, setRepositoryName] = useState(props.repositoryName);
  const [version, setVersion] = useState(props.version);
  const [detail, setDetail] = useState<Package | null | undefined>(undefined);
  const { tsQueryWeb, tsQuery, pageNumber, filters, deprecated, operators, verifiedPublisher, official, sort } =
    props.searchUrlReferer || {};
  const [apiError, setApiError] = useState<null | string | JSX.Element>(null);
  const [currentHash, setCurrentHash] = useState<string | undefined>(props.hash);
  const columnWrapper = useRef<HTMLDivElement | null>(null);
  const [relatedPosition, setRelatedPosition] = useState<'column' | 'content' | undefined | null>(null);
  const [currentPkgId, setCurrentPkgId] = useState<null | string>(null);
  const [relatedPackages, setRelatedPackages] = useState<Package[] | undefined>(undefined);

  useScrollRestorationFix();

  useLayoutEffect(() => {
    const updateRelatedPosition = () => {
      if (contentWrapper.current && columnWrapper.current && point && detail) {
        if (point && !['xs', 'sm'].includes(point)) {
          setRelatedPosition(
            contentWrapper.current.offsetHeight <= columnWrapper.current.offsetHeight + RELATED_PKGS_GAP
              ? 'content'
              : 'column'
          );
        } else {
          setRelatedPosition('column');
        }
      }
    };

    if (isUndefined(relatedPosition)) {
      updateRelatedPosition();
    }
  }, [relatedPosition]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!isUndefined(props.packageName) && !isLoadingPackage) {
      setPackageName(props.packageName);
      setVersion(props.version);
      setRepositoryKind(props.repositoryKind);
      setRepositoryName(props.repositoryName);
    }
  }, [props, isLoadingPackage]);

  useEffect(() => {
    async function fetchRelatedPackages(pkgDetail: Package) {
      try {
        let name = pkgDetail.name.split('-');
        let words = [...name];
        if (!isUndefined(pkgDetail.keywords) && pkgDetail.keywords.length > 0) {
          words = [...name, ...pkgDetail.keywords];
        }
        const searchResults = await API.searchPackages(
          {
            tsQueryWeb: Array.from(new Set(words)).join(' or '),
            filters: {},
            limit: 9,
            offset: 0,
          },
          false
        );
        let filteredPackages: Package[] = [];
        if (!isNull(searchResults.packages)) {
          filteredPackages = searchResults.packages
            .filter((item: Package) => item.packageId !== currentPkgId)
            .slice(0, 8); // Only first 8 packages
        }
        setRelatedPackages(filteredPackages);
      } catch {
        setRelatedPackages([]);
      }
    }
    if (!isNull(currentPkgId) && detail) {
      fetchRelatedPackages(detail);
    }
  }, [currentPkgId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  async function fetchPackageDetail() {
    try {
      setRelatedPosition(null);
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
      setApiError(null);
      setCurrentPkgId(detailPkg.packageId);
      setRelatedPosition(undefined);
      window.scrollTo(0, 0); // Scroll to top when a new version is loaded
      setIsLoadingPackage(false);
      scrollIntoView();
    } catch (err: any) {
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
              see{' '}
              <ExternalLink href="https://helm.sh/blog/charts-repo-deprecation/" label="Open Helm documentation">
                this blog post
              </ExternalLink>{' '}
              and{' '}
              <ExternalLink href="https://github.com/helm/charts/issues/23944" label="Open Github issue">
                this Github issue
              </ExternalLink>
              .
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

  // Section for recommended packages and in production (orgs)
  const renderMoreDetails = (): JSX.Element | null => {
    if (detail) {
      const recommendations = detail.recommendations && detail.recommendations.length > 0;
      const orgsUsingPkg = detail.productionOrganizations && detail.productionOrganizations.length > 0;

      if (recommendations || orgsUsingPkg) {
        return (
          <div
            data-testid="more-details-section"
            className={`d-none d-md-block px-3 ${styles.moreDetailsSectionWrapper}`}
          >
            <div className="container-lg px-sm-4 px-lg-0 py-2 d-flex flex-column position-relative">
              {orgsUsingPkg && (
                <OrgsUsingPackage
                  organizations={detail.productionOrganizations!}
                  className={recommendations ? 'mb-2' : 'mb-3'}
                />
              )}
              {recommendations && (
                <RecommendedPackages
                  recommendations={detail.recommendations}
                  className={orgsUsingPkg ? 'mt-2' : 'mt-3'}
                />
              )}
            </div>
          </div>
        );
      } else {
        return null;
      }
    }
    return null;
  };

  const getInstallationModal = (wrapperClassName?: string): JSX.Element | null => (
    <div className={wrapperClassName}>
      <InstallationModal
        package={detail}
        visibleInstallationModal={!isUndefined(props.visibleModal) && props.visibleModal === 'install'}
        searchUrlReferer={props.searchUrlReferer}
        fromStarredPage={props.fromStarredPage}
      />
    </div>
  );

  const getFalcoRules = (): FileModalItem[] | undefined => {
    let rules: FileModalItem[] | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.rules)
    ) {
      if (isArray(detail.data.rules)) {
        rules = detail.data.rules.map((item: any, index: number) => {
          return {
            name:
              item.Name && item.Name !== ''
                ? item.Name
                : `rules${detail!.data!.rules!.length === 1 ? '' : `-${index + 1}`}`,
            file: item.Raw,
          };
        });
      } else {
        rules = Object.keys(detail.data.rules).map((rulesFileName: string) => {
          return {
            name: rulesFileName,
            file: (detail!.data!.rules as FalcoRules)[rulesFileName],
          };
        });
      }
    }
    return rules;
  };

  const getOPAPolicies = (): FileModalItem[] | undefined => {
    let policies: FileModalItem[] | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.policies)
    ) {
      policies = Object.keys(detail.data.policies).map((policyName: string) => {
        return {
          name: policyName,
          file: detail.data!.policies![policyName],
        };
      });
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
        signatures={detail!.signatures}
        className={`d-inline ${extraStyle}`}
      />
      <div className="d-none d-lg-inline">
        <SignKeyInfo
          visibleKeyInfo={!isUndefined(props.visibleModal) && props.visibleModal === 'key-info'}
          repoKind={detail!.repository.kind}
          signatures={detail!.signatures}
          signed={detail!.signed}
          signKey={detail!.signKey}
          searchUrlReferer={props.searchUrlReferer}
          fromStarredPage={props.fromStarredPage}
        />
      </div>
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

  const getSupportLink = (): string | undefined => {
    if (detail && detail.links) {
      const support = detail.links.find((link: PackageLink) => link.name.toLowerCase() === 'support');
      if (support) {
        return support.url;
      } else {
        return undefined;
      }
    }

    return undefined;
  };

  const getAdditionalPkgContent = (): { content: JSX.Element; titles: string } | null => {
    if (isNull(detail) || isUndefined(detail)) return null;
    let additionalTitles = '';
    const additionalContent = (
      <>
        {(() => {
          switch (detail.repository.kind) {
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

                      <div
                        className={`d-flex d-xxl-inline-block mw-100 position-relative overflow-hidden ${styles.manifestWrapper}`}
                      >
                        <BlockCodeButtons content={manifest} filename={`${detail.normalizedName}-rules.yaml`} />
                        <SyntaxHighlighter
                          language="yaml"
                          style={docco}
                          customStyle={{
                            backgroundColor: 'transparent',
                            padding: '1.5rem',
                            lineHeight: '1.25rem',
                            marginBottom: '0',
                            height: '100%',
                            fontSize: '80%',
                            color: '#636a6e',
                          }}
                          lineNumberStyle={{
                            color: 'var(--color-black-25)',
                            marginRight: '5px',
                            fontSize: '0.8rem',
                          }}
                          showLineNumbers
                        >
                          {manifest}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}
                </>
              );

            default:
              return null;
          }
        })()}
      </>
    );

    return { content: additionalContent, titles: additionalTitles };
  };

  const supportLink: string | undefined = getSupportLink();

  const additionalInfo = getAdditionalPkgContent();

  return (
    <>
      {!isUndefined(props.searchUrlReferer) && (
        <SubNavbar>
          <button
            className={`btn btn-link btn-sm pl-0 d-flex align-items-center ${styles.link}`}
            onClick={() => {
              history.push({
                pathname: '/packages/search',
                search: prepareQueryString({
                  pageNumber: pageNumber || 1,
                  tsQueryWeb: tsQueryWeb,
                  tsQuery: tsQuery,
                  filters: filters,
                  deprecated: deprecated,
                  operators: operators,
                  verifiedPublisher: verifiedPublisher,
                  official: official,
                  sort: sort,
                }),
                state: { 'from-detail': true },
              });
            }}
            aria-label="Back to results"
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
            className={`btn btn-link btn-sm pl-0 d-flex align-items-center ${styles.link}`}
            onClick={() => {
              history.push({
                pathname: '/packages/starred',
                state: { 'from-detail': true },
              });
            }}
            aria-label="Back to starred packages"
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
                          className={`d-flex align-items-center justify-content-center p-1 p-md-2 overflow-hidden ${styles.imageWrapper} imageWrapper`}
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
                              visibleIcon
                              withLabels
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className={`mb-0 overflow-hidden ${styles.description}`}>{detail.description}</p>

                    <Stats packageStats={detail.stats} />

                    <div className="d-flex flex-wrap d-md-none">{getBadges(true, 'mt-3 mt-md-0')}</div>

                    <div className={`position-absolute d-flex flex-row align-items-center ${styles.optsWrapper}`}>
                      {detail!.ts && !isFuture(detail!.ts) && (
                        <span className={`d-block d-md-none text-muted text-nowrap ${styles.date}`}>
                          Updated {moment.unix(detail!.ts).fromNow()}
                        </span>
                      )}
                      <StarButton packageId={detail.packageId} />
                      <SubscriptionsButton packageId={detail.packageId} />
                      <InProductionButton normalizedName={detail.normalizedName} repository={detail.repository} />
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
                        buttonType="btn-outline-secondary btn-sm text-nowrap"
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
                          sortedVersions={sortedVersions}
                          channels={detail.channels}
                          searchUrlReferer={props.searchUrlReferer}
                          fromStarredPage={props.fromStarredPage}
                          visibleSecurityReport={false}
                        />
                      </Modal>

                      {getInstallationModal(`col mt-3 ${styles.btnMobileWrapper}`)}

                      {point && ['xs', 'sm'].includes(point) && (
                        <div className={`col mt-3 ${styles.btnMobileWrapper}`}>
                          <ChangelogModal
                            packageId={detail.packageId}
                            normalizedName={detail.normalizedName}
                            repository={detail.repository}
                            hasChangelog={detail.hasChangelog!}
                            currentVersion={props.version}
                            visibleChangelog={!isUndefined(props.visibleModal) && props.visibleModal === 'changelog'}
                            visibleVersion={
                              !isUndefined(props.visibleModal) && props.visibleModal === 'changelog'
                                ? props.visibleVersion
                                : undefined
                            }
                            searchUrlReferer={props.searchUrlReferer}
                            fromStarredPage={props.fromStarredPage}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {renderMoreDetails()}
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
                      <div ref={columnWrapper} className={styles.rightColumnWrapper}>
                        <div className="d-none d-md-block">
                          {getInstallationModal('mb-2')}

                          <div className="d-none d-lg-block">
                            <ChartTemplatesModal
                              btnClassName="btn-block"
                              normalizedName={detail.normalizedName}
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

                          <div className="d-none d-lg-block">
                            <FilesModal
                              kind={FileModalKind.CustomResourcesDefinition}
                              packageId={detail.packageId}
                              modalName="crds"
                              language="yaml"
                              visibleModal={!isUndefined(props.visibleModal) && props.visibleModal === 'crds'}
                              visibleFile={
                                !isUndefined(props.visibleModal) && props.visibleModal === 'crds'
                                  ? props.visibleFile
                                  : undefined
                              }
                              btnModalContent={
                                <div className="d-flex flex-row align-items-center justify-content-center">
                                  <FiCode />
                                  <span className="ml-2 font-weight-bold text-uppercase">CRDs</span>
                                </div>
                              }
                              normalizedName={detail.normalizedName}
                              title="Custom Resources Definition"
                              files={getCRDs() as any}
                              searchUrlReferer={props.searchUrlReferer}
                              fromStarredPage={props.fromStarredPage}
                            />
                          </div>

                          <div className="d-none d-lg-block">
                            <FilesModal
                              kind={FileModalKind.Rules}
                              packageId={detail.packageId}
                              modalName="rules"
                              language="yaml"
                              visibleModal={!isUndefined(props.visibleModal) && props.visibleModal === 'rules'}
                              visibleFile={
                                !isUndefined(props.visibleModal) && props.visibleModal === 'rules'
                                  ? props.visibleFile
                                  : undefined
                              }
                              btnModalContent={
                                <div className="d-flex flex-row align-items-center justify-content-center">
                                  <FiCode />
                                  <span className="ml-2 font-weight-bold text-uppercase">Rules</span>
                                </div>
                              }
                              normalizedName={detail.normalizedName}
                              title="Rules"
                              files={getFalcoRules() as any}
                              searchUrlReferer={props.searchUrlReferer}
                              fromStarredPage={props.fromStarredPage}
                            />
                          </div>

                          <div className="d-none d-lg-block">
                            <FilesModal
                              kind={FileModalKind.Policy}
                              packageId={detail.packageId}
                              modalName="policies"
                              language="text"
                              visibleModal={!isUndefined(props.visibleModal) && props.visibleModal === 'policies'}
                              visibleFile={
                                !isUndefined(props.visibleModal) && props.visibleModal === 'policies'
                                  ? props.visibleFile
                                  : undefined
                              }
                              btnModalContent={
                                <div className="d-flex flex-row align-items-center justify-content-center">
                                  <FiCode />
                                  <span className="ml-2 font-weight-bold text-uppercase">Policies</span>
                                </div>
                              }
                              normalizedName={detail.normalizedName}
                              title="Policies"
                              files={getOPAPolicies() as any}
                              searchUrlReferer={props.searchUrlReferer}
                              fromStarredPage={props.fromStarredPage}
                            />
                          </div>

                          {(() => {
                            switch (detail.repository.kind) {
                              case RepositoryKind.TektonTask:
                              case RepositoryKind.TektonPipeline:
                                return (
                                  <TektonManifestModal
                                    normalizedName={detail.normalizedName}
                                    manifestRaw={getManifestRaw()}
                                    searchUrlReferer={props.searchUrlReferer}
                                    fromStarredPage={props.fromStarredPage}
                                    visibleManifest={
                                      !isUndefined(props.visibleModal) && props.visibleModal === 'manifest'
                                    }
                                  />
                                );

                              case RepositoryKind.Helm:
                                return (
                                  <>
                                    <div className="mb-2">
                                      <Values
                                        packageId={detail.packageId}
                                        version={detail.version!}
                                        normalizedName={detail.normalizedName}
                                        searchUrlReferer={props.searchUrlReferer}
                                        fromStarredPage={props.fromStarredPage}
                                        visibleValues={
                                          !isUndefined(props.visibleModal) && props.visibleModal === 'values'
                                        }
                                        visibleValuesPath={
                                          !isUndefined(props.visibleModal) && props.visibleModal === 'values'
                                            ? props.visibleValuesPath
                                            : undefined
                                        }
                                      />
                                    </div>
                                    {detail.hasValuesSchema && (
                                      <div className="mb-2">
                                        <ValuesSchema
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
                                              ? props.visibleValuesPath
                                              : undefined
                                          }
                                        />
                                      </div>
                                    )}
                                  </>
                                );

                              default:
                                return null;
                            }
                          })()}
                          {point && !['xs', 'sm'].includes(point) && (
                            <div className="mb-2">
                              <ChangelogModal
                                packageId={detail.packageId}
                                normalizedName={detail.normalizedName}
                                repository={detail.repository}
                                hasChangelog={detail.hasChangelog!}
                                currentVersion={props.version}
                                visibleChangelog={
                                  !isUndefined(props.visibleModal) && props.visibleModal === 'changelog'
                                }
                                visibleVersion={
                                  !isUndefined(props.visibleModal) && props.visibleModal === 'changelog'
                                    ? props.visibleVersion
                                    : undefined
                                }
                                searchUrlReferer={props.searchUrlReferer}
                                fromStarredPage={props.fromStarredPage}
                              />
                            </div>
                          )}

                          {!isUndefined(detail.screenshots) && (
                            <ScreenshotsModal
                              screenshots={detail.screenshots}
                              visibleScreenshotsModal={
                                !isUndefined(props.visibleModal) && props.visibleModal === 'screenshots'
                              }
                              searchUrlReferer={props.searchUrlReferer}
                              fromStarredPage={props.fromStarredPage}
                            />
                          )}

                          <div className={`card shadow-sm position-relative info ${styles.info}`}>
                            <div className={`card-body ${styles.detailsBody}`}>
                              <Details
                                package={detail}
                                sortedVersions={sortedVersions}
                                channels={detail.channels}
                                searchUrlReferer={props.searchUrlReferer}
                                fromStarredPage={props.fromStarredPage}
                                visibleSecurityReport={
                                  !isUndefined(props.visibleModal) && props.visibleModal === 'security-report'
                                }
                                visibleImage={props.visibleImage}
                                visibleTarget={props.visibleTarget}
                                visibleSection={props.visibleSection}
                                eventId={
                                  !isUndefined(props.visibleModal) && props.visibleModal === 'security-report'
                                    ? props.eventId
                                    : undefined
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {!isUndefined(relatedPosition) && relatedPosition === 'column' && (
                          <div className={styles.relatedPackagesWrapper}>
                            <RelatedPackages packages={relatedPackages} in={relatedPosition} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!isNull(detail) && (
                    <>
                      <div
                        className={`noFocus ${styles.mainContent}`}
                        id="content"
                        tabIndex={-1}
                        aria-label="Package detail"
                      >
                        <div ref={contentWrapper}>
                          {isNull(detail.readme) || isUndefined(detail.readme) ? (
                            <div className={styles.contentWrapper}>
                              <NoData className={`w-100 noReadmeAlert ${styles.noReadmeAlert}`}>
                                <div>
                                  <div className={`mb-4 ${styles.fileIcon}`}>
                                    <IoDocumentTextOutline />
                                  </div>
                                  <p className="h4 mb-3">This package version does not provide a README file</p>
                                </div>
                              </NoData>
                            </div>
                          ) : (
                            <ReadmeWrapper
                              packageName={detail.displayName || detail.name}
                              supportLink={supportLink}
                              markdownContent={detail.readme}
                              scrollIntoView={scrollIntoView}
                              additionalTitles={isNull(additionalInfo) ? '' : additionalInfo.titles}
                            />
                          )}

                          {!isNull(additionalInfo) && <>{additionalInfo.content}</>}
                        </div>

                        {!isUndefined(relatedPosition) && relatedPosition === 'content' && (
                          <RelatedPackages
                            className={styles.relatedWrapper}
                            packages={relatedPackages}
                            title={<AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Related packages" />}
                            in={relatedPosition}
                          />
                        )}
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
