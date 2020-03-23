import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { useHistory } from 'react-router-dom';

import prepareQueryString from '../../utils/prepareQueryString';
import styles from './Keywords.module.css';

interface Props {
  keywords?: string[] | null;
}

const Keywords = (props: Props) => {
  const history = useHistory();

  return (
    <>
      {isUndefined(props.keywords) || isNull(props.keywords) || props.keywords.length === 0 ? (
        <p data-testid="keywords">-</p>
      ) : (
        <span data-testid="keywords">
          {props.keywords.map((keyword: string) => (
            <button
              className={`btn btn-sm d-inline badge font-weight-normal mr-2 mb-2 mb-sm-0 ${styles.badge}`}
              key={keyword}
              onClick={() => {
                history.push({
                  pathname: '/search',
                  search: prepareQueryString({
                    text: keyword,
                    pageNumber: 1,
                    filters: {},
                    deprecated: false,
                  }),
                });
              }}
            >
              {keyword}
            </button>
          ))}
        </span>
      )}
    </>
  );
};

export default Keywords;
