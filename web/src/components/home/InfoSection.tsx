import React from 'react';
import styles from './InfoSection.module.css';
import CountUpNumber from './CountUpNumber';
import isNull from 'lodash/isNull';

interface Props {
  type: 'packages' | 'releases';
  isLoading: boolean;
  stats: {
    packages: number;
    releases: number;
  } | null;
}

const InfoSection = (props: Props) => (
  <div className={`text-center ${styles.counterWrapper}`}>
    {props.isLoading ? (
      <h3><div className="spinner-grow text-primary" /></h3>
    ) : (
      <>
        {isNull(props.stats) ? (
          <h3>-</h3>
        ) : (
          <CountUpNumber number={props.stats[props.type]} />
        )}
      </>
    )}
    <small className="text-uppercase">{props.type}</small>
  </div>
);

export default InfoSection;
