import React from 'react';
import { PackageKind, PackageDetail } from '../../types';
import Image from '../common/Image';
import styles from './Title.module.css';

const Title = (props: PackageDetail) => (
  <div className={`jumbotron ${styles.jumbotron}`}>
    <div className="container">
      <div className="d-flex align-items-center mb-3">
        <div className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper}`}>
          <Image className={styles.image} alt={props.name} src={props.logo_url} />
        </div>

        <div className="ml-3">
          <h3 className="mb-0">{props.display_name || props.name}</h3>

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
    </div>
  </div>
);

export default Title;
