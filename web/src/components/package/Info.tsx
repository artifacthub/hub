import React from 'react';
import { PackageDetail } from '../../types';
import Details from './Details';
import Install from './Install';
import styles from './Info.module.css';

interface Props {
  package: PackageDetail;
}

const Info = (props: Props) => (
  <>
    <Install package={props.package} buttonIcon={false} />

    <div className={`card shadow-sm position-relative ${styles.info}`}>
      <div className="card-body">
        <Details package={props.package} />
      </div>
    </div>
  </>
);

export default Info;
