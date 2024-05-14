import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';

import { CVSSVectorMetric, CVSSVectorOpt, VulnerabilitySeverity } from '../../../types';
import { CVSS_V2_VECTORS, CVSS_V3_VECTORS } from '../../../utils/data';
import formatCVSS from '../../../utils/formatCVSS';
import styles from './CVSSVector.module.css';

interface Props {
  source?: string;
  CVSS: {
    [key: string]: {
      [key: string]: string | number;
    };
  };
  severity: VulnerabilitySeverity;
}

const CVSSVector = (props: Props) => {
  const sources = Object.keys(props.CVSS);
  if (sources.length === 0) return null;
  const activeSource = !isUndefined(props.source) && sources.includes(props.source) ? props.source : sources[0];
  const vectorSource = props.CVSS[activeSource];
  const vector = vectorSource.V3Vector || vectorSource.V2Vector;
  const vectors = isUndefined(vectorSource.V3Vector) ? CVSS_V2_VECTORS : CVSS_V3_VECTORS;
  const score = isUndefined(vectorSource.V3Vector) ? vectorSource.V2Score : vectorSource.V3Score;
  const activeVector = formatCVSS(vector.toString());

  return (
    <>
      <div className="d-flex flex-row align-items-baseline mt-3">
        <div className="h6">CVSS {isUndefined(vectorSource.V3Vector) ? 'v2' : 'v3'} Vector</div>
        <div className="ms-2">
          (<small className="text-muted text-uppercase">Source: </small>
          {activeSource})
        </div>
      </div>

      {score && (
        <div className="d-flex flex-row align-items-baseline mt-2">
          <div className="fw-bold text-muted text-uppercase me-2">Score:</div>
          <div className="fw-bold">{score}</div>
        </div>
      )}

      <div className="d-flex flex-row flex-wrap">
        {Object.keys(vectors).map((metric: string, index: number) => (
          <div className={classnames('mt-3', styles.metrics, { 'pe-4': index === 0 })} key={`metrics_${index}`}>
            <div className="fw-bold text-muted text-uppercase mb-3">{metric}</div>
            {vectors[metric].map((item: CVSSVectorMetric) => {
              return (
                <div className="d-flex flex-row flex-nowrap mb-2" key={`metric_${index}_${item.value}`}>
                  <div className={`text-muted text-uppercase ${styles.legend}`}>{item.label}: </div>
                  {item.options.map((opt: CVSSVectorOpt) => {
                    const isActive = activeVector[item.value] === opt.value;
                    return (
                      <div
                        key={`metric_${index}_${item.value}_${opt.value}`}
                        data-testid={`metric_${item.value}_${opt.value}`}
                        className={classnames('ms-2 text-center px-1', styles.badge, {
                          [`fw-bold opacity-100 ${styles[`active${opt.level}`]}`]: isActive,
                        })}
                      >
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
};

export default CVSSVector;
