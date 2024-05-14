import compact from 'lodash/compact';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import uniqWith from 'lodash/uniqWith';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { prepareQueryString } from '../../utils/prepareQueryString';
import SmallTitle from '../common/SmallTitle';
import styles from './Keywords.module.css';

interface Props {
  keywords?: string[] | null;
  deprecated?: boolean | null;
}

const Keywords = (props: Props) => {
  const navigate = useNavigate();

  const cleanKeywords = (): string[] => {
    let keywords: string[] = [];

    if (!isUndefined(props.keywords) && !isNull(props.keywords)) {
      keywords = uniqWith(compact(props.keywords), (a: string, b: string) => a.toLowerCase() === b.toLowerCase());
    }

    return keywords;
  };

  const [keywords, setKeywords] = useState<string[]>(cleanKeywords());

  useEffect(() => {
    setKeywords(cleanKeywords());
  }, [props.keywords]);

  if (keywords.length === 0) return null;

  return (
    <>
      <SmallTitle text="Keywords" id="keywords-list" />
      <div className="mb-3" role="list" aria-describedby="keywords-list">
        <span data-testid="keywords">
          {keywords.map((keyword: string) => (
            <button
              className={`btn btn-sm d-inline badge fw-normal me-2 mb-2 mb-sm-0 mw-100 ${styles.badge}`}
              key={keyword}
              onClick={() => {
                navigate({
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
      </div>
    </>
  );
};

export default Keywords;
