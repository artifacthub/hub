import classnames from 'classnames';
import { isNull } from 'lodash';
import React, { useState } from 'react';

import getMetaTag from '../../utils/getMetaTag';
import styles from './BannerMOTD.module.css';

interface MOTDSeverity {
  [keys: string]: string;
}

const SEVERITIES: MOTDSeverity = { warning: 'warning', info: 'info', error: 'danger' };

const BannerMOTD = () => {
  const [openStatus, setOpenStatus] = useState(true);

  const motdTag: string | null = getMetaTag('motd');
  const motd = !isNull(motdTag) && motdTag !== '' && motdTag !== '{{ .motd }}' ? motdTag : null;

  if (isNull(motd) || !openStatus) return null;

  const motdSeverity: string | null = getMetaTag('motdSeverity');
  const severityType = motdSeverity ? SEVERITIES[motdSeverity] : 'info';

  return (
    <div
      className={classnames(
        'alert mb-0 py-2 rounded-0 text-center',
        `alert-${severityType} ${styles[`${severityType}Alert`]}`,
        styles.wrapper
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="container-lg px-sm-4 px-lg-0">{motd}</div>

      <button
        data-testid="closeBannerMOTD"
        type="button"
        className={`close position-absolute ${styles.close}`}
        onClick={() => setOpenStatus(false)}
        aria-label="Close"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
};

export default BannerMOTD;
