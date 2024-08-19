import classNames from 'classnames';
import isArray from 'lodash/isArray';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { FiCode, FiPlus } from 'react-icons/fi';
import { FiPackage } from 'react-icons/fi';
import { IoIosArrowBack } from 'react-icons/io';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { Link, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import API from '../../api';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import {
  Banner as IBanner,
  ContentDefaultModalItem,
  ContentDefaultModalKind,
  CustomResourcesDefinition,
  CustomResourcesDefinitionExample,
  ErrorKind,
  FalcoRules,
  GatekeeperExample,
  OutletContext,
  Package,
  PackageLink,
  PackageViewsStats,
  RadiusRecipeData,
  Recommendation,
  RepositoryKind,
  Version,
} from '../../types';
import bannerDispatcher from '../../utils/bannerDispatcher';
import isFuture from '../../utils/isFuture';
import isPackageOfficial from '../../utils/isPackageOfficial';
import { prepareQueryString } from '../../utils/prepareQueryString';
import scrollToTop from '../../utils/scrollToTop';
import sortPackageVersions from '../../utils/sortPackageVersions';
import updateMetaIndex from '../../utils/updateMetaIndex';
import AnchorHeader from '../common/AnchorHeader';
import CNCF from '../common/badges/CNCF';
import Deprecated from '../common/badges/Deprecated';
import Official from '../common/badges/Official';
import Signed from '../common/badges/Signed';
import ValuesSchemaBagde from '../common/badges/ValuesSchema';
import VerifiedPublisher from '../common/badges/VerifiedPublisher';
import BlockCodeButtons from '../common/BlockCodeButtons';
import ContentDefaultModal from '../common/ContentDefaultModal';
import ExternalLink from '../common/ExternalLink';
import Image from '../common/Image';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import NoData from '../common/NoData';
import OrganizationInfo from '../common/OrganizationInfo';
import PackageCategoryLabel from '../common/PackageCategoryLabel';
import RepositoryIcon from '../common/RepositoryIcon';
import RepositoryIconLabel from '../common/RepositoryIconLabel';
import RepositoryInfo from '../common/RepositoryInfo';
import SubNavbar from '../navigation/SubNavbar';
import Banner from './Banner';
import ChangelogModal from './changelog/Modal';
import ChartTemplatesModal from './chartTemplates';
import Details from './Details';
import GatekeeperExamplesModal from './GatekeeperExamplesModal';
import InProductionButton from './InProductionButton';
import InstallationModal from './installation/Modal';
import MesheryDesignModal from './MesheryDesignModal';
import ModalHeader from './ModalHeader';
import MoreActionsButton from './MoreActionsButton';
import styles from './PackageView.module.css';
import PackagesViewsStats from './PackageViewsStats';
import ReadmeWrapper from './readme';
import RecommendedPackages, { URL_regex } from './RecommendedPackages';
import RelatedPackages from './RelatedPackages';
import ScreenshotsModal from './screenshots/Modal';
import StarButton from './StarButton';
import Stats from './Stats';
import SubscriptionsButton from './SubscriptionsButton';
import TektonManifestModal from './TektonManifestModal';
import Values from './values';
import ValuesSchema from './valuesSchema';

const RELATED_PKGS_GAP = 400;

const PackageView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { repositoryKind, repositoryName, packageName, version } = useParams();
  const visibleModal = searchParams.get('modal');
  const point = useBreakpointDetect();
  const contentWrapper = useRef<HTMLDivElement | null>(null);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [detail, setDetail] = useState<Package | null | undefined>(undefined);
  const [apiError, setApiError] = useState<null | string | JSX.Element>(null);
  const [currentHash, setCurrentHash] = useState<string | undefined>(location.hash);
  const columnWrapper = useRef<HTMLDivElement | null>(null);
  const [relatedPosition, setRelatedPosition] = useState<'column' | 'content' | undefined | null>(null);
  const [currentPkgId, setCurrentPkgId] = useState<null | string>(null);
  const [relatedPackages, setRelatedPackages] = useState<Package[] | undefined>(undefined);
  const [viewsStats, setViewsStats] = useState<PackageViewsStats | undefined>();
  const [banner, setBanner] = useState<IBanner | null>(null);
  const fromStarredPage = location.state && location.state.fromStarredPage;
  const { setIsLoading } = useOutletContext() as OutletContext;

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
  }, [relatedPosition]);

  useEffect(() => {
    async function fetchRelatedPackages(pkgDetail: Package) {
      try {
        const name = pkgDetail.name.split('-');
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

    async function getBanner() {
      try {
        const CNCFBanner = await bannerDispatcher.getBanner();
        setBanner(CNCFBanner);
      } catch {
        setBanner(null);
      }
    }

    if (!isNull(currentPkgId) && detail) {
      getBanner();
      fetchRelatedPackages(detail);
    }
  }, [currentPkgId]);

  async function trackView(pkgID: string, version: string) {
    try {
      API.trackView(pkgID, version);
    } catch {
      // Do not do anything
    }
  }

  async function getViewsStats(pkgID: string) {
    try {
      setViewsStats(await API.getViews(pkgID));
    } catch {
      // Don't display any error if API request fails
    }
  }

  const stopPkgLoading = useCallback(() => {
    setIsLoadingPackage(false);
    setIsLoading(false);
    // Force check related packages position after rendering readme
    setRelatedPosition(undefined);
  }, []);

  async function fetchPackageDetail() {
    try {
      setRelatedPosition(null);
      const detailPkg = await API.getPackage({
        packageName: packageName!,
        version: version,
        repositoryKind: repositoryKind!,
        repositoryName: repositoryName!,
      });
      const metaTitle = `${detailPkg.normalizedName} ${detailPkg.version} · ${
        detailPkg.repository.userAlias || detailPkg.repository.organizationName
      }/${detailPkg.repository.name}`;
      updateMetaIndex(metaTitle, detailPkg.description);
      setDetail(detailPkg);
      // Track view
      trackView(detailPkg.packageId, detailPkg.version!);
      // Get pkg views stats
      getViewsStats(detailPkg.packageId);
      if (currentHash) {
        setCurrentHash(undefined);
      }
      setApiError(null);
      setCurrentPkgId(detailPkg.packageId);
      scrollToTop(); // Scroll to top when a new version is loaded
      // Stop loading when readme is not defined or is the same than the previous one
      if (
        isNull(detailPkg.readme) ||
        isUndefined(detailPkg.readme) ||
        (detail && detail?.readme === detailPkg.readme)
      ) {
        stopPkgLoading();
        setRelatedPosition(undefined);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            <p className="h6 lh-base">
              NOTE: The official Helm <span className="fw-bold">stable</span> and{' '}
              <span className="fw-bold">incubator</span> repositories were removed from Artifact Hub on November 6th as
              part of the deprecation plan announced by the Helm project. For more information please see{' '}
              <ExternalLink href="https://helm.sh/blog/charts-repo-deprecation/" label="Open Helm documentation">
                this blog post
              </ExternalLink>{' '}
              and{' '}
              <ExternalLink href="https://github.com/helm/charts/issues/23944" label="Open GitHub issue">
                this GitHub issue
              </ExternalLink>
              .
            </p>
          </>
        );
      } else if (!isUndefined(err.message)) {
        setApiError(err.message);
      }
      setDetail(null);
      stopPkgLoading();
      setRelatedPosition(undefined);
    }
  }

  useEffect(() => {
    setIsLoadingPackage(true);
    setIsLoading(true);
    fetchPackageDetail();
  }, [packageName, version, repositoryName, repositoryKind]);

  useEffect(() => {
    return () => {
      stopPkgLoading();
    };
  }, []);

  let sortedVersions: Version[] = [];
  if (detail && detail.availableVersions) {
    sortedVersions =
      detail.repository.kind === RepositoryKind.Container
        ? detail.availableVersions
        : sortPackageVersions(detail.availableVersions);
  }

  // Section for recommended packages and in production (orgs)
  const renderMoreDetails = (): JSX.Element | null => {
    if (detail && detail.recommendations) {
      const recommendations: Recommendation[] = [];
      detail.recommendations.forEach((recommendation: Recommendation) => {
        if (recommendation.url.match(URL_regex)) {
          recommendations.push(recommendation);
        }
      });

      if (recommendations.length > 0) {
        return (
          <div
            data-testid="more-details-section"
            className={`d-none d-md-block px-3 ${styles.moreDetailsSectionWrapper}`}
          >
            <div className="container-lg px-sm-4 px-lg-0 py-2 d-flex flex-column position-relative">
              <RecommendedPackages recommendations={recommendations} className="mt-3" />
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
        visibleInstallationModal={!isNull(visibleModal) && visibleModal === 'install'}
      />
    </div>
  );

  const getFalcoRules = (): ContentDefaultModalItem[] | undefined => {
    let rules: ContentDefaultModalItem[] | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.rules)
    ) {
      if (isArray(detail.data.rules)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const getOPAPolicies = (): ContentDefaultModalItem[] | undefined => {
    let policies: ContentDefaultModalItem[] | undefined;
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

  const getKubeArmorPolicies = (): ContentDefaultModalItem[] | undefined => {
    let policies: ContentDefaultModalItem[] | undefined;
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

  const getTektonExamples = (): ContentDefaultModalItem[] | undefined => {
    let examples: ContentDefaultModalItem[] | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.examples)
    ) {
      const currentExamples = detail.data!.examples! as { [key: string]: string };
      examples = Object.keys(currentExamples).map((exampleName: string) => {
        return {
          name: exampleName,
          file: currentExamples[exampleName],
        };
      });
    }
    return examples;
  };

  const getGatekeeperExamples = (): GatekeeperExample[] | undefined => {
    let examples: GatekeeperExample[] | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.examples)
    ) {
      examples = detail.data.examples as GatekeeperExample[];
    }
    return examples;
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

  const getMesheryDesign = (): string | undefined => {
    let design: string | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.design)
    ) {
      design = detail.data.design as string;
    }
    return design;
  };

  const getKyvernoPolicy = (): string | undefined => {
    let policy: string | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.policy)
    ) {
      policy = detail.data.policy as string;
    }
    return policy;
  };

  const getRadiusRecipeFiles = (): { [key: string]: string } | undefined => {
    let files: { [key: string]: string } | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data[RadiusRecipeData.Recipe])
    ) {
      files = detail.data[RadiusRecipeData.Recipe] as { [key: string]: string };
    }
    return files;
  };

  const getArgoTemplate = (): string | undefined => {
    let template: string | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.template)
    ) {
      template = detail.data.template as string;
    }
    return template;
  };

  const getGatekeeperTemplate = (): string | undefined => {
    let manifest: string | undefined;
    if (
      !isUndefined(detail) &&
      !isNull(detail) &&
      !isNull(detail.data) &&
      !isUndefined(detail.data) &&
      !isUndefined(detail.data.template)
    ) {
      manifest = detail.data.template as string;
    }
    return manifest;
  };

  const getCRDs = (): CustomResourcesDefinition[] | undefined => {
    let resources: CustomResourcesDefinition[] | undefined;
    if (detail && detail.crds) {
      const examples: CustomResourcesDefinitionExample[] = detail.crdsExamples || [];
      resources = detail.crds.map((resourceDefinition: CustomResourcesDefinition) => {
        return {
          ...resourceDefinition,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          example: examples.find((info: any) => info.kind === resourceDefinition.kind),
        };
      });
    }
    return resources;
  };

  useEffect(() => {
    if (location.hash !== currentHash) {
      setCurrentHash(location.hash);
      if (isUndefined(location.hash) || location.hash === '') {
        scrollToTop();
      } else {
        scrollIntoView();
      }
    }
  }, [location.hash]);

  const scrollIntoView = useCallback(
    (id?: string) => {
      const elId = id || location.hash;
      if (isUndefined(elId) || elId === '') return;

      try {
        const element = document.querySelector(elId);
        if (element) {
          element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });

          if (isUndefined(id)) {
            navigate(
              {
                pathname: location.pathname,
                hash: elId,
              },
              {
                state: location.state,
                replace: true,
              }
            );
          } else if (location.hash !== elId) {
            navigate({
              pathname: location.pathname,
              hash: elId,
            });
          }
        }
      } finally {
        // eslint-disable-next-line no-unsafe-finally
        return;
      }
    },

    [location.hash, fromStarredPage]
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
          let file: string | undefined;
          let files: { [key: string]: string } | undefined;
          switch (detail.repository.kind) {
            case RepositoryKind.Krew:
              file = getManifestRaw();
              if (!isUndefined(file)) {
                additionalTitles += '# Manifest\n';
              }
              return (
                <>
                  {!isUndefined(file) && (
                    <div className={`mb-5 ${styles.codeWrapper}`}>
                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Manifest" />

                      <div
                        className={`d-flex d-xxxl-inline-block mw-100 position-relative overflow-hidden border border-1 ${styles.manifestWrapper}`}
                      >
                        <BlockCodeButtons content={file} filename={`${detail.normalizedName}-rules.yaml`} />
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
                          {file}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}
                </>
              );

            case RepositoryKind.Gatekeeper:
              file = getGatekeeperTemplate();
              if (!isUndefined(file)) {
                additionalTitles += '# Template\n';
              }
              return (
                <>
                  {!isUndefined(file) && (
                    <div className={`mb-5 ${styles.codeWrapper}`}>
                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Template" />

                      <div
                        className={`d-flex d-xxxl-inline-block mw-100 position-relative overflow-hidden border border-1 ${styles.manifestWrapper}`}
                      >
                        <BlockCodeButtons content={file} filename={`${detail.normalizedName}-template.yaml`} />
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
                          {file}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}
                </>
              );

            case RepositoryKind.Kyverno:
              file = getKyvernoPolicy();
              if (!isUndefined(file)) {
                additionalTitles += '# Policy\n';
              }
              return (
                <>
                  {!isUndefined(file) && (
                    <div className={`mb-5 ${styles.codeWrapper}`}>
                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Policy" />

                      <div
                        className={`d-flex d-xxxl-inline-block mw-100 position-relative overflow-hidden border border-1 ${styles.manifestWrapper}`}
                      >
                        <BlockCodeButtons content={file} filename={`${detail.normalizedName}-policy.yaml`} />
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
                          {file}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}
                </>
              );

            case RepositoryKind.ArgoTemplate:
              file = getArgoTemplate();
              if (!isUndefined(file)) {
                additionalTitles += '# Template\n';
              }
              return (
                <>
                  {!isUndefined(file) && (
                    <div className={`mb-5 ${styles.codeWrapper}`}>
                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Template" />

                      <div
                        className={`d-flex d-xxxl-inline-block mw-100 position-relative overflow-hidden border border-1 ${styles.manifestWrapper}`}
                      >
                        <BlockCodeButtons content={file} filename={`${detail.normalizedName}-template.yaml`} />
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
                          {file}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}
                </>
              );

            case RepositoryKind.RadiusRecipe:
              files = getRadiusRecipeFiles();
              if (!isUndefined(file)) {
                additionalTitles += '# Recipe\n';
              }
              return (
                <>
                  {!isUndefined(files) && (
                    <div className={`mb-5 ${styles.codeWrapper}`}>
                      <AnchorHeader level={2} scrollIntoView={scrollIntoView} title="Recipe" />
                      {Object.keys(files).map((fileName: string) => {
                        const content = files![fileName];
                        const extension = fileName.split('.').pop();
                        return (
                          <div key={fileName}>
                            <div className="h5 my-3">{fileName}</div>
                            <div
                              className={`d-flex d-xxxl-inline-block mw-100 position-relative overflow-hidden border border-1 ${styles.manifestWrapper}`}
                            >
                              <BlockCodeButtons content={content} filename={fileName} />
                              <SyntaxHighlighter
                                language={extension}
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
                                {content}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        );
                      })}
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
      {location.state && location.state.searchUrlReferer && (
        <SubNavbar>
          <button
            className={`btn btn-link btn-sm ps-0 d-flex align-items-center ${styles.link}`}
            onClick={() => {
              navigate(
                {
                  pathname: '/packages/search',
                  search: prepareQueryString({
                    ...location.state.searchUrlReferer,
                    pageNumber: location.state.searchUrlReferer.pageNumber || 1,
                  }),
                },
                {
                  state: { fromDetail: true },
                }
              );
            }}
            aria-label="Back to results"
          >
            <IoIosArrowBack className="me-2" />
            {location.state.searchUrlReferer.tsQueryWeb ? (
              <>
                Back to "<span className="fw-bold">{location.state.searchUrlReferer.tsQueryWeb}</span>" results
              </>
            ) : (
              <>
                Back to
                <span className={`fw-bold ${styles.extraSpace}`}> search results</span>
              </>
            )}
          </button>
        </SubNavbar>
      )}

      {!isUndefined(fromStarredPage) && fromStarredPage && (
        <SubNavbar>
          <button
            className={`btn btn-link btn-sm ps-0 d-flex align-items-center ${styles.link}`}
            onClick={() => {
              navigate(
                {
                  pathname: '/packages/starred',
                },
                {
                  state: { fromDetail: true },
                }
              );
            }}
            aria-label="Back to starred packages"
          >
            <IoIosArrowBack className="me-2" />
            <div>
              Back to <span className="fw-bold">starred packages</span>
            </div>
          </button>
        </SubNavbar>
      )}

      <div data-testid="mainPackage" className="position-relative flex-grow-1">
        {(isLoadingPackage || isUndefined(detail)) && <Loading spinnerClassName="position-fixed top-50" />}

        {!isUndefined(detail) && (
          <>
            {!isNull(detail) && (
              <>
                <div className={`jumbotron package-detail-jumbotron rounded-0 mb-2 ${styles.jumbotron}`}>
                  <div className="container-lg px-sm-4 px-lg-0 position-relative">
                    <div className="d-flex align-items-start w-100 mb-3">
                      <div className="d-flex align-items-center flex-grow-1 mw-100">
                        <div className={`d-flex align-items-center justify-content-center ${styles.imageWrapper}`}>
                          <Image
                            className={styles.image}
                            alt={detail.displayName || detail.name}
                            imageId={detail.logoImageId}
                            kind={detail.repository.kind}
                          />
                        </div>

                        <div
                          className={`position-relative ms-3 flex-grow-1 pe-3 py-0 py-sm-2 ${styles.wrapperWithContentEllipsis}`}
                        >
                          <div className={`d-flex flex-row align-items-center ${styles.titleWrapper}`}>
                            <div className={`position-relative h3 mb-0 text-nowrap text-truncate ${styles.title}`}>
                              {detail.displayName || detail.name}
                            </div>
                            <div className={`d-none d-md-flex align-items-center ${styles.labels}`}>
                              <RepositoryIconLabel
                                kind={detail!.repository.kind}
                                className={classNames(
                                  'd-none d-md-inline-block position-relative mt-1',
                                  styles.kindIcon,
                                  { 'me-3': isUndefined(detail.category) },
                                  { 'me-2': !isUndefined(detail.category) }
                                )}
                                deprecated={detail.deprecated}
                                clickable
                              />
                              <PackageCategoryLabel
                                category={detail.category}
                                deprecated={detail.deprecated}
                                className="d-none d-md-inline me-3 position-relative mt-1"
                              />
                            </div>
                          </div>

                          <div
                            className={`position-relative d-flex d-md-none text-truncate mt-2 w-100 ${styles.mobileSubtitle}`}
                          >
                            <div className="d-none d-md-block text-dark me-2">
                              <FiPackage />
                            </div>
                            <div className={`d-inline ${styles.mobileIcon}`}>
                              <RepositoryIcon kind={detail.repository.kind} className={`w-auto ${styles.repoIcon}`} />
                            </div>
                            <span className={`text-muted d-inline-block text-truncate mw-100 ${styles.mobileVersion}`}>
                              {detail.repository.displayName || detail.repository.name}
                            </span>
                          </div>

                          <div
                            className={`position-relative d-none d-md-flex flex-row align-items-baseline mt-2 ${styles.subtitle}`}
                          >
                            {detail.repository.userAlias ? (
                              <div className={`position-relative me-2 text-truncate ${styles.userLink} ${styles.mw50}`}>
                                <Link
                                  className="d-flex align-items-baseline text-muted"
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
                                  <span className={`text-dark me-1 position-relative ${styles.userIcon}`}>
                                    <FaUser />
                                  </span>
                                  {detail.repository.userAlias}
                                </Link>
                              </div>
                            ) : (
                              <OrganizationInfo
                                className={`me-2 text-truncate d-flex flex-row align-items-baseline ${styles.mw50}`}
                                organizationName={detail.repository.organizationName!}
                                organizationDisplayName={detail.repository.organizationDisplayName}
                                deprecated={detail.deprecated}
                                visibleLegend
                              />
                            )}

                            <RepositoryInfo
                              repository={detail.repository}
                              deprecated={detail.deprecated}
                              className={`text-truncate d-flex flex-row align-items-baseline ms-2 ${styles.mw50}`}
                              repoLabelClassName={styles.repoLabel}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className={`mb-2 overflow-hidden text-break ${styles.description}`}>{detail.description}</p>

                    <div className="d-flex flex-row align-items-center">
                      <div className="d-flex flex-row mt-3 me-4">
                        {detail.deprecated && <Deprecated className="me-2" dropdownAlignment="start" />}
                        {(detail.cncf || detail.repository.cncf) && <CNCF className="me-2" dropdownAlignment="start" />}
                        {detail.repository.kind === RepositoryKind.Helm && (
                          <ValuesSchemaBagde
                            hasValuesSchema={detail.hasValuesSchema || false}
                            className="me-2"
                            dropdownAlignment="start"
                          />
                        )}
                        <Signed
                          signed={detail.signed}
                          signatures={detail.signatures}
                          repoKind={detail.repository.kind}
                          className="me-2"
                          signKey={detail.signKey}
                          dropdownAlignment="start"
                        />
                        <VerifiedPublisher
                          verifiedPublisher={detail.repository.verifiedPublisher}
                          className="me-2"
                          dropdownAlignment="start"
                        />
                        <Official official={isPackageOfficial(detail)} className="me-2" dropdownAlignment="start" />
                      </div>

                      <div className="d-none d-md-flex">
                        <Stats
                          packageStats={detail.stats}
                          productionOrganizationsCount={detail.productionOrganizationsCount}
                        />
                      </div>
                    </div>

                    <div
                      className={`position-absolute d-flex flex-row align-items-center top-0 end-0 ${styles.optsWrapper}`}
                    >
                      {detail!.ts && !isFuture(detail!.ts) && (
                        <span className={`d-block d-lg-none text-muted text-nowrap ${styles.date}`}>
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
                        visibleWidget={!isNull(visibleModal) && visibleModal === 'widget'}
                      />
                    </div>

                    <div className="row align-items-baseline d-md-none">
                      <Modal
                        buttonType="btn-outline-secondary btn-sm text-nowrap"
                        buttonContent={
                          <>
                            <FiPlus className="me-2" />
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
                          viewsStats={viewsStats}
                          version={version}
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
                            currentVersion={version}
                            visibleChangelog={!isNull(visibleModal) && visibleModal === 'changelog'}
                            visibleVersion={
                              !isNull(visibleModal) && visibleModal === 'changelog'
                                ? searchParams.get('version')
                                : undefined
                            }
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
                    className={`ms-0 ms-md-5 mb-5 position-relative float-none float-md-end ${styles.additionalInfo}`}
                  >
                    {!isNull(detail) && (
                      <div ref={columnWrapper} className={styles.rightColumnWrapper}>
                        <div className="d-none d-md-block">
                          {getInstallationModal('mb-2')}

                          <div className="d-none d-lg-block">
                            <ChartTemplatesModal
                              normalizedName={detail.normalizedName}
                              packageId={detail.packageId}
                              version={detail.version!}
                              sortedVersions={sortedVersions}
                              repoKind={detail.repository.kind}
                              visibleChartTemplates={!isNull(visibleModal) && visibleModal === 'template'}
                              visibleTemplate={
                                !isNull(visibleModal) && visibleModal === 'template'
                                  ? searchParams.get('template')
                                  : undefined
                              }
                              visibleLine={
                                !isNull(visibleModal) && visibleModal === 'template'
                                  ? searchParams.get('line')
                                  : undefined
                              }
                              compareVersionTo={
                                !isNull(visibleModal) && visibleModal === 'template'
                                  ? searchParams.get('compare-to')
                                  : undefined
                              }
                            />
                          </div>

                          <div className="d-none d-lg-block">
                            <ContentDefaultModal
                              kind={ContentDefaultModalKind.CustomResourcesDefinition}
                              packageId={detail.packageId}
                              modalName="crds"
                              language="yaml"
                              visibleModal={!isNull(visibleModal) && visibleModal === 'crds'}
                              visibleFile={
                                !isNull(visibleModal) && visibleModal === 'crds' ? searchParams.get('file') : undefined
                              }
                              btnModalContent={
                                <div className="d-flex flex-row align-items-center justify-content-center">
                                  <FiCode />
                                  <span className="ms-2 fw-bold text-uppercase">CRDs</span>
                                </div>
                              }
                              normalizedName={detail.normalizedName}
                              title="Custom Resources Definition"
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              files={getCRDs() as any[]}
                            />
                          </div>

                          {(() => {
                            switch (detail.repository.kind) {
                              case RepositoryKind.TektonTask:
                              case RepositoryKind.TektonPipeline:
                              case RepositoryKind.TektonStepAction:
                                return (
                                  <>
                                    <div className="d-none d-lg-block">
                                      <ContentDefaultModal
                                        kind={ContentDefaultModalKind.Examples}
                                        packageId={detail.packageId}
                                        modalName="examples"
                                        language="yaml"
                                        visibleModal={!isNull(visibleModal) && visibleModal === 'examples'}
                                        visibleFile={
                                          !isNull(visibleModal) && visibleModal === 'examples'
                                            ? searchParams.get('file')
                                            : undefined
                                        }
                                        btnModalContent={
                                          <div className="d-flex flex-row align-items-center justify-content-center">
                                            <FiCode />
                                            <span className="ms-2 fw-bold text-uppercase">Examples</span>
                                          </div>
                                        }
                                        normalizedName={detail.normalizedName}
                                        title="Examples"
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        files={getTektonExamples() as any[]}
                                      />
                                    </div>
                                    <TektonManifestModal
                                      normalizedName={detail.normalizedName}
                                      manifestRaw={getManifestRaw()}
                                      visibleManifest={!isNull(visibleModal) && visibleModal === 'manifest'}
                                    />
                                  </>
                                );

                              case RepositoryKind.Helm:
                                return (
                                  <>
                                    <div className="mb-2">
                                      <Values
                                        packageId={detail.packageId}
                                        version={detail.version!}
                                        normalizedName={detail.normalizedName}
                                        sortedVersions={sortedVersions}
                                        visibleValues={!isNull(visibleModal) && visibleModal === 'values'}
                                        visibleValuesPath={
                                          !isNull(visibleModal) && visibleModal === 'values'
                                            ? searchParams.get('path')
                                            : undefined
                                        }
                                        compareVersionTo={
                                          !isNull(visibleModal) && visibleModal === 'values'
                                            ? searchParams.get('compare-to')
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
                                          visibleValuesSchema={
                                            !isNull(visibleModal) && visibleModal === 'values-schema'
                                          }
                                          visibleValuesSchemaPath={
                                            !isNull(visibleModal) && visibleModal === 'values-schema'
                                              ? searchParams.get('path')
                                              : undefined
                                          }
                                        />
                                      </div>
                                    )}
                                  </>
                                );

                              case RepositoryKind.Gatekeeper:
                                return (
                                  <div className="d-none d-lg-block">
                                    <GatekeeperExamplesModal
                                      packageId={detail.packageId}
                                      visibleModal={!isNull(visibleModal) && visibleModal === 'examples'}
                                      visibleExample={
                                        !isNull(visibleModal) && visibleModal === 'examples'
                                          ? searchParams.get('example')
                                          : undefined
                                      }
                                      visibleFile={
                                        !isNull(visibleModal) && visibleModal === 'examples'
                                          ? searchParams.get('file')
                                          : undefined
                                      }
                                      normalizedName={detail.normalizedName}
                                      examples={getGatekeeperExamples()}
                                    />
                                  </div>
                                );

                              case RepositoryKind.OPA:
                                return (
                                  <div className="d-none d-lg-block">
                                    <ContentDefaultModal
                                      kind={ContentDefaultModalKind.Policy}
                                      packageId={detail.packageId}
                                      modalName="policies"
                                      language="text"
                                      visibleModal={!isNull(visibleModal) && visibleModal === 'policies'}
                                      visibleFile={
                                        !isNull(visibleModal) && visibleModal === 'policies'
                                          ? searchParams.get('file')
                                          : undefined
                                      }
                                      btnModalContent={
                                        <div className="d-flex flex-row align-items-center justify-content-center">
                                          <FiCode />
                                          <span className="ms-2 fw-bold text-uppercase">Policies</span>
                                        </div>
                                      }
                                      normalizedName={detail.normalizedName}
                                      title="Policies"
                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      files={getOPAPolicies() as any[]}
                                    />
                                  </div>
                                );

                              case RepositoryKind.Falco:
                                return (
                                  <div className="d-none d-lg-block">
                                    <ContentDefaultModal
                                      kind={ContentDefaultModalKind.Rules}
                                      packageId={detail.packageId}
                                      modalName="rules"
                                      language="yaml"
                                      visibleModal={!isNull(visibleModal) && visibleModal === 'rules'}
                                      visibleFile={
                                        !isNull(visibleModal) && visibleModal === 'rules'
                                          ? searchParams.get('file')
                                          : undefined
                                      }
                                      btnModalContent={
                                        <div className="d-flex flex-row align-items-center justify-content-center">
                                          <FiCode />
                                          <span className="ms-2 fw-bold text-uppercase">Rules</span>
                                        </div>
                                      }
                                      normalizedName={detail.normalizedName}
                                      title="Rules"
                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      files={getFalcoRules() as any[]}
                                    />
                                  </div>
                                );

                              case RepositoryKind.KubeArmor:
                                return (
                                  <div className="d-none d-lg-block">
                                    <ContentDefaultModal
                                      kind={ContentDefaultModalKind.Policy}
                                      packageId={detail.packageId}
                                      modalName="policies"
                                      language="yaml"
                                      visibleModal={!isNull(visibleModal) && visibleModal === 'policies'}
                                      visibleFile={
                                        !isNull(visibleModal) && visibleModal === 'policies'
                                          ? searchParams.get('file')
                                          : undefined
                                      }
                                      btnModalContent={
                                        <div className="d-flex flex-row align-items-center justify-content-center">
                                          <FiCode />
                                          <span className="ms-2 fw-bold text-uppercase">Policies</span>
                                        </div>
                                      }
                                      normalizedName={detail.normalizedName}
                                      title="Policies"
                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      files={getKubeArmorPolicies() as any[]}
                                    />
                                  </div>
                                );

                              case RepositoryKind.MesheryDesign:
                                return (
                                  <MesheryDesignModal
                                    normalizedName={detail.normalizedName}
                                    design={getMesheryDesign()}
                                    visibleDesign={!isNull(visibleModal) && visibleModal === 'design'}
                                  />
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
                                currentVersion={version}
                                visibleChangelog={!isNull(visibleModal) && visibleModal === 'changelog'}
                                visibleVersion={
                                  !isNull(visibleModal) && visibleModal === 'changelog'
                                    ? searchParams.get('version')
                                    : undefined
                                }
                              />
                            </div>
                          )}

                          {!isUndefined(detail.screenshots) && (
                            <div className="mb-2">
                              <ScreenshotsModal
                                screenshots={detail.screenshots}
                                visibleScreenshotsModal={!isNull(visibleModal) && visibleModal === 'screenshots'}
                              />
                            </div>
                          )}

                          {!isNull(banner) && (
                            <Banner
                              className={`mb-2 ${styles.banner}`}
                              banner={banner}
                              removeBanner={() => setBanner(null)}
                              maxEqualRatio={false}
                            />
                          )}

                          <div className={`card shadow-sm position-relative info ${styles.info}`}>
                            <div className={`card-body ${styles.detailsBody}`}>
                              <Details
                                package={detail}
                                sortedVersions={sortedVersions}
                                channels={detail.channels}
                                visibleSecurityReport={!isNull(visibleModal) && visibleModal === 'security-report'}
                                visibleImage={searchParams.get('image')}
                                visibleTarget={searchParams.get('target')}
                                visibleSection={searchParams.get('section')}
                                viewsStats={viewsStats}
                                version={version}
                                eventId={
                                  !isNull(visibleModal) && visibleModal === 'security-report'
                                    ? searchParams.get('event-id')
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
                              <NoData className="w-100 noReadmeAlert bg-transparent">
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
                              stopPkgLoading={stopPkgLoading}
                            />
                          )}

                          {!isNull(additionalInfo) && <>{additionalInfo.content}</>}
                        </div>

                        <PackagesViewsStats
                          stats={viewsStats}
                          version={version}
                          repoKind={detail.repository.kind}
                          title={
                            <AnchorHeader
                              level={2}
                              scrollIntoView={scrollIntoView}
                              anchorName="views"
                              title="Views over the last 30 days"
                            />
                          }
                        />

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
    </>
  );
};

export default PackageView;
