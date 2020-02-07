import React from 'react';
import { FiDownload } from 'react-icons/fi';
import { PackageDetail, PackageKind } from '../../types';
import Modal from '../common/Modal';
import ChartInstall from './ChartInstall';
import ModalHeader from './ModalHeader';
import styles from './Install.module.css';

interface Props {
  package: PackageDetail;
  buttonIcon?: boolean;
  buttonType?: string;
}

const Install = (props: Props) => (
  <Modal
    buttonType={props.buttonType}
    buttonTitle="Install"
    buttonIcon={props.buttonIcon ? <FiDownload className="mr-2" /> : undefined}
    header={<ModalHeader package={props.package} />}
    className={styles.wrapper}
  >
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

export default Install;
