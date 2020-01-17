import React from 'react';
import { GiEnvelope } from 'react-icons/gi';
import { MaintainerInfo } from '../../types';
import styles from './Maintainer.module.css';

const Maintainer = (props: MaintainerInfo) => (
  <div className="mb-1">
    <a className={styles.link} href={`mailto:${props.email}`} role="button">
      <GiEnvelope className="text-muted mr-2" />
      {props.name}
    </a>
  </div>
);

export default Maintainer;
