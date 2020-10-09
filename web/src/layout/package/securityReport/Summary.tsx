import { isUndefined } from 'lodash';
import React from 'react';

import { VulnerabilitySeverity } from '../../../types';
import { SEVERITY_COLORS, SEVERITY_ORDER } from '../../../utils/data';
import sumObjectValues from '../../../utils/sumObjectValues';
import styles from './Summary.module.css';

interface Props {
  summary: {
    [key in VulnerabilitySeverity]?: number;
  };
}

const SecuritySummary = (props: Props) => {
  const total = sumObjectValues(props.summary);

  return (
    <div className="mb-4">
      <div className="h5 my-3">
        <span className="font-weight-bold">{total}</span> vulnerabilities have been detected in the{' '}
        <span className="font-weight-bold">default images</span> used by this package.
      </div>

      <div className="progress mb-4" style={{ height: '25px' }}>
        {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => {
          if (
            !props.summary!.hasOwnProperty(severity) ||
            isUndefined(props.summary![severity]) ||
            props.summary![severity] === 0
          )
            return null;
          return (
            <div
              key={`summary_${severity}`}
              className={`progress-bar text-dark px-1 font-weight-bold ${styles.progressBar}`}
              role="progressbar"
              style={{
                width: `${(props.summary[severity]! * 100) / total}%`,
                backgroundColor: SEVERITY_COLORS[severity],
              }}
            >
              <span className={`badge badge-pill badge-light text-center ${styles.badgeSummary}`}>
                {props.summary[severity]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SecuritySummary;
