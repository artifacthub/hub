import React from 'react';
import { PackageDetail, PackageKind } from '../../types';
import Modal from '../common/Modal';
import Image from '../common/Image';
import styles from './Install.module.css';
import ChartInstall from './ChartInstall';

interface Props {
  package: PackageDetail;
}

const Install = (props: Props) => {
  console.log(props);
  const header = (
    <>
      <div className="d-flex align-items-center">
        <div className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper}`}>
          <Image className={styles.image} alt={props.package.name} src={props.package.logo_url} />
        </div>

        <div className="ml-3">
          <h5 className="mb-0">{props.package.display_name || props.package.name}</h5>
        </div>
      </div>
    </>
  );

  return (
    <Modal buttonTitle="Install" header={header} className={styles.wrapper}>
      <>
        {(() => {
          switch (props.package.kind) {
            case PackageKind.Chart:
              return (
                <ChartInstall name={props.package.name} version={props.package.version} repository={props.package.chart_repository} />
              );
            default:
              return null;
          }
        })()}
      </>
    </Modal>
  );
};

export default Install;
