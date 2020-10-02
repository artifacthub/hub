import { compact } from 'lodash';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import uniq from 'lodash/uniq';
import React from 'react';
import { useHistory } from 'react-router-dom';

import prepareQueryString from '../../utils/prepareQueryString';
import styles from './Keywords.module.css';

interface Props {
  keywords?: string[] | null;
  deprecated?: boolean | null;
}

const Keywords = (props: Props) => {
  const history = useHistory();

  const cleanKeywords = (): string[] => {
    let keywords: string[] = [];

    if (!isUndefined(props.keywords) && !isNull(props.keywords)) {
      keywords = uniq(compact(props.keywords));
    }

    return keywords;
  };

  return (
    <div className="mb-3">
      {isUndefined(props.keywords) || isNull(props.keywords) || props.keywords.length === 0 ? (
        <p data-testid="keywords">-</p>
      ) : (
        <span data-testid="keywords">
          {cleanKeywords().map((keyword: string) => (
            <button
              data-testid="keywordBtn"
              className={`btn btn-sm d-inline badge font-weight-normal mr-2 mb-2 mb-sm-0 mw-100 ${styles.badge}`}
              key={keyword}
              onClick={() => {
                history.push({
                  pathname: '/packages/search',
                  search: prepareQueryString({
                    tsQueryWeb: keyword,
                    pageNumber: 1,
                    filters: {},
                    deprecated: props.deprecated,
                  }),
                });
              }}
            >
              <div className="text-truncate">{keyword}</div>
            </button>
          ))}
        </span>
      )}
    </div>
  );
};

export default Keywords;
