import classnames from 'classnames';
import React, { useState } from 'react';

import styles from './Disclaimer.module.css';

const Disclaimer = () => {
  const [openStatus, setOpenStatus] = useState(true);

  return (
    <div
      className={classnames('alert alert-warning mb-0 py-2 px-3 rounded-0 text-center', styles.disclaimer, {
        'd-none': !openStatus,
      })}
      role="alert"
    >
      This is <strong>pre-alpha</strong> software and not for production use
      <button
        data-testid="disclaimerCloseBtn"
        type="button"
        className={`close position-absolute ${styles.close}`}
        onClick={() => setOpenStatus(false)}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
};

export default Disclaimer;
