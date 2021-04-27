import { isUndefined } from 'lodash';
import React from 'react';
import { FaUser } from 'react-icons/fa';
import { GrConnect } from 'react-icons/gr';

import { PackageStats } from '../../types';
import prettifyNumber from '../../utils/prettifyNumber';
import styles from './Stats.module.css';

interface Props {
  packageStats?: PackageStats;
}

const Stats = (props: Props) => {
  if (isUndefined(props.packageStats) || (props.packageStats.subscriptions === 0 && props.packageStats.webhooks === 0))
    return null;

  return (
    <div className="d-flex flex-row align-items-baseline mt-2">
      {props.packageStats.subscriptions > 0 && (
        <div className="d-flex flex-row align-items-baseline mr-3">
          <FaUser className={styles.icon} />
          <small className="text-muted text-uppercase mx-1">Subscriptions:</small>
          <span className="font-weight-bold">{prettifyNumber(props.packageStats.subscriptions)}</span>
        </div>
      )}

      {props.packageStats.webhooks > 0 && (
        <div className="d-flex flex-row align-items-baseline">
          <GrConnect className={styles.icon} />
          <small className="text-muted text-uppercase mx-1">Webhooks:</small>
          <span className="font-weight-bold">{prettifyNumber(props.packageStats.webhooks)}</span>
        </div>
      )}
    </div>
  );
};

export default Stats;
