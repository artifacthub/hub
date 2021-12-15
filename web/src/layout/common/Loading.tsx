import classnames from 'classnames';
import { isUndefined } from 'lodash';

import styles from './Loading.module.css';

interface Props {
  className?: string;
  spinnerClassName?: string;
  smallSize?: boolean;
}

const Loading = (props: Props) => (
  <div
    className={classnames(
      'position-absolute top-0 bottom-0 start-0 end-0',
      { 'p-5': isUndefined(props.smallSize) || !props.smallSize },
      styles.wrapper,
      props.className
    )}
  >
    <div className="d-flex flex-row align-items-center justify-content-center w-100 h-100">
      <div
        className={classnames(
          'spinner-border text-primary',
          { [styles.spinner]: isUndefined(props.smallSize) || !props.smallSize },
          { [styles.miniSpinner]: props.smallSize },
          props.spinnerClassName
        )}
        role="status"
      >
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  </div>
);

export default Loading;
