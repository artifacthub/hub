import moment from 'moment';
import { AiOutlineStop } from 'react-icons/ai';
import { useHistory } from 'react-router-dom';

import { Package, RepositoryKind } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import cutString from '../../utils/cutString';
import isFuture from '../../utils/isFuture';
import isPackageOfficial from '../../utils/isPackageOfficial';
import { prepareQueryString } from '../../utils/prepareQueryString';
import License from '../package/License';
import Image from './Image';
import Label from './Label';
import OfficialBadge from './OfficialBadge';
import OrganizationInfo from './OrganizationInfo';
import styles from './PackageInfo.module.css';
import ProductionBadge from './ProductionBadge';
import RepositoryIconLabel from './RepositoryIconLabel';
import RepositoryInfo from './RepositoryInfo';
import ScannerDisabledRepositoryBadge from './ScannerDisabledRepositoryBadge';
import SecurityRating from './SecurityRating';
import SignedBadge from './SignedBadge';
import StarBadge from './StarBadge';
import VerifiedPublisherBadge from './VerifiedPublisherBadge';

interface Props {
  package: Package;
  breakpointForInfoSection?: string;
}

const PackageInfo = (props: Props) => {
  const history = useHistory();

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
    <div className={`align-self-start d-flex align-items-center text-uppercase ml-auto ${styles.kind}`}>
      <StarBadge className="mr-2" starsNumber={props.package.stars} />
      <RepositoryIconLabel kind={props.package.repository.kind} deprecated={props.package.deprecated} clickable />
    </div>
  );

  const packageImage = (
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
  );

  return (
    <>
      <div className="d-flex align-items-start justify-content-between mw-100">
        <div className={`d-flex align-items-strecht flex-grow-1 h-100 ${styles.truncateWrapper}`}>
          {packageImage}

          <div
            className={`d-flex flex-column justify-content-between ml-3 my-1 my-md-0 flex-grow-1 ${styles.truncateWrapper} ${styles.titleWrapper}`}
          >
            <div className="text-truncate card-title mb-0">
              <div className="d-flex flex-row align-items-center">
                <div className={`text-truncate ${styles.title}`}>{props.package.displayName || props.package.name}</div>
              </div>
            </div>

            <div className="d-block d-md-none">
              <div className={`card-subtitle align-items-baseline ${styles.subtitle}`}>
                <RepositoryInfo
                  repository={props.package.repository}
                  deprecated={props.package.deprecated}
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
                    deprecated={props.package.deprecated}
                    visibleLegend
                  />
                )}

                {props.package.repository.userAlias && (
                  <>
                    <span className="text-muted text-uppercase mr-1">User: </span>
                    <span className="sr-only">{props.package.repository.userAlias}</span>

                    <button
                      data-testid="userLink"
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
                            deprecated: props.package.deprecated,
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
                    deprecated={props.package.deprecated}
                    className={`d-flex flex-row align-items-baseline ml-3 ${styles.truncateWrapper}`}
                    repoLabelClassName="d-none d-lg-inline"
                    withLabels={false}
                  />
                </div>
              </div>
            </div>

            <div
              className={`d-none d-md-block card-subtitle text-truncate align-items-baseline ${styles.subtitle} ${styles.lastLine}`}
            >
              <div className="d-flex flex-row align-items-baseline text-truncate">
                <span className="text-muted text-uppercase mr-1">Version: </span>
                {cutString(props.package.version || '-')}

                {(() => {
                  switch (props.package.repository.kind) {
                    case RepositoryKind.Helm:
                      return (
                        <>
                          {props.package.appVersion && (
                            <>
                              <span className="text-muted text-uppercase mr-1 ml-3">App Version: </span>
                              {cutString(props.package.appVersion)}
                            </>
                          )}
                        </>
                      );

                    default:
                      return null;
                  }
                })()}

                {props.package.license && (
                  <div className={`d-none d-lg-flex flex-row aling-items-baseline text-truncate ${styles.mx50}`}>
                    <span className="text-muted text-uppercase mr-1 ml-3">License:</span>
                    <License
                      license={props.package.license}
                      className="text-truncate"
                      linkClassName={`${styles.link} ${styles.subtitle} ${styles.licenseBtn} text-truncate mw-100`}
                      visibleIcon={false}
                      btnType
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`d-none d-${
              props.breakpointForInfoSection || 'md'
            }-flex flex-column align-items-end mb-auto ml-2`}
          >
            {starsAndKindInfo}
            <div className="mt-1">{pkgTS}</div>
          </div>
        </div>
      </div>
      <div className={`mb-0 mb-md-1 mt-3 overflow-hidden ${styles.description} ${styles.lineClamp}`}>
        {props.package.description}
      </div>

      <div
        className={`d-flex d-${
          props.breakpointForInfoSection || 'md'
        }-none flex-row flex-wrap justify-content-between align-items-center mt-auto pt-2 pt-${
          props.breakpointForInfoSection || 'md'
        }-0`}
      >
        {pkgTS}
        <span className="mt-1">{starsAndKindInfo}</span>
      </div>

      <div className={`d-flex flex-wrap justify-content-lg-end mt-0 mt-md-auto ${styles.labelsWrapper}`}>
        <OfficialBadge official={isPackageOfficial(props.package)} className="d-inline mt-3" type="package" />
        <ProductionBadge
          productionOrganizationsCount={props.package.productionOrganizationsCount}
          className="d-inline mt-3"
        />
        <VerifiedPublisherBadge
          verifiedPublisher={props.package.repository.verifiedPublisher}
          className="d-inline mt-3"
        />
        {props.package.deprecated && (
          <Label text="Deprecated" icon={<AiOutlineStop />} labelStyle="danger" className="d-inline mt-3" />
        )}
        {props.package.signed && (
          <SignedBadge
            signed={props.package.signed}
            signatures={props.package.signatures}
            repositoryKind={props.package.repository.kind}
            className="d-inline mt-3"
          />
        )}
        <SecurityRating
          summary={props.package.securityReportSummary}
          className="d-inline mt-3"
          onlyBadge={false}
          withLink={buildPackageURL(props.package.normalizedName, props.package.repository, props.package.version!)}
        />
        {(props.package.repository.scannerDisabled || props.package.allContainersImagesWhitelisted) && (
          <ScannerDisabledRepositoryBadge
            className="d-inline mt-3"
            scannerDisabled={props.package.repository.scannerDisabled || false}
            allContainersImagesWhitelisted={props.package.allContainersImagesWhitelisted || false}
            withTooltip
          />
        )}
      </div>
    </>
  );
};

export default PackageInfo;
