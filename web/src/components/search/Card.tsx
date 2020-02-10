import React from 'react';
import { Link } from 'react-router-dom';
import { Package, PackageKind } from '../../types';
import Image from '../common/Image';
import PackageIcon from '../common/PackageIcon';
import styles from './Card.module.css';

interface Props {
  package: Package;
  searchText: string;
  filtersQuery: string;
  saveScrollPosition: () => void;
}

const Card = (props: Props) => (
  <div className="col-12 py-sm-3 py-2">
    <div className={`card h-100 ${styles.card}`}>
      <Link
        className={`text-decoration-none ${styles.link}`}
        onClick={props.saveScrollPosition}
        to={{
          pathname: `/package/${props.package.package_id}`,
          state: { searchText: props.searchText, filtersQuery: props.filtersQuery },
        }}
      >
        <div className={`card-body ${styles.body}`}>
          <div className="d-flex align-items-start justify-content-between mb-3">
            <div className={`d-flex align-items-center flex-grow-1 ${styles.truncateWrapper}`}>
              <div className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}>
                <Image src={props.package.logo_url} alt={`Logo ${props.package.display_name}`} className={styles.image} />
              </div>

              <div className={`ml-3 flex-grow-1 ${styles.truncateWrapper}`}>
                <div className={`card-title font-weight-bolder mb-2 ${styles.title}`}>
                  <div className="h5">
                    {props.package.display_name || props.package.name}
                  </div>
                </div>

                <div className={`card-subtitle d-flex flex-wrap mw-100 mt-1 ${styles.subtitle}`}>
                  {(() => {
                    switch (props.package.kind) {
                      case PackageKind.Chart:
                        return (
                          <>
                            <div className="mr-2 text-truncate">
                              <span className="text-muted text-uppercase mr-1">Repository: </span>
                              {props.package.chart_repository.display_name || props.package.chart_repository.name}
                            </div>

                            <div className="text-truncate">
                              <span className="text-muted text-uppercase mr-1">Version: </span>
                              {props.package.app_version || '-'}
                            </div>
                          </>
                        );
                      default:
                        return null;
                    }
                  })()}
                </div>
              </div>
            </div>

            <div className={`d-flex align-items-center text-uppercase ${styles.kind}`}>
              <PackageIcon className={styles.icon} kind={props.package.kind} />
            </div>
          </div>

          <p className={`mb-0 card-text overflow-hidden ${styles.description}`}>
            {props.package.description}
          </p>
        </div>
      </Link>
    </div>
  </div>
);

export default Card;
