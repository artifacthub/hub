import isUndefined from 'lodash/isUndefined';
import sample from 'lodash/sample';
import { memo, useState } from 'react';
import { FaRegLightbulb } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { SearchTipItem } from '../../types';
import { SEARH_TIPS } from '../../utils/data';
import { prepareQueryString } from '../../utils/prepareQueryString';
import styles from './SearchTip.module.css';

const SearchTip = () => {
  const [activeTip] = useState<SearchTipItem | undefined>(sample(SEARH_TIPS));

  if (isUndefined(activeTip)) return null;

  return (
    <div className="d-none d-md-inline w-50 mx-auto text-center position-relative">
      <div
        className={`d-flex mt-2 pt-1 flex-row align-items-center justify-content-center textLight ${styles.tipText}`}
      >
        <FaRegLightbulb className="me-1" />
        <div>
          <span className="fw-semibold me-1">Tip:</span>
          {activeTip.content} Example:{' '}
          <Link
            className="fw-semibold textLighter p-0"
            to={{
              pathname: '/packages/search',
              search: prepareQueryString({
                pageNumber: 1,
                tsQueryWeb: activeTip.example,
              }),
            }}
          >
            {activeTip.example}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default memo(SearchTip);
