import React from 'react';

import styles from './LoadingBar.module.css';

const LoadingBar = () => (
  <div className={`position-fixed ${styles.wrapper}`}>
    <div className={`${styles.progressLine} progressLine`} role="status" />
  </div>
);

export default LoadingBar;
