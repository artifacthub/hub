import React from 'react';
import { Link, useHistory } from 'react-router-dom';
import Image from '../common/Image';
import PackageIcon from '../common/PackageIcon';
import { Package, PackageKind } from '../../types';
import styles from './UpdatesCard.module.css';

interface Props {
  packageItem: Package;
}


const UpdatesCard = (props: Props) => {
  const history = useHistory();

  return (
    <div className={`card mb-3 mw-100 ${styles.card}`}>
      <Link
        className={`text-decoration-none ${styles.link}`}
        to={{
          pathname: `/package/${props.packageItem.package_id}`,
        }}
      >
        <div className={`card-body ${styles.body}`}>
          <div className="d-flex align-items-start justify-content-between flex-grow-1">
            <div className={`d-flex align-items-center flex-grow-1 ${styles.truncateWrapper}`}>
              <div className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}>
                <Image imageId={props.packageItem.logo_image_id} alt={`Logo ${props.packageItem.display_name || props.packageItem.name}`} className={styles.image} />
              </div>

              <div className={`ml-3 flex-grow-1 ${styles.truncateWrapper}`}>
                <div className={`card-title font-weight-bolder ${styles.title}`}>
                  <div className="h6 text-truncate">{props.packageItem.display_name || props.packageItem.name}</div>
                </div>

                <div className={`card-subtitle align-items-center ${styles.subtitle}`}>
                  {(() => {
                    switch (props.packageItem.kind) {
                      case PackageKind.Chart:
                        return (
                          <>
                            <div className="mr-2 text-truncate">
                              <span className="text-muted text-uppercase mr-1">Repository: </span>
                              <button
                                className={`p-0 border-0 ${styles.link}`}
                                onClick={(e) => {
                                  e.preventDefault();

                                  history.push({
                                    pathname: '/search',
                                    search: `?repo=${props.packageItem.chart_repository.chart_repository_id}&page=1`,
                                  });
                                }}
                              >
                                <u>{props.packageItem.chart_repository.display_name || props.packageItem.chart_repository.name}</u>
                              </button>
                            </div>

                            <div className="text-truncate">
                              <span className="text-muted text-uppercase mr-1">Version: </span>
                              {props.packageItem.app_version || '-'}
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

            <div className={`d-flex align-items-center text-uppercase ml-2 ${styles.kind}`}>
              <PackageIcon className={styles.icon} kind={props.packageItem.kind} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default UpdatesCard;
