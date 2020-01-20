import React from 'react';
import styles from './NoData.module.css';

interface Props {
  content: string;
}

const NoData = (props: Props) => (
  <div className="ml-auto mr-auto mt-5 w-75 text-center p-5 border bg-light">
    <div className={styles.text}>{props.content}</div>
  </div>
);

export default NoData;
