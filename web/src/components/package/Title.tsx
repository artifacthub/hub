import React from 'react';
import { PackageKind, PackageDetail } from '../../types';
import Image from '../common/Image';
import Install from './Install';
import InfoMobile from './InfoMobile';
import styles from './Title.module.css';

const Title = (props: PackageDetail) => (
  <div className={`jumbotron ${styles.jumbotron}`}>
    <div className="container">
      <div className="d-flex align-items-center mb-3">
        <div className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper}`}>
          <Image className={styles.image} alt={props.name} src={props.logo_url} />
        </div>

        <div className="ml-3">
          <div className="h3 mb-0">{props.display_name || props.name}</div>

          {(() => {
            switch (props.kind) {
              case PackageKind.Chart:
                return (
                  <div className="text-muted text-uppercase">
                    <small>{props.chart_repository.display_name || props.chart_repository.name}</small>
                  </div>
                );
              default:
                return null;
            }
          })()}
        </div>
      </div>

      <p className="mb-0">{props.description}</p>

      <div className="d-block d-md-none">
        <div className="d-inline-block mr-2">
          <InfoMobile package={{...props}} />
        </div>

        <div className="d-inline-block">
          <Install
            package={{...props}}
            buttonType="btn-outline-secondary"
            buttonIcon
          />
        </div>
      </div>
    </div>
  </div>
);

export default Title;
