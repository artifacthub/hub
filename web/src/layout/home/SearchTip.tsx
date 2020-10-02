import React, { useState } from 'react';
import { FaRegLightbulb } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import prepareQueryString from '../../utils/prepareQueryString';
import styles from './SearchTip.module.css';

const TIPS: JSX.Element[] = [
  <>
    Use <span className="font-weight-bold">multiple words</span> to refine your search. Example:{' '}
    <Link
      data-testid="sampleFilter"
      className="font-weight-bold textLight p-0"
      to={{
        pathname: '/packages/search',
        search: prepareQueryString({
          pageNumber: 1,
          tsQueryWeb: 'kafka operator',
          filters: {},
        }),
      }}
    >
      <u>kafka operator</u>
    </Link>
  </>,
  <>
    Use <span className="font-weight-bold">-</span> to exclude words from your search. Example:{' '}
    <Link
      data-testid="sampleFilter"
      className="font-weight-bold textLight p-0"
      to={{
        pathname: '/packages/search',
        search: prepareQueryString({
          pageNumber: 1,
          tsQueryWeb: 'apache -solr -hadoop',
          filters: {},
        }),
      }}
    >
      <u>apache -solr -hadoop</u>
    </Link>
  </>,
  <>
    Put a phrase inside <span className="font-weight-bold">double quotes</span> for an exact match. Example:{' '}
    <Link
      data-testid="sampleFilter"
      className="font-weight-bold textLight p-0"
      to={{
        pathname: '/packages/search',
        search: prepareQueryString({
          pageNumber: 1,
          tsQueryWeb: `"monitoring system"`,
          filters: {},
        }),
      }}
    >
      <u>"monitoring system"</u>
    </Link>
  </>,
  <>
    Use <span className="font-weight-bold">or</span> to combine multiple searches. Example:{' '}
    <Link
      data-testid="sampleFilter"
      className="font-weight-bold textLight p-0"
      to={{
        pathname: '/packages/search',
        search: prepareQueryString({
          pageNumber: 1,
          tsQueryWeb: 'postgresql or mysql',
          filters: {},
        }),
      }}
    >
      <u>postgresql or mysql</u>
    </Link>
  </>,
];

const SearchTip = () => {
  const getTip = () => {
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  };
  const [activeTip] = useState(getTip());

  return (
    <div className="d-none d-md-inline w-50 mx-auto text-center position-relative">
      <div
        className={`d-flex mt-2 pt-1 flex-row align-items-center justify-content-center textLight ${styles.tipText}`}
      >
        <FaRegLightbulb className="mr-1" />
        <div>
          <span className="font-weight-bold mr-1">Tip:</span>
          {activeTip}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SearchTip);
