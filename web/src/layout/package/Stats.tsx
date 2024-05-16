import isUndefined from 'lodash/isUndefined';
import { FaUser } from 'react-icons/fa';
import { GrConnect } from 'react-icons/gr';
import { MdBusiness } from 'react-icons/md';

import { PackageStats } from '../../types';
import prettifyNumber from '../../utils/prettifyNumber';
import styles from './Stats.module.css';

interface Props {
  packageStats?: PackageStats;
  productionOrganizationsCount?: number;
}

const Stats = (props: Props) => {
  if (
    (isUndefined(props.packageStats) ||
      (props.packageStats.subscriptions === 0 && props.packageStats.webhooks === 0)) &&
    (isUndefined(props.productionOrganizationsCount) || props.productionOrganizationsCount === 0)
  )
    return null;

  return (
    <div className={`d-flex flex-row flex-wrap align-items-center border border-1 mt-3 px-2 ${styles.wrapper}`}>
      {!isUndefined(props.packageStats) && (
        <>
          {props.packageStats.subscriptions > 0 && (
            <div data-testid="subscriptions" className="d-flex flex-row align-items-baseline mx-2">
              <FaUser className={styles.icon} />
              <small className="text-muted text-uppercase mx-1">Subscriptions:</small>
              <span className="fw-bold">{prettifyNumber(props.packageStats.subscriptions)}</span>
            </div>
          )}

          {props.packageStats.webhooks > 0 && (
            <div data-testid="webhooks" className="d-flex flex-row align-items-baseline mx-2">
              <GrConnect className={styles.icon} />
              <small className="text-muted text-uppercase mx-1">Webhooks:</small>
              <span className="fw-bold">{prettifyNumber(props.packageStats.webhooks)}</span>
            </div>
          )}
        </>
      )}

      {!isUndefined(props.productionOrganizationsCount) && props.productionOrganizationsCount > 0 && (
        <div data-testid="productionUsers" className="d-none d-md-flex flex-row align-items-baseline mx-2">
          <MdBusiness className={styles.icon} />
          <small className="text-muted text-uppercase mx-1">Production users:</small>
          <span className="fw-bold">{prettifyNumber(props.productionOrganizationsCount)}</span>
        </div>
      )}
    </div>
  );
};

export default Stats;
