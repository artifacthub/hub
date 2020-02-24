import React from 'react';
import styles from './Loading.module.css';

interface Props {
  className?: string;
}

const Loading = (props: Props) => (
  <div className={`position-absolute text-center p-5 ${styles.wrapper} ${props.className}`}>
    <div className={`spinner-border text-primary ${styles.spinner}`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

export default Loading;
