import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { Link } from 'react-router-dom';

import { EventKind, Package } from '../../../../../types';
import buildPackageURL from '../../../../../utils/buildPackageURL';
import { SubscriptionItem, SUBSCRIPTIONS_LIST } from '../../../../../utils/data';
import Image from '../../../../common/Image';
import RepositoryIcon from '../../../../common/RepositoryIcon';
import styles from './PackageCard.module.css';

interface Props {
  package: Package;
  changeSubscription: (packageId: string, kind: EventKind, isActive: boolean, packageName: string) => void;
}

const PackageCard = (props: Props) => {
  return (
    <div className="py-2" role="listitem">
      <div className={`card h-100 ${styles.card}`}>
        <div>
          <div className={`card-body position-relative ${styles.body}`}>
            <Link
              data-testid="packageCardLink"
              className={`text-decoration-none ${styles.link}`}
              to={{
                pathname: buildPackageURL(props.package),
              }}
            >
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div className={`d-flex align-items-center flex-grow-1 ${styles.truncateWrapper}`}>
                  <div
                    className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}
                  >
                    <Image
                      imageId={props.package.logoImageId}
                      alt={`Logo ${props.package.displayName || props.package.name}`}
                      className={styles.image}
                    />
                  </div>

                  <div className={`ml-3 flex-grow-1 ${styles.truncateWrapper}`}>
                    <div className={`card-title font-weight-bolder mb-2 ${styles.title}`}>
                      <div className="h5 d-flex flex-row align-items-center">
                        {props.package.displayName || props.package.name}
                      </div>
                    </div>

                    <div className={`card-subtitle d-flex flex-wrap mw-100 mt-1 ${styles.subtitle}`}>
                      {!isUndefined(props.package.repository.organizationName) &&
                        props.package.repository.organizationName && (
                          <div className="mr-2 text-truncate">
                            <span className="text-muted text-uppercase mr-1">Org:</span>
                            <p className="d-inline mb-0 text-dark">
                              {props.package.repository.organizationDisplayName ||
                                props.package.repository.organizationName}
                            </p>
                          </div>
                        )}

                      {!isNull(props.package.repository.userAlias) && (
                        <div className="mr-2 text-truncate">
                          <span className="text-muted text-uppercase mr-1">User:</span>
                          <p className="d-inline mb-0 text-dark">{props.package.repository.userAlias}</p>
                        </div>
                      )}

                      <div className="mr-2 text-truncate">
                        <span className="text-muted text-uppercase mr-1">Repo:</span>
                        <p className="d-inline mb-0 text-dark">
                          {props.package.repository.displayName || props.package.repository.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`d-flex align-items-center text-uppercase ${styles.kind}`}>
                  <RepositoryIcon className={styles.icon} kind={props.package.repository.kind} />
                </div>
              </div>
            </Link>

            {SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
              const isActive = !isUndefined(props.package.eventKinds) && props.package.eventKinds.includes(subs.kind);

              return (
                <div
                  className={`d-flex flex-row align-items-center ${styles.wrapper}`}
                  key={`card_${props.package.normalizedName}_${subs.kind}`}
                >
                  <div className={`custom-control custom-switch ${styles.clickable}`}>
                    <input
                      data-testid={`${subs.name}MobileBtn`}
                      id={subs.name}
                      type="checkbox"
                      className={`custom-control-input ${styles.checkbox}`}
                      disabled={!subs.enabled}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
                    <label data-testid={`${subs.name}_label`} className="custom-control-label" htmlFor={subs.name}>
                      <div className="d-flex align-items-center">
                        {subs.icon} <span className="ml-1">{subs.title}</span>
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
