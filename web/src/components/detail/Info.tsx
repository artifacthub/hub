import React from 'react';
import { PackageDetail, PackageKind, MaintainerInfo } from '../../types';
import Title from './Title';
import Image from '../common/Image';
import Versions from './Versions';
import styles from './Info.module.css';
import Maintainer from './Maintainer';

interface Props {
  package: PackageDetail;
}

const Info = (props: Props) => {
  return (
    <div className={`mb-4 ${styles.wrapper}`}>
      <div className={`card bg-light position-relative ${styles.info}`}>
        <div className={`position-absolute d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper}`}>
          <Image className={styles.image} alt={props.package.name} src={props.package.logo_url} />
        </div>

        <div className="card-body pt-5">
          <h3 className="text-center mb-0">{props.package.display_name || props.package.name}</h3>

          {(() => {
            switch (props.package.kind) {
              case PackageKind.Chart:
                return (
                  <div className="text-center text-muted text-uppercase mb-4">
                    <small>{props.package.chart_repository.display_name || props.package.chart_repository.name}</small>
                  </div>
                );
              default:
                return null;
            }
          })()}

          <Title text="Versions" />
          <Versions
            package_id={props.package.package_id}
            available_versions={props.package.available_versions.sort().reverse()}
            version={props.package.version}
          />

          <Title text="Application version" />
          <p>{props.package.app_version}</p>

          <Title text="Maintainers" />
          {props.package.maintainers.map((maintainer: MaintainerInfo) => (
            <Maintainer {...maintainer} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Info;
