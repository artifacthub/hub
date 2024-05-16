import classnames from 'classnames';
import groupBy from 'lodash/groupBy';
import isUndefined from 'lodash/isUndefined';
import rangeRight from 'lodash/rangeRight';
import moment from 'moment';
import { useEffect, useState } from 'react';

import { Version } from '../../types';
import SmallTitle from '../common/SmallTitle';
import styles from './LastYearActivity.module.css';

interface Props {
  versions: Version[];
}

interface SortedVersions {
  [key: string]: Version[];
}

const LastYearActivity = (props: Props) => {
  const prepareMonths = (): string[] => {
    return rangeRight(12).map((n: number) => {
      return moment().subtract(n, 'months').startOf('month').format('MM/YY');
    });
  };

  const [versions, setVersions] = useState<SortedVersions | undefined>();
  const [months] = useState<string[]>(prepareMonths());
  useEffect(() => {
    const prepareVersionsList = () => {
      const sortedVersions = groupBy(props.versions, (v) => moment.unix(v.ts).startOf('month').format('MM/YY'));
      setVersions(sortedVersions);
    };

    prepareVersionsList();
  }, [props.versions]);

  const getLevel = (releases: Version[] | undefined): number => {
    if (isUndefined(releases)) {
      return 0;
    } else {
      const releasesNumber = releases.length;
      if (releasesNumber > 5) {
        return 4;
      } else if (releasesNumber >= 3 && releasesNumber <= 5) {
        return 3;
      }
      return releasesNumber;
    }
  };

  if (isUndefined(versions)) return null;

  return (
    <>
      <SmallTitle text="Last year activity" />
      <div data-testid="lastYearActivity" className={`d-flex flex-column w-100 mb-3 ${styles.heatMap}`}>
        <div className="d-flex flex-row justify-content-between w-100">
          {months.map((month: string) => {
            const level = getLevel(versions[month]);
            return (
              <div key={`activity_${month}`} className="position-relative">
                <div
                  data-testid="heatMapCell"
                  className={classnames(
                    'position-relative border border-1',
                    styles.heatMapCell,
                    styles[`level${level}`],
                    {
                      border: level === 0,
                    }
                  )}
                />
                <div data-testid="heatMapPopover" className={`tooltip popover end-0 ${styles.popover}`} role="tooltip">
                  <div className={`popover-header lh-1 p-2 ${styles.popoverHeader}`}>
                    {moment(month, 'MM/YY').format("MMM'YY")}
                  </div>
                  <div className="popover-body text-nowrap">
                    <div className="d-flex flex-row align-items-center">
                      <div className={`me-2 border border-1 top-0 ${styles.marker} ${styles[`level${level}`]}`} />
                      Releases: <span className="fw-bold ms-2">{versions[month] ? versions[month].length : 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className={`d-flex flex-row justify-content-between w-100 ${styles.legend}`}>
          <div>
            <small className="text-muted">{moment(months[0], 'MM/YY').format("MMM'YY")}</small>
          </div>
          <div>
            <small className="text-muted">{moment(months[5], 'MM/YY').format("MMM'YY")}</small>
          </div>
          <div>
            <small className="text-muted">{moment(months[months.length - 1], 'MM/YY').format("MMM'YY")}</small>
          </div>
        </div>
      </div>
    </>
  );
};

export default LastYearActivity;
