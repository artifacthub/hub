import React from 'react';
import { Link } from 'react-router-dom';
import isNull from 'lodash/isNull';
import { FaBoxes } from 'react-icons/fa';
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
  <div className="col-sm-12 col-lg-6 col-xl-4 p-2">
    <div className={`card h-100 ${styles.card}`}>
      <Link className={`text-decoration-none ${styles.link}`} to={`/detail/${props.package.package_id}`}>
        <div className={`d-flex align-items-end justify-content-between p-2 border-bottom text-uppercase ${styles.topHeader}`}>
          {(() => {
            switch (props.package.kind) {
              case PackageKind.Chart:
                return (
                  <div className="d-flex align-items-center">
                    <FaBoxes className="mr-2" />
                    {props.package.chart_repository.display_name || props.package.chart_repository.name}
                  </div>
                );
              default:
                return null;
            }
          })()}

          <div className="d-flex align-items-center">
            {PACKAGE_KIND[props.package.kind]}
            <PackageIcon className={`ml-2 ${styles.icon}`} kind={props.package.kind} />
          </div>
        </div>

        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <div className={`d-flex align-items-center justify-content-center overflow-hidden p-1 ${styles.imageWrapper}`}>
              <Image src={props.package.logo_url} alt={`Logo ${props.package.display_name}`} className={styles.image} />
            </div>

            <div className={`ml-3 ${styles.header}`}>
              <div className={`card-title font-weight-bolder mb-2 ${styles.title}`}>
                {isNull(props.package.display_name) ? props.package.name : props.package.display_name}
              </div>
              <div className={`card-subtitle text-muted ${styles.subtitle}`}>{props.package.latest_version}</div>
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
