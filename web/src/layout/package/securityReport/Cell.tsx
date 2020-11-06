import { isUndefined } from 'lodash';
import moment from 'moment';
import React from 'react';
import { FaCaretDown, FaCaretRight, FaLink } from 'react-icons/fa';

import { Vulnerability, VulnerabilitySeverity } from '../../../types';
import { SEVERITY_RATING } from '../../../utils/data';
import ExternalLink from '../../common/ExternalLink';
import styles from './Cell.module.css';
import CVSSVector from './CVSSVector';

interface Props {
  index: number;
  vulnerability: Vulnerability;
  visibleVulnerability?: string;
  setVisibleVulnerability: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const SecurityCell = (props: Props) => {
  const getMainReference = (): JSX.Element | null => {
    if (isUndefined(props.vulnerability.References) || props.vulnerability.References.length === 0) {
      return null;
    }

    let reference = props.vulnerability.References.find((ref: string) =>
      ref.includes(props.vulnerability.VulnerabilityID)
    );
    if (isUndefined(reference)) {
      reference = props.vulnerability.References[0];
    }

    return (
      <ExternalLink href={reference} className={`ml-2 text-dark position-relative ${styles.link}`}>
        <small>
          <FaLink />
        </small>
      </ExternalLink>
    );
  };

  const severity: VulnerabilitySeverity = props.vulnerability.Severity.toLowerCase() as VulnerabilitySeverity;
  const isExpanded = props.visibleVulnerability === `${props.vulnerability.VulnerabilityID}_${props.index}`;

  return (
    <>
      <tr
        data-testid="vulnerabilityCell"
        className={styles.clickableCell}
        onClick={() =>
          props.setVisibleVulnerability(
            !isExpanded ? `${props.vulnerability.VulnerabilityID}_${props.index}` : undefined
          )
        }
      >
        <td className="align-middle text-primary">{isExpanded ? <FaCaretDown /> : <FaCaretRight />}</td>
        <td className="align-middle text-nowrap">
          {props.vulnerability.VulnerabilityID}
          {getMainReference()}
        </td>
        <td className="align-middle text-nowrap text-uppercase">
          <div className="d-flex flex-row align-items-center">
            <span
              data-testid="severityBadge"
              className={`badge p-2 mr-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[severity]!.color,
              }}
            >
              {' '}
            </span>
            <small>{props.vulnerability.Severity}</small>
          </div>
        </td>
        <td className="align-middle text-nowrap">{props.vulnerability.PkgName}</td>
        <td className="align-middle text-nowrap">{props.vulnerability.InstalledVersion}</td>
        <td className="align-middle text-nowrap" data-testid="fixedVersionCell">
          {props.vulnerability.FixedVersion ? (
            <>{JSON.parse(`"${props.vulnerability.FixedVersion}"`)}</>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>
      </tr>

      {isExpanded && (
        <tr data-testid="vulnerabilityDetail" className={styles.noClickableCell}>
          <td colSpan={6}>
            <div className="m-3">
              {isUndefined(props.vulnerability.title) && isUndefined(props.vulnerability.Description) ? (
                <div className="font-italic">Any information about this vulnerability</div>
              ) : (
                <>
                  <div className="h6">{props.vulnerability.Title}</div>
                  {props.vulnerability.Description && (
                    <p className="text-muted mb-1">{props.vulnerability.Description}</p>
                  )}
                  <div className="d-flex flex-column text-right">
                    {!isUndefined(props.vulnerability.LastModifiedDate) && (
                      <small className="font-italic">
                        Updated {moment(props.vulnerability.LastModifiedDate).fromNow()}
                      </small>
                    )}
                  </div>
                  {props.vulnerability.CVSS && (
                    <CVSSVector
                      source={props.vulnerability.SeveritySource}
                      severity={severity}
                      CVSS={props.vulnerability.CVSS || {}}
                    />
                  )}
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default SecurityCell;
