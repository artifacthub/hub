import classnames from 'classnames';
import { isNumber, isUndefined } from 'lodash';
import React from 'react';
import { FaStar } from 'react-icons/fa';

import prettifyNumber from '../../utils/prettifyNumber';
import styles from './StarBadge.module.css';

interface Props {
  starsNumber?: number | any;
  className?: string;
  size?: 'xs' | 'sm';
}

const StarBadge = (props: Props) => {
  if (isUndefined(props.starsNumber) || !isNumber(props.starsNumber)) return null;
  return (
    <div
      data-testid="starBadge"
      className={classnames('badge badge-pill badge-light', styles.badge, props.className, {
        [styles[`size-${props.size}`]]: !isUndefined(props.size),
      })}
      aria-label={`${props.starsNumber} stars`}
    >
      <div className="d-flex align-items-center">
        <FaStar className={`mr-1 ${styles.icon}`} />
        <div>{prettifyNumber(props.starsNumber)}</div>
      </div>
    </div>
  );
};

export default StarBadge;
