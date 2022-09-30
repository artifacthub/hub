import { isUndefined } from 'lodash';

import { RepositoryKind, SecurityReportSummary, VulnerabilitySeverity } from '../../../types';
import { SEVERITY_ORDER, SEVERITY_RATING } from '../../../utils/data';
import styles from './Summary.module.css';

interface Props {
  repoKind: RepositoryKind;
  totalVulnerabilities: number;
  summary: SecurityReportSummary;
  fixableSummary: SecurityReportSummary;
  totalFixableVulnerabilities: number;
  allVulnerabilitiesAreFixable: boolean;
}

const SecuritySummary = (props: Props) => {
  const getVulnerabilitiesNumber = (): JSX.Element => {
    if (props.totalVulnerabilities > 0) {
      return <span className="fw-bold">{props.totalVulnerabilities}</span>;
    } else {
      return <>No</>;
    }
  };

  const getFixableVulnerabilitiesNumber = (): JSX.Element => {
    if (props.totalFixableVulnerabilities > 0) {
      return (
        <>
          (<span className="fw-bold">{props.totalFixableVulnerabilities}</span> fixable){' '}
        </>
      );
    } else {
      return <></>;
    }
  };

  const renderProgressBar = (summary: SecurityReportSummary, total: number, legend: string): JSX.Element | null => {
    if (total === 0) return null;
    return (
      <>
        <div className="fw-bold text-uppercase text-muted">
          <small>{legend}</small>
        </div>
        <div className="progress mb-4" style={{ height: '25px' }}>
          {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => {
            if (!summary.hasOwnProperty(severity) || isUndefined(summary[severity]) || summary[severity] === 0)
              return null;
            return (
              <div
                key={`summary_${severity}`}
                className={`progress-bar text-dark px-1 fw-bold ${styles.progressBar}`}
                role="progressbar"
                style={{
                  width: `${(summary[severity]! * 100) / total}%`,
                  backgroundColor: SEVERITY_RATING[severity]!.color,
                }}
                aria-label={`Vulnerabilities number - ${severity}`}
              >
                <span className={`badge rounded-pill bg-light text-dark text-center ${styles.badgeSummary}`}>
                  {summary[severity]}
                </span>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="mb-5">
      <div className="h5 my-3 pt-2">
        {getVulnerabilitiesNumber()} vulnerabilities {getFixableVulnerabilitiesNumber()} have been detected in this
        package's <span className="fw-bold">{props.repoKind === RepositoryKind.Container ? 'image' : 'images'}</span>.
      </div>

      {!props.allVulnerabilitiesAreFixable && (
        <>
          {renderProgressBar(
            props.fixableSummary,
            props.totalFixableVulnerabilities,
            `Fixable vulnerabilities (${props.totalFixableVulnerabilities})`
          )}
        </>
      )}

      {renderProgressBar(
        props.summary,
        props.totalVulnerabilities,
        props.allVulnerabilitiesAreFixable ? '' : `All vulnerabilities (${props.totalVulnerabilities})`
      )}
    </div>
  );
};

export default SecuritySummary;
