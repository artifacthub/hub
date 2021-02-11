import classnames from 'classnames';
import { isNull } from 'lodash';
import React, { useState } from 'react';

import styles from './BannerMOTD.module.css';

interface MOTDSeverity {
  [keys: string]: string;
}

const SEVERITIES: MOTDSeverity = { warning: 'warning', info: 'info', error: 'danger' };

const BannerMOTD = () => {
  const [openStatus, setOpenStatus] = useState(true);
  const motd: string | null =
    (window as any).config &&
    (window as any).config.hasOwnProperty('motd') &&
    (window as any).config.motd !== '' &&
    (window as any).config.motd !== '{{ .motd }}'
      ? (window as any).config.motd
      : null;

  if (isNull(motd) || !openStatus) return null;

  const motdSeverity: string | null =
    (window as any).config &&
    (window as any).config.hasOwnProperty('motdSeverity') &&
    Object.keys(SEVERITIES).includes((window as any).config.motdSeverity)
      ? (window as any).config.motdSeverity
      : null;

  const severityType = motdSeverity ? SEVERITIES[motdSeverity] : 'info';

  return (
    <div
      className={classnames(
        'alert mb-0 py-2 rounded-0 text-center',
        `alert-${severityType} ${styles[`${severityType}Alert`]}`,
        styles.wrapper
      )}
      role="alert"
    >
      <div className="container-lg px-sm-4 px-lg-0">{motd}</div>

      <button
        data-testid="closeBannerMOTD"
        type="button"
        className={`close position-absolute ${styles.close}`}
        onClick={() => setOpenStatus(false)}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
};

export default BannerMOTD;
