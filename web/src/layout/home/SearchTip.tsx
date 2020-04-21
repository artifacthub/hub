import React, { useState } from 'react';
import { FaRegLightbulb } from 'react-icons/fa';

import styles from './SearchTip.module.css';

const TIPS: JSX.Element[] = [
  <>
    Use <span className="font-weight-bold">multiple words</span> to refine your search. Example:{' '}
    <span className="font-weight-bold">kafka operator</span>
  </>,
  <>
    Use <span className="font-weight-bold">-</span> to exclude words from your search. Example:{' '}
    <span className="font-weight-bold">apache -solr -hadoop</span>
  </>,
  <>
    Put a phrase inside <span className="font-weight-bold">double quotes</span> for an exact match. Example:{' '}
    <span className="font-weight-bold">"monitoring system"</span>
  </>,
  <>
    Use <span className="font-weight-bold">or</span> to combine multiple searches. Example:{' '}
    <span className="font-weight-bold">postgresql or mysql</span>
  </>,
];

const SearchTip = () => {
  const getTip = () => {
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  };
  const [activeTip] = useState(getTip());

  return (
    <div className="d-none d-md-inline w-50 mx-auto text-center position-relative">
      <div className={`d-flex mt-2 flex-row align-items-center justify-content-center text-light ${styles.tipText}`}>
        <FaRegLightbulb className="mr-1" />
        <div>
          <span className="font-weight-bold mr-1">Tip:</span>
          {activeTip}
        </div>
      </div>
    </div>
  );
};

export default SearchTip;
