import React from 'react';

import styles from './Loading.module.css';

interface Props {
  className?: string;
  spinnerClassName?: string;
}

const Loading = (props: Props) => (
  <div className={`position-absolute p-5 ${styles.wrapper} ${props.className}`}>
    <div className="d-flex flex-row align-items-center justify-content-center w-100 h-100">
      <div className={`spinner-border text-primary ${styles.spinner} ${props.spinnerClassName}`} role="status">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  </div>
);

export default Loading;
