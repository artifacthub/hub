import React from 'react';
import { PackageKind, PackageDetail } from '../../types';
import Image from '../common/Image';
import Install from './Install';
import InfoMobile from './InfoMobile';
import styles from './Title.module.css';

interface Props {
  package: PackageDetail;
}

const Title = (props: Props) => (
  <div className={`jumbotron ${styles.jumbotron}`}>
    <div className="container">
      <div className="d-flex align-items-center mb-3">
        <div className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper}`}>
          <Image className={styles.image} alt={props.package.display_name || props.package.name} imageId={props.package.logo_image_id} />
        </div>

        <div className="ml-3">
          <div className="h3 mb-0">{props.package.display_name || props.package.name}</div>

          {(() => {
            switch (props.package.kind) {
              case PackageKind.Chart:
                return (
                  <div className="text-muted text-uppercase">
                    <small>{props.package.chart_repository.display_name || props.package.chart_repository.name}</small>
                  </div>
                );
              default:
                return null;
            }
          })()}
        </div>
      </div>

      <p className="mb-0">{props.package.description}</p>

      <div className="d-block d-md-none">
        <div className="d-inline-block mr-2">
          <InfoMobile package={props.package} />
        </div>

        <div className="d-inline-block">
          <Install
            package={props.package}
            buttonType="btn-outline-secondary"
            buttonIcon
          />
        </div>
      </div>
    </div>
  </div>
);

export default Title;
