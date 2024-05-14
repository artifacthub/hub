import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import moment from 'moment';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';

import { Package, RepositoryKind, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import cutString from '../../utils/cutString';
import isFuture from '../../utils/isFuture';
import isPackageOfficial from '../../utils/isPackageOfficial';
import { prepareQueryString } from '../../utils/prepareQueryString';
import scrollToTop from '../../utils/scrollToTop';
import Image from '../common/Image';
import OrganizationInfo from '../common/OrganizationInfo';
import RepositoryIconLabel from '../common/RepositoryIconLabel';
import RepositoryInfo from '../common/RepositoryInfo';
import StarBadge from '../common/StarBadge';
import CNCF from './badges/CNCF';
import Deprecated from './badges/Deprecated';
import Official from './badges/Official';
import Signed from './badges/Signed';
import ValuesSchemaBadge from './badges/ValuesSchema';
import VerifiedPublisher from './badges/VerifiedPublisher';
import styles from './PackageCard.module.css';
import PackageCategoryLabel from './PackageCategoryLabel';

interface Props {
  package: Package;
  cardWrapperClassName?: string;
  className?: string;
  saveScrollPosition?: () => void;
  scrollPosition?: number;
  viewedPackage?: string;
  saveViewedPackage?: (id: string) => void;
  noBadges?: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const PackageCard = (props: Props) => {
  const navigate = useNavigate();
  const infoSection = useRef<HTMLDivElement>(null);
  const ownerInfo = useRef<HTMLDivElement>(null);
  const repoInfo = useRef<HTMLDivElement>(null);
  const [infoStyle, setInfoStyle] = useState<(React.CSSProperties | undefined)[]>([]);
  const [fullInfoWidth, setFullInfoWidth] = useState<number[]>([0, 0]);

  const pkgTS = (
    <>
      {!isFuture(props.package.ts) && (
        <small className={`text-muted text-nowrap ${styles.date}`}>
          Updated {moment.unix(props.package.ts).fromNow()}
        </small>
      )}
    </>
  );

  const starsAndKindInfo = (
    <div className={`align-self-start d-flex align-items-center text-uppercase ms-auto ${styles.kind}`}>
      <StarBadge className={`me-2 ${styles.starBadge}`} starsNumber={props.package.stars} />
      <RepositoryIconLabel
        btnClassName={`position-relative ${styles.repoLabel}`}
        kind={props.package.repository.kind}
        deprecated={props.package.deprecated}
        clickable
      />
    </div>
  );

  const saveInfoWidth = () => {
    setFullInfoWidth([ownerInfo.current?.clientWidth || 0, repoInfo.current?.clientWidth || 0]);
  };

  const checkPkgInfo = () => {
    if (window.innerWidth > 768) {
      if (fullInfoWidth[0] !== 0 && fullInfoWidth[1] !== 0) {
        const wrapperWidth = infoSection.current?.clientWidth;
        if (wrapperWidth) {
          if (wrapperWidth > fullInfoWidth[0] + fullInfoWidth[1]) {
            setInfoStyle([]);
          } else {
            if (fullInfoWidth[0] && fullInfoWidth[1] && fullInfoWidth[0] + fullInfoWidth[1] > wrapperWidth) {
              if (fullInfoWidth[0] < wrapperWidth / 2) {
                if (wrapperWidth - fullInfoWidth[0] < fullInfoWidth[1]) {
                  setInfoStyle([undefined, { width: `${wrapperWidth - fullInfoWidth[0]}px` }]);
                }
              } else {
                if (fullInfoWidth[0] > wrapperWidth / 2) {
                  setInfoStyle([{ width: '50%' }, { width: '50%' }]);
                } else if (wrapperWidth - fullInfoWidth[1] < fullInfoWidth[0]) {
                  setInfoStyle([{ width: `${wrapperWidth - fullInfoWidth[1]}px` }, undefined]);
                }
              }
            }
          }
        }
      }
    }
  };

  useLayoutEffect(() => {
    saveInfoWidth();
  }, []);

  useEffect(() => {
    checkPkgInfo();
  }, [fullInfoWidth]);

  useEffect(() => {
    window.addEventListener('resize', throttle(saveInfoWidth, 200));
    if (props.package.packageId === props.viewedPackage && props.scrollPosition) {
      scrollToTop(props.scrollPosition, 'instant');
    }

    return () => window.removeEventListener('resize', saveInfoWidth);
  }, []);

  return (
    <div className={`py-sm-3 py-2 ${styles.cardWrapper} ${props.cardWrapperClassName}`} role="listitem">
      <div className={`card cardWithHover h-100 mw-100 bg-white ${styles.card} ${props.className}`}>
        <Link
          role="link"
          className={`text-decoration-none text-reset h-100 bg-transparent ${styles.link}`}
          onClick={() => {
            if (!isUndefined(props.saveScrollPosition)) {
              props.saveScrollPosition();
            }
            if (!isUndefined(props.saveViewedPackage)) {
              props.saveViewedPackage(props.package.packageId);
            }
          }}
          to={{
            pathname: buildPackageURL(props.package.normalizedName, props.package.repository, props.package.version!),
          }}
          state={{ searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage }}
        >
          <div className={`card-body d-flex flex-column h-100 ${styles.body}`}>
            <div className="d-flex align-items-start justify-content-between mw-100">
              <div className={`d-flex align-items-stretch flex-grow-1 h-100 ${styles.truncateWrapper}`}>
                <div
                  className={`my-2 my-md-0 d-flex align-items-center justify-content-center overflow-hidden position-relative ${styles.imageWrapper}`}
                >
                  <Image
                    imageId={props.package.logoImageId}
                    alt={`Logo ${props.package.displayName || props.package.name}`}
                    className={styles.image}
                    kind={props.package.repository.kind}
                  />
                </div>

                <div
                  className={`d-flex flex-column flex-grow-1 flex-sm-grow-0 justify-content-between ${styles.truncateWrapper} ${styles.titleWrapper}`}
                >
                  <div className="text-truncate card-title mb-0">
                    <div className="d-flex flex-row align-items-center justify-content-between">
                      <div className={`text-truncate ${styles.title}`}>
                        {props.package.displayName || props.package.name}
                      </div>
                    </div>
                  </div>

                  <div className="d-block d-md-none">
                    <div className={`card-subtitle align-items-baseline ${styles.subtitle}`}>
                      <RepositoryInfo
                        repository={props.package.repository}
                        deprecated={props.package.deprecated}
                        className="d-inline d-md-none text-truncate w-100"
                        repoLabelClassName="d-none"
                      />
                    </div>
                  </div>

                  <div className={`d-none d-md-block card-subtitle align-items-center ${styles.subtitle}`}>
                    <div className="visually-hidden d-flex flex-row position-relative">
                      <div className={styles.info} ref={ownerInfo}>
                        {props.package.repository.organizationDisplayName ||
                          props.package.repository.organizationName ||
                          props.package.repository.userAlias}
                      </div>
                      <div className={`ms-3 ${styles.info}`} ref={repoInfo}>
                        {props.package.repository.displayName || props.package.repository.name}
                      </div>
                    </div>
                    <div ref={infoSection} className="d-flex flex-row mw-100">
                      <div style={infoStyle[0]}>
                        {props.package.repository.organizationName && (
                          <OrganizationInfo
                            className={`me-0 d-flex flex-row align-items-baseline text-left`}
                            btnClassName="text-truncate mw-100"
                            organizationName={props.package.repository.organizationName}
                            organizationDisplayName={props.package.repository.organizationDisplayName}
                            deprecated={props.package.deprecated}
                            visibleLegend
                          />
                        )}

                        {props.package.repository.userAlias && (
                          <div className={`d-flex flex-row align-items-baseline ${styles.userInfo}`}>
                            <span className="visually-hidden">{props.package.repository.userAlias}</span>
                            <button
                              data-testid="userLink"
                              className={`d-flex align-items-baseline p-0 border-0 text-truncate text-muted mw-100 bg-transparent ${styles.link}`}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate({
                                  pathname: '/packages/search',
                                  search: prepareQueryString({
                                    pageNumber: 1,
                                    filters: {
                                      user: [props.package.repository.userAlias!],
                                    },
                                    deprecated: props.package.deprecated,
                                  }),
                                });
                              }}
                              aria-label={`Filter by ${props.package.repository.userAlias}`}
                              aria-hidden="true"
                              tabIndex={-1}
                            >
                              <div className={`text-dark me-1 position-relative ${styles.userIcon}`}>
                                <FaUser />
                              </div>
                              <div className="text-truncate">{props.package.repository.userAlias}</div>
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={infoStyle[1]}>
                        <RepositoryInfo
                          repository={props.package.repository}
                          deprecated={props.package.deprecated}
                          className={`d-flex flex-row align-items-baseline ms-3 ${styles.truncateWrapper}`}
                          repoLabelClassName="d-none d-lg-inline"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`d-none d-lg-flex flex-column align-items-end mb-auto ms-auto ${styles.rightInfo}`}>
                  {starsAndKindInfo}
                  <div className="mt-1">{pkgTS}</div>
                  <div className={`mt-1 text-truncate align-items-baseline position-relative ${styles.version}`}>
                    <div className="d-flex flex-row align-items-baseline text-truncate">
                      <span className="text-muted me-1">
                        {props.package.repository.kind === RepositoryKind.Container ? 'Tag' : 'Version'}{' '}
                      </span>
                      {cutString(props.package.version || '-', 16)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {!isUndefined(props.package.description) && (
              <div
                className={`mb-0 mb-md-1 mt-3 pt-0 pt-md-2 text-muted text-truncate ${styles.description} ${styles.lineClamp} `}
              >
                {props.package.description}
              </div>
            )}
            <div
              className={`d-flex d-lg-none flex-row flex-wrap justify-content-between align-items-center mt-auto pt-3 pt-lg-0 mt-1 mt-lg-0 mt-xxl-1 mt-xxxl-0`}
            >
              {pkgTS}
              <span>{starsAndKindInfo}</span>
            </div>
            {(isUndefined(props.noBadges) || !props.noBadges) && (
              <div className="d-flex flex-row justify-content-between align-items-end pt-0 pt-sm-2 mt-0 mt-md-auto">
                <div>
                  <PackageCategoryLabel category={props.package.category} />
                </div>
                <div className="d-flex flex-row ms-auto">
                  {props.package.deprecated && <Deprecated className="d-inline mt-3 ms-2" />}
                  {(props.package.cncf || props.package.repository.cncf) && <CNCF className="d-inline mt-3 ms-2" />}
                  {props.package.repository.kind === RepositoryKind.Helm && (
                    <ValuesSchemaBadge
                      hasValuesSchema={props.package.hasValuesSchema || false}
                      className="d-inline mt-3 ms-2"
                    />
                  )}
                  <Signed
                    signed={props.package.signed}
                    signatures={props.package.signatures}
                    repoKind={props.package.repository.kind}
                    className="d-inline mt-3 ms-2"
                  />
                  <VerifiedPublisher
                    verifiedPublisher={props.package.repository.verifiedPublisher}
                    className="d-inline mt-3 ms-2"
                  />
                  <Official official={isPackageOfficial(props.package)} className="d-inline mt-3 ms-2" />
                </div>
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
};

export default PackageCard;
