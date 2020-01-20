import React from 'react';
import isNull from 'lodash/isNull';
import { PackageDetail, MaintainerInfo } from '../../types';
import InfoTitle from './InfoTitle';
import Versions from './Versions';
import styles from './Info.module.css';
import Maintainer from './Maintainer';
import Install from './Install';

interface Props {
  package: PackageDetail;
}

const Info = (props: Props) => (
  <>
    <Install package={props.package} />

    <div className={`card shadow-sm position-relative ${styles.info}`}>
      <div className="card-body">
        <InfoTitle text="Versions" />
        <Versions
          package_id={props.package.package_id}
          available_versions={props.package.available_versions.sort().reverse()}
          version={props.package.version}
        />

        <InfoTitle text="Application version" />
        <p>{props.package.app_version}</p>

        {!isNull(props.package.maintainers) && (
          <div className="mb-2">
            <InfoTitle text="Maintainers" />
            {props.package.maintainers.map((maintainer: MaintainerInfo) => (
              <Maintainer key={maintainer.email} {...maintainer} />
            ))}
          </div>
        )}
      </div>
  </div>
  </>
);

export default Info;
