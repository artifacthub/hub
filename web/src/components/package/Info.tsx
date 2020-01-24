import React from 'react';
import isNull from 'lodash/isNull';
import { TiHome } from 'react-icons/ti';
import { FiExternalLink } from 'react-icons/fi';
import { PackageDetail, MaintainerInfo } from '../../types';
import InfoTitle from './InfoTitle';
import Versions from './Versions';
import Maintainer from './Maintainer';
import Install from './Install';
import ExternalLink from '../common/ExternalLink';
import styles from './Info.module.css';

interface Props {
  package: PackageDetail;
}

const Info = (props: Props) => (
  <>
    <Install package={props.package} />

    <div className={`card shadow-sm position-relative ${styles.info}`}>
      <div className="card-body">
        <InfoTitle text="Application version" />
        <p className="text-truncate">{props.package.app_version || '-'}</p>

        <InfoTitle text="Chart Versions" />
        {props.package.available_versions.length === 0 ? (
          <p>-</p>
        ) : (
          <Versions
            package_id={props.package.package_id}
            available_versions={props.package.available_versions.sort().reverse()}
            version={props.package.version}
          />
        )}

        <InfoTitle text="Links" />
        {isNull(props.package.home_url) ? (
          <p>-</p>
        ) : (
          <ExternalLink href={props.package.home_url} className="text-primary d-flex align-items-center mb-3">
            <TiHome className="text-muted mr-2" />
            <>Home url</>
            <span className={styles.smallIcon}><FiExternalLink className="ml-1" /></span>
          </ExternalLink>
        )}

        <InfoTitle text="Maintainers" />
        {isNull(props.package.maintainers) || props.package.maintainers.length === 0 ? (
          <p>-</p>
        ) : (
          <div className="mb-3">
            {props.package.maintainers.map((maintainer: MaintainerInfo) => (
              <Maintainer key={maintainer.email} {...maintainer} />
            ))}
          </div>
        )}

        <InfoTitle text="Keywords" />
        {props.package.keywords.length === 0 ? (
          <p>-</p>
        ) : (
          <>
            {props.package.keywords.map((keyword: string) => (
              <p className="h6 d-inline" key={keyword}><span className="badge badge-secondary mr-2">{keyword}</span></p>
            ))}
          </>
        )}
      </div>
  </div>
  </>
);

export default Info;
