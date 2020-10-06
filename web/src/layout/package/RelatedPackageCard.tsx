import React from 'react';
import { Link } from 'react-router-dom';

import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import Image from '../common/Image';
import RepositoryIcon from '../common/RepositoryIcon';
import styles from './RelatedPackageCard.module.css';

interface Props {
  package: Package;
}

const RelatedPackageCard = (props: Props) => {
  const isRepeatedRepoName = (): boolean => {
    return (
      (props.package.repository.displayName || props.package.repository.name) ===
      (props.package.repository.userAlias ||
        props.package.repository.organizationDisplayName ||
        props.package.repository.organizationName)
    );
  };

  return (
    <div className={`card cardWithHover mb-2 w-100 relatedCard ${styles.card}`}>
      <Link
        data-testid="relatedPackageLink"
        className={`text-decoration-none text-reset ${styles.link}`}
        to={{
          pathname: buildPackageURL(props.package),
        }}
      >
        <div className={`card-body d-flex flex-column ${styles.body}`}>
          <div className="d-flex align-items-start justify-content-between flex-grow-1 mw-100">
            <div className={`d-flex align-items-center flex-grow-1 ${styles.truncateWrapper}`}>
              <div
                className={`d-flex align-items-center justify-content-center overflow-hidden ${styles.imageWrapper} imageWrapper`}
              >
                <Image
                  imageId={props.package.logoImageId}
                  alt={`Logo ${props.package.displayName || props.package.name}`}
                  className={styles.image}
                  kind={props.package.repository.kind}
                />
              </div>

              <div className={`ml-2 h-100 flex-grow-1 ${styles.truncateWrapper}`}>
                <div className="h-100 d-flex flex-row justify-content-between">
                  <div className="mr-2 text-truncate w-100">
                    <div className={`align-self-end text-truncate card-title mb-2 ${styles.title}`}>
                      {props.package.displayName || props.package.name}
                    </div>
                    <div className={`card-subtitle align-items-center text-muted ${styles.subtitle}`}>
                      <div className="w-100">
                        <div className="text-truncate">
                          {!isRepeatedRepoName() && (
                            <>
                              {props.package.repository.userAlias ||
                                props.package.repository.organizationDisplayName ||
                                props.package.repository.organizationName}
                              <span className="px-1">/</span>
                            </>
                          )}

                          {props.package.repository.displayName || props.package.repository.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`align-self-start d-flex align-items-center text-uppercase ${styles.kind}`}>
                    <RepositoryIcon className={styles.icon} kind={props.package.repository.kind} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default RelatedPackageCard;
