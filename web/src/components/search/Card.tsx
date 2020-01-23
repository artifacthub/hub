import React from 'react';
import { Link } from 'react-router-dom';
import isNull from 'lodash/isNull';
import { Package, PackageKind } from '../../types';
import Image from '../common/Image';
import PackageIcon from '../common/PackageIcon';
import styles from './Card.module.css';

interface Props {
  package: Package;
}

const PACKAGE_KIND = {
  [PackageKind.Chart]: 'Chart',
  [PackageKind.Operator]: 'Operator',
};

const Card = (props: Props) => (
  <div className="col-12 pt-3 pb-3">
    <div className={`card h-100 ${styles.card}`}>
      <Link className={`text-decoration-none ${styles.link}`} to={`/package/${props.package.package_id}`}>
        <div className={`card-body ${styles.body}`}>
          <div className="d-flex align-items-start justify-content-between mb-3">
            <div className="d-flex align-items-center">
              <div className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}>
                <Image src={props.package.logo_url} alt={`Logo ${props.package.display_name}`} className={styles.image} />
              </div>

              <div className="ml-3 flex-grow-1">
                <div className={`card-title font-weight-bolder mb-2 ${styles.title}`}>
                  <h5>{isNull(props.package.display_name) ? props.package.name : props.package.display_name}</h5>
                </div>

                <div className={`card-subtitle d-flex flex-wrap align-items-center mt-1 ${styles.subtitle}`}>
                  {(() => {
                    switch (props.package.kind) {
                      case PackageKind.Chart:
                        return (
                          <>
                            <div className="mr-2 text-nowrap">
                              <span className="text-muted text-uppercase mr-1">Repository: </span>
                              {props.package.chart_repository.display_name || props.package.chart_repository.name}
                            </div>

                            <div className="text-nowrap">
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
              <PackageIcon className={`mr-2 ${styles.icon}`} kind={props.package.kind} />
              {PACKAGE_KIND[props.package.kind]}
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
