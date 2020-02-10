import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { PackageDetail } from '../../types';
import Modal from '../common/Modal';
import ModalHeader from './ModalHeader';
import Details from './Details';
import styles from './Install.module.css';

interface Props {
  package: PackageDetail;
}

const InfoMobile = (props: Props) => (
  <Modal
    buttonType="btn-outline-secondary"
    buttonTitle="Info"
    buttonIcon={<FiPlus className="mr-2" />}
    header={<ModalHeader package={props.package} />}
    className={styles.wrapper}
  >
    <Details package={props.package} />
  </Modal>
);

export default InfoMobile;
