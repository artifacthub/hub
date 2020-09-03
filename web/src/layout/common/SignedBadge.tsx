import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FaAward } from 'react-icons/fa';

import { RepositoryKind } from '../../types';
import Label from './Label';
import styles from './SignedBadge.module.css';

interface Props {
  signed: null | boolean;
  className?: string;
  repositoryKind?: RepositoryKind;
}

const SignedBadge = (props: Props) => {
  if (isNull(props.signed) || !props.signed) return null;

  return (
    <div data-testid="signedBadge" className={`${props.className} ${styles.badgeWrapper}`}>
      <Label text="Signed" icon={<FaAward />} labelStyle="success" />

      {!isUndefined(props.repositoryKind) && props.repositoryKind === RepositoryKind.Helm && (
        <div className="position-absolute">
          <div className={`tooltip bs-tooltip-bottom ${styles.tooltip}`} role="tooltip">
            <div className={`arrow ${styles.tooltipArrow}`} />
            <div className={`tooltip-inner ${styles.tooltipContent}`}>This chart has a provenance file</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignedBadge;
