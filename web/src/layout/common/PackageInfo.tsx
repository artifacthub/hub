import moment from 'moment';
import { useEffect, useState } from 'react';
import { AiOutlineStop } from 'react-icons/ai';
import { useHistory } from 'react-router-dom';

import { Package, RepositoryKind } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import calculateDiffInYears from '../../utils/calculateDiffInYears';
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
  const [isVersionOlderThanOneYear, setIsVersionOlderThanOneYear] = useState<boolean>(false);

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
      <StarBadge className="me-2" starsNumber={props.package.stars} />
      <RepositoryIconLabel kind={props.package.repository.kind} deprecated={props.package.deprecated} clickable />
    </div>
  );

  const packageImage = (
    <div
      className={`d-flex align-items-center justify-content-center overflow-hidden rounded-circle p-1 p-md-2 border position-relative bg-white ${styles.imageWrapper} imageWrapper`}
    >
      <Image
        imageId={props.package.logoImageId}
        alt={`Logo ${props.package.displayName || props.package.name}`}
        className={styles.image}
        kind={props.package.repository.kind}
      />
    </div>
  );

  useEffect(() => {
    const diffInYears = calculateDiffInYears(props.package.ts);
    setIsVersionOlderThanOneYear(diffInYears > 1);
  }, [props.package]);

  return (
    <>
      <div className="d-flex align-items-start justify-content-between mw-100">
        <div className={`d-flex align-items-stretch flex-grow-1 h-100 ${styles.truncateWrapper}`}>
          {packageImage}

          <div
            className={`d-flex flex-column justify-content-between ms-3 my-1 my-md-0 flex-grow-1 ${styles.truncateWrapper} ${styles.titleWrapper}`}
          >
            <div className="text-truncate card-title mb-0">
              <div className="d-flex flex-row align-items-center justify-content-between">
                <div className={`text-truncate ${styles.title}`}>{props.package.displayName || props.package.name}</div>
                <div className="d-none d-xxl-flex d-xxxl-none flex-column ms-2">{starsAndKindInfo}</div>
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
                    className={`me-0 d-flex flex-row align-items-baseline text-left w-auto ${styles.mx50} `}
                    btnClassName="text-truncate mw-100"
                    organizationName={props.package.repository.organizationName}
                    organizationDisplayName={props.package.repository.organizationDisplayName}
                    deprecated={props.package.deprecated}
                    visibleLegend
                  />
                )}

                {props.package.repository.userAlias && (
                  <>
                    <span className="text-muted text-uppercase me-1">User: </span>
                    <span className="visually-hidden">{props.package.repository.userAlias}</span>

                    <button
                      data-testid="userLink"
                      className={`p-0 border-0 text-truncate text-dark mw-100 bg-transparent ${styles.link} ${styles.mx50}`}
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
                    className={`d-flex flex-row align-items-baseline ms-3 ${styles.truncateWrapper}`}
                    repoLabelClassName="d-none d-lg-inline"
                    withLabels={false}
                  />
                </div>
              </div>
            </div>

            <div
              className={`d-none d-md-block card-subtitle text-truncate align-items-baseline position-relative ${styles.subtitle} ${styles.lastLine}`}
            >
              <div className="d-flex flex-row align-items-baseline text-truncate">
                <span className="text-muted text-uppercase me-1">
                  {props.package.repository.kind === RepositoryKind.Container ? 'Tag' : 'Version'}:{' '}
                </span>
                {cutString(props.package.version || '-')}

                {(() => {
                  switch (props.package.repository.kind) {
                    case RepositoryKind.Helm:
                    case RepositoryKind.Container:
                      return (
                        <>
                          {props.package.appVersion && (
                            <>
                              <span className="text-muted text-uppercase me-1 ms-3">App Version: </span>
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
                  <div className={`d-none d-lg-flex d-xxl-none d-xxxl-flex flex-row text-truncate ${styles.mx50}`}>
                    <span className="text-muted text-uppercase me-1 ms-3">License:</span>
                    <License
                      license={props.package.license}
                      className="text-truncate"
                      linkClassName={`${styles.link} ${styles.subtitle} ${styles.licenseBtn} position-relative text-truncate mw-100`}
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
            }-flex d-xxl-none d-xxxl-flex flex-column align-items-end mb-auto ms-2`}
          >
            {starsAndKindInfo}
            <div className="mt-1">{pkgTS}</div>
          </div>
        </div>
      </div>
      <div className={`mb-0 mb-md-1 mt-3 overflow-hidden ${styles.description} text-truncate`}>
        {props.package.description}
      </div>

      <div className="d-none d-xxl-block d-xxxl-none text-end mt-2">{pkgTS}</div>

      <div
        className={`d-flex d-${
          props.breakpointForInfoSection || 'md'
        }-none d-xxl-none flex-row flex-wrap justify-content-between align-items-center mt-auto pt-2 pt-${
          props.breakpointForInfoSection || 'md'
        }-0 mt-1 mt-${props.breakpointForInfoSection || 'md'}-0 mt-xxl-1 mt-xxxl-0`}
      >
        {pkgTS}
        <span>{starsAndKindInfo}</span>
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
        {/* Do not display security rating badge when version is older than 1 year */}
        {!isVersionOlderThanOneYear && (
          <SecurityRating
            summary={props.package.securityReportSummary}
            className="d-inline mt-3"
            onlyBadge={false}
            withLink={buildPackageURL(props.package.normalizedName, props.package.repository, props.package.version!)}
          />
        )}
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
