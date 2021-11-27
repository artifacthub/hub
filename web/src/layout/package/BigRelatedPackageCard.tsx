import moment from 'moment';
import { Link } from 'react-router-dom';
import { useHistory } from 'react-router-dom';

import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import isFuture from '../../utils/isFuture';
import { prepareQueryString } from '../../utils/prepareQueryString';
import Image from '../common/Image';
import OrganizationInfo from '../common/OrganizationInfo';
import RepositoryIconLabel from '../common/RepositoryIconLabel';
import RepositoryInfo from '../common/RepositoryInfo';
import StarBadge from '../common/StarBadge';
import styles from './BigRelatedPackageCard.module.css';

interface Props {
  package: Package;
}

const BigRelatedPackageCard = (props: Props) => {
  const history = useHistory();

  return (
    <div
      className={`card cardWithHover mt-3 mt-xxl-0 w-100 relatedCard ${styles.card}`}
      data-testid="relatedPackageLink"
    >
      <Link
        className={`text-decoration-none text-reset ${styles.link}`}
        to={{
          pathname: buildPackageURL(props.package.normalizedName, props.package.repository, props.package.version!),
        }}
      >
        <div className={`card-body d-flex flex-column h-100 ${styles.body}`}>
          <div className="d-flex align-items-start justify-content-between mw-100">
            <div className={`d-flex align-items-strecht flex-grow-1 h-100 ${styles.truncateWrapper}`}>
              <div
                className={`d-flex align-items-center justify-content-center overflow-hidden rounded-circle p-1 p-md-2 ${styles.imageWrapper} imageWrapper`}
              >
                <Image
                  imageId={props.package.logoImageId}
                  alt={`Logo ${props.package.displayName || props.package.name}`}
                  className={styles.image}
                  kind={props.package.repository.kind}
                />
              </div>

              <div
                className={`d-flex flex-column justify-content-between ml-3 my-1 my-md-0 flex-grow-1 ${styles.truncateWrapper} ${styles.titleWrapper}`}
              >
                <div className="text-truncate card-title mb-0">
                  <div className="d-flex flex-row align-items-center">
                    <div className={`text-truncate ${styles.title}`}>
                      {props.package.displayName || props.package.name}
                    </div>
                  </div>
                </div>

                <div className="d-block d-md-none">
                  <div className={`card-subtitle align-items-baseline ${styles.subtitle}`}>
                    <RepositoryInfo
                      repository={props.package.repository}
                      className="d-inline d-md-none text-truncate w-100"
                      repoLabelClassName="d-none"
                      withLabels={false}
                    />
                  </div>
                </div>

                <div className={`d-none d-md-block card-subtitle align-items-baseline ${styles.subtitle}`}>
                  <div className="d-flex flex-row align-items-baseline">
                    {props.package.repository.organizationName && (
                      <OrganizationInfo
                        className={`mr-0 d-flex flex-row align-items-baseline ${styles.mx50} `}
                        btnClassName="text-truncate mw-100"
                        organizationName={props.package.repository.organizationName}
                        organizationDisplayName={props.package.repository.organizationDisplayName}
                        visibleLegend
                      />
                    )}

                    {props.package.repository.userAlias && (
                      <>
                        <span className="text-muted text-uppercase mr-1">User: </span>
                        <span className="sr-only">{props.package.repository.userAlias}</span>

                        <button
                          className={`p-0 border-0 text-truncate text-dark mw-100 ${styles.link} ${styles.mx50}`}
                          onClick={(e) => {
                            e.preventDefault();
                            history.push({
                              pathname: '/packages/search',
                              search: prepareQueryString({
                                pageNumber: 1,
                                filters: {
                                  user: [props.package.repository.userAlias!],
                                },
                              }),
                            });
                          }}
                          aria-label={`Filter by ${props.package.repository.userAlias}`}
                          aria-hidden="true"
                          tabIndex={-1}
                        >
                          <div className="text-truncate">{props.package.repository.userAlias}</div>
                        </button>
                      </>
                    )}

                    <div className={styles.mx50}>
                      <RepositoryInfo
                        repository={props.package.repository}
                        className={`d-flex flex-row align-items-baseline ml-3 ${styles.truncateWrapper}`}
                        repoLabelClassName="d-none d-lg-inline"
                        withLabels={false}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`d-flex flex-column align-items-end mb-auto ml-2`}>
                <div className={`align-self-start d-flex align-items-center text-uppercase ml-auto ${styles.kind}`}>
                  <StarBadge className="mr-2" starsNumber={props.package.stars} />
                  <RepositoryIconLabel kind={props.package.repository.kind} clickable />
                </div>
                <div className="mt-1">
                  {!isFuture(props.package.ts) && (
                    <small className={`text-muted text-nowrap ${styles.date}`}>
                      Updated {moment.unix(props.package.ts).fromNow()}
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default BigRelatedPackageCard;
