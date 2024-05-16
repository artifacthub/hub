import classnames from 'classnames';
import isNumber from 'lodash/isNumber';
import isUndefined from 'lodash/isUndefined';
import { FaStar } from 'react-icons/fa';

import prettifyNumber from '../../utils/prettifyNumber';
import styles from './StarBadge.module.css';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  starsNumber?: number | any;
  className?: string;
  size?: 'xs' | 'sm';
}

const StarBadge = (props: Props) => {
  if (isUndefined(props.starsNumber) || !isNumber(props.starsNumber)) return null;
  return (
    <div
      data-testid="starBadge"
      className={classnames('badge bg-light text-dark border border-1', styles.badge, props.className, {
        [styles[`size-${props.size}`]]: !isUndefined(props.size),
      })}
      aria-label={`${props.starsNumber} stars`}
    >
      <div className="d-flex align-items-center">
        <FaStar className={`me-1 ${styles.icon}`} />
        <div>{prettifyNumber(props.starsNumber)}</div>
      </div>
    </div>
  );
};

export default StarBadge;
