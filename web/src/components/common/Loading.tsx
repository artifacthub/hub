import React from 'react';
import styles from './Loading.module.css';

const Loading = () => (
  <div className={`position-absolute text-center p-5 ${styles.wrapper}`}>
    <div className={`spinner-border ${styles.spinner}`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

export default Loading;
