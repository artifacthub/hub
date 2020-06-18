import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FaAward } from 'react-icons/fa';

import { PackageKind } from '../../types';
import styles from './SignedBadge.module.css';

interface Props {
  signed: null | boolean;
  packageKind?: PackageKind;
}

const SignedBadge = (props: Props) => {
  if (isNull(props.signed) || !props.signed) return null;
  return (
    <div data-testid="signedBadge" className={`position-relative ${styles.badgeWrapper}`}>
      <div className={`d-none d-sm-flex badge badge-pill ml-3 mt-1 text-uppercase ${styles.badge}`}>
        <div className="d-flex flex-row">
          <FaAward className="mr-1" />
          <div>Signed</div>
        </div>
      </div>
      {!isUndefined(props.packageKind) && props.packageKind === PackageKind.Chart && (
        <div className={`d-none d-sm-block tooltip bs-tooltip-bottom ${styles.tooltip}`} role="tooltip">
          <div className={`arrow ${styles.tooltipArrow}`} />
          <div className={`tooltip-inner ${styles.tooltipContent}`}>This chart has a provenance file</div>
        </div>
      )}
    </div>
  );
};

export default SignedBadge;
