import { isUndefined } from 'lodash';
import moment from 'moment';
import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { FaCaretDown, FaCaretRight, FaLink } from 'react-icons/fa';

import { Vulnerability, VulnerabilitySeverity } from '../../../types';
import { SEVERITY_RATING } from '../../../utils/data';
import isFuture from '../../../utils/isFuture';
import ExternalLink from '../../common/ExternalLink';
import styles from './Cell.module.css';
import CVSSVector from './CVSSVector';

interface Props {
  name: string;
  vulnerability: Vulnerability;
  isExpanded: boolean;
  setVisibleVulnerability: Dispatch<SetStateAction<string | undefined>>;
}

const SecurityCell = (props: Props) => {
  const ref = useRef<HTMLTableRowElement>(null);

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
      <ExternalLink
        href={reference}
        className={`ml-2 text-dark position-relative ${styles.link}`}
        label={`Link to ${props.vulnerability.VulnerabilityID} vulnerability`}
      >
        <small>
          <FaLink />
        </small>
      </ExternalLink>
    );
  };

  const severity: VulnerabilitySeverity = props.vulnerability.Severity.toLowerCase() as VulnerabilitySeverity;

  useEffect(() => {
    // Scrolls content into view when a vulnerability is expanded
    if (props.isExpanded && ref && ref.current) {
      ref.current.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
    }
  }, [props.isExpanded]);

  return (
    <>
      <tr
        data-testid="vulnerabilityCell"
        className={styles.clickableCell}
        onClick={() => props.setVisibleVulnerability(!props.isExpanded ? props.name : undefined)}
        ref={ref}
      >
        <td className="align-middle text-primary">{props.isExpanded ? <FaCaretDown /> : <FaCaretRight />}</td>
        <td className="align-middle text-nowrap pr-3">
          {props.vulnerability.VulnerabilityID}
          {getMainReference()}
        </td>
        <td className="align-middle text-nowrap text-uppercase pr-3">
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
        <td className="align-middle text-nowrap pr-3 w-25">
          <div className={`d-table w-100 ${styles.wrapperCell}`}>
            <div className="text-truncate">{props.vulnerability.PkgName}</div>
          </div>
        </td>
        <td className="align-middle text-nowrap pr-3 w-25">
          <div className={`d-table w-100 ${styles.wrapperCell}`}>
            <div className="text-truncate">{props.vulnerability.InstalledVersion}</div>
          </div>
        </td>
        <td className="align-middle text-nowrap pr-3 w-25" data-testid="fixedVersionCell">
          {props.vulnerability.FixedVersion ? (
            <div className={`d-table w-100 ${styles.wrapperCell}`}>
              <div className="text-truncate">{JSON.parse(`"${props.vulnerability.FixedVersion}"`)}</div>
            </div>
          ) : (
            <span className="text-muted">-</span>
          )}
        </td>
      </tr>

      {props.isExpanded && (
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
                    {!isUndefined(props.vulnerability.LastModifiedDate) &&
                      !isFuture(props.vulnerability.LastModifiedDate, false) && (
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
