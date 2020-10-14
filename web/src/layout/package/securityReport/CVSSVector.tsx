import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React from 'react';

import { CVSSVectorMetric, CVSSVectorOpt, VulnerabilitySeverity } from '../../../types';
import { CVSS_VECTORS } from '../../../utils/data';
import formatCVSS from '../../../utils/formatCVSS';
import styles from './CVSSVector.module.css';

interface Props {
  CVSS: {
    [key: string]: {
      [key: string]: string | number;
    };
  };
  severity: VulnerabilitySeverity;
}

const AVAILABLE_SEVERITIES = [VulnerabilitySeverity.Critical, VulnerabilitySeverity.High, VulnerabilitySeverity.Medium];

const CVSSVector = (props: Props) => {
  const vector = props.CVSS && props.CVSS.nvd && props.CVSS.nvd.V2Vector;
  if (!AVAILABLE_SEVERITIES.includes(props.severity) || isUndefined(vector)) return null;
  const activeVector = formatCVSS(vector.toString());

  return (
    <>
      <div className="h6 mb-3 mt-1">CVSS v2 Vector</div>

      <div className="d-flex flex-row">
        {Object.keys(CVSS_VECTORS).map((metric: string, index: number) => (
          <div
            className={classnames('w-50', { 'pr-4': index === 0 }, { 'pl-4': index === 1 })}
            key={`metrics_${index}`}
          >
            <table className={`table table-bordered ${styles.table}`}>
              <thead>
                <tr>
                  <th colSpan={4} className=" text-center text-muted text-uppercase">
                    {metric}
                  </th>
                </tr>
              </thead>
              <tbody>
                {CVSS_VECTORS[metric].map((item: CVSSVectorMetric) => {
                  return (
                    <tr key={`metric_${index}_${item.value}`}>
                      <td className={`text-nowrap align-middle text-uppercase w-25 ${styles.tableLegend}`}>
                        <small>{item.label}</small>
                      </td>
                      {item.options.map((opt: CVSSVectorOpt) => {
                        const isActive = activeVector[item.value] === opt.value;
                        return (
                          <td
                            key={`metric_${index}_${item.value}_${opt.value}`}
                            className="text-muted w-25 text-center"
                          >
                            <div
                              data-testid={`metric_${item.value}_${opt.value}`}
                              className={classnames({
                                [`${styles.active} ${styles[`active${opt.level}`]}`]: isActive,
                              })}
                            >
                              <small className="text-truncate">{opt.label}</small>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
};

export default CVSSVector;
