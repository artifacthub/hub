import { isUndefined } from 'lodash';

import { VulnerabilitySeverity } from '../../../types';
import { SEVERITY_ORDER, SEVERITY_RATING } from '../../../utils/data';
import styles from './Summary.module.css';

interface Props {
  totalVulnerabilities: number;
  summary: {
    [key in VulnerabilitySeverity]?: number;
  };
}

const SecuritySummary = (props: Props) => {
  const getVulnerabilitiesNumber = (): JSX.Element => {
    if (props.totalVulnerabilities > 0) {
      return <span className="fw-bold">{props.totalVulnerabilities}</span>;
    } else {
      return <>No</>;
    }
  };

  return (
    <div className="mb-5">
      <div className="h5 my-3 pt-2">
        {getVulnerabilitiesNumber()} vulnerabilities have been detected in the{' '}
        <span className="fw-bold">default images</span> used by this package.
      </div>

      {props.totalVulnerabilities > 0 && (
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
                className={`progress-bar text-dark px-1 fw-bold ${styles.progressBar}`}
                role="progressbar"
                style={{
                  width: `${(props.summary[severity]! * 100) / props.totalVulnerabilities}%`,
                  backgroundColor: SEVERITY_RATING[severity]!.color,
                }}
                aria-label={`Vulnerabilites number - ${severity}`}
              >
                <span className={`badge rounded-pill bg-light text-dark text-center ${styles.badgeSummary}`}>
                  {props.summary[severity]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SecuritySummary;
