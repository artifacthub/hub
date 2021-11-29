import { compact } from 'lodash';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import uniq from 'lodash/uniq';
import { useHistory } from 'react-router-dom';

import { prepareQueryString } from '../../utils/prepareQueryString';
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
    <div className="mb-3" role="list" aria-describedby="keywords-list">
      {isUndefined(props.keywords) || isNull(props.keywords) || props.keywords.length === 0 ? (
        <p data-testid="keywords" role="listitem">
          -
        </p>
      ) : (
        <span data-testid="keywords">
          {cleanKeywords().map((keyword: string) => (
            <button
              className={`btn btn-sm d-inline badge font-weight-normal mr-2 mb-2 mb-sm-0 mw-100 ${styles.badge}`}
              key={keyword}
              onClick={() => {
                history.push({
                  pathname: '/packages/search',
                  search: prepareQueryString({
                    tsQueryWeb: keyword,
                    pageNumber: 1,
                    deprecated: props.deprecated,
                  }),
                });
              }}
              aria-label={`Filter by ${keyword}`}
              role="listitem"
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
