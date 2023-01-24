import isUndefined from 'lodash/isUndefined';
import { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';

import { EventKind, Package } from '../../../../../../types';
import buildPackageURL from '../../../../../../utils/buildPackageURL';
import { PACKAGE_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../../../../../utils/data';
import Image from '../../../../../common/Image';
import RepositoryIcon from '../../../../../common/RepositoryIcon';
import styles from './PackageCard.module.css';

interface Props {
  package: Package;
  changeSubscription: (packageId: string, kind: EventKind, isActive: boolean, packageName: string) => void;
}

const PackageCard = (props: Props) => {
  return (
    <div className="py-2" role="listitem">
      <div className={`card cardWithHover h-100 bg-white mw-100 ${styles.card}`}>
        <div>
          <div className={`card-body position-relative ${styles.body}`}>
            <Link
              data-testid="packageCardLink"
              className={`text-decoration-none text-reset bg-transparent ${styles.link}`}
              to={{
                pathname: buildPackageURL(
                  props.package.normalizedName,
                  props.package.repository,
                  props.package.version!
                ),
              }}
            >
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div className={`d-flex align-items-center flex-grow-1 ${styles.truncateWrapper}`}>
                  <div
                    className={`d-flex align-items-center justify-content-center overflow-hidden p-1 border border-2 bg-white ${styles.imageWrapper} imageWrapper`}
                  >
                    <Image
                      imageId={props.package.logoImageId}
                      alt={`Logo ${props.package.displayName || props.package.name}`}
                      className={styles.image}
                      kind={props.package.repository.kind}
                    />
                  </div>

                  <div className={`ms-3 flex-grow-1 ${styles.truncateWrapper}`}>
                    <div className="card-title fw-bolder mb-2 lh-1">
                      <div className="h5 d-flex flex-row align-items-center">
                        {props.package.displayName || props.package.name}
                      </div>
                    </div>

                    <div className={`card-subtitle d-flex flex-wrap mw-100 mt-1 ${styles.subtitle}`}>
                      {props.package.repository.organizationName && (
                        <div className="me-2 text-truncate">
                          <span className="text-muted text-uppercase me-1">Org:</span>
                          <p className="d-inline mb-0 text-dark">
                            {props.package.repository.organizationDisplayName ||
                              props.package.repository.organizationName}
                          </p>
                        </div>
                      )}

                      {props.package.repository.userAlias && (
                        <div className="me-2 text-truncate">
                          <span className="text-muted text-uppercase me-1">User:</span>
                          <p className="d-inline mb-0 text-dark">{props.package.repository.userAlias}</p>
                        </div>
                      )}

                      <div className="me-2 text-truncate">
                        <span className="text-muted text-uppercase me-1">Repo:</span>
                        <p className="d-inline mb-0 text-dark">
                          {props.package.repository.displayName || props.package.repository.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`d-flex align-items-center text-uppercase ${styles.kind}`}>
                  <RepositoryIcon className={`h-auto ${styles.icon}`} kind={props.package.repository.kind} />
                </div>
              </div>
            </Link>

            {PACKAGE_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
              const isActive = !isUndefined(props.package.eventKinds) && props.package.eventKinds.includes(subs.kind);

              return (
                <div
                  className="d-flex flex-row align-items-center"
                  key={`card_${props.package.normalizedName}_${subs.kind}`}
                >
                  <div className={`form-check form-switch ${styles.clickable}`}>
                    <input
                      id={`${props.package.name}_${subs.name}`}
                      type="checkbox"
                      role="switch"
                      className={`form-check-input ${styles.checkbox}`}
                      disabled={!subs.enabled}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        e.preventDefault();
                        e.stopPropagation();

                        props.changeSubscription(
                          props.package.packageId,
                          subs.kind,
                          isActive,
                          props.package.displayName || props.package.name
                        );
                      }}
                      checked={isActive}
                    />
                    <label
                      data-testid={`${subs.name}_label`}
                      className="form-check-label"
                      htmlFor={`${props.package.name}_${subs.name}`}
                    >
                      <div className="d-flex align-items-center">
                        {subs.icon} <span className="ms-1">{subs.title}</span>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageCard;
