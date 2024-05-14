import isUndefined from 'lodash/isUndefined';
import sampleSize from 'lodash/sampleSize';
import { Fragment, memo } from 'react';
import { Link } from 'react-router-dom';

import getSampleQueries from '../../utils/getSampleQueries';
import styles from './SampleQueries.module.css';

interface Props {
  className?: string;
  lineBreakIn?: number;
}

interface SampleQuery {
  name: string;
  querystring: string;
}

const QUERIES_NUMBER = 5;

const SampleQueries = (props: Props) => {
  const sampleQueries: SampleQuery[] = getSampleQueries();
  if (sampleQueries.length === 0) {
    return null;
  }
  const queries = sampleQueries.length > QUERIES_NUMBER ? sampleSize(sampleQueries, QUERIES_NUMBER) : sampleQueries;

  return (
    <>
      {queries.map((query: SampleQuery, index: number) => (
        <Fragment key={`sampleQuery_${index}`}>
          <Link
            className={`badge border border-1 fw-normal mx-2 mt-3 ${styles.sampleQuery} ${props.className}`}
            to={{
              pathname: '/packages/search',
              search: `?${query.querystring}`,
            }}
            aria-label={`Filter by ${query.name}`}
          >
            {query.name}
          </Link>
          {!isUndefined(props.lineBreakIn) && index === props.lineBreakIn - 1 && (
            <div className="d-block w-100" data-testid="sampleQueryBreakLine" />
          )}
        </Fragment>
      ))}
    </>
  );
};

export default memo(SampleQueries);
