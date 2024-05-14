import isUndefined from 'lodash/isUndefined';

import Badge from './Badge';
import styles from './Badge.module.css';

interface Props {
  className?: string;
  dropdownAlignment?: 'start' | 'end';
  inRepo?: boolean;
}

const CNCF = (props: Props) => {
  return (
    <Badge
      title="CNCF"
      icon={<img src="/static/media/cncf-icon.svg" alt="CNCF icon" className={styles.cncf} />}
      active
      className={props.className}
      dropdownAlignment={props.dropdownAlignment}
      popoverContent={
        <>
          <div className="fs-6 fw-semibold border-bottom border-1 mb-3 pb-1">CNCF</div>

          <p className="mb-0">
            This {!isUndefined(props.inRepo) && props.inRepo ? 'repository' : 'package'} has been published by a{' '}
            <span className="fw-bold">CNCF project</span>.
          </p>
        </>
      }
    />
  );
};

export default CNCF;
