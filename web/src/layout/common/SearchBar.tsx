import classnames from 'classnames';
import isNull from 'lodash/isNull';
import React, { useEffect, useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useHistory } from 'react-router-dom';

import prepareQueryString from '../../utils/prepareQueryString';
import styles from './SearchBar.module.css';
import SearchTipsModal from './SearchTipsModal';

interface Props {
  formClassName?: string;
  tsQueryWeb?: string;
  size: 'big' | 'normal';
  isSearching: boolean;
}

const SearchBar = (props: Props) => {
  const history = useHistory();
  const [value, setValue] = useState(props.tsQueryWeb || '');
  const inputEl = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setValue(e.target.value);
  };

  const cleanSearch = (): void => {
    setValue('');
    forceFocus();
  };

  const forceFocus = (): void => {
    if (!isNull(inputEl) && !isNull(inputEl.current)) {
      inputEl.current.focus();
    }
  };

  const forceBlur = (): void => {
    if (!isNull(inputEl) && !isNull(inputEl.current)) {
      inputEl.current.blur();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      forceBlur();

      history.push({
        pathname: '/packages/search',
        search: prepareQueryString({
          pageNumber: 1,
          tsQueryWeb: value || undefined,
          filters: {},
        }),
      });
    }
  };

  useEffect(() => {
    setValue(props.tsQueryWeb || '');
  }, [props.tsQueryWeb]);

  return (
    <>
      <div className={`position-relative ${props.formClassName}`}>
        <div
          className={`d-flex align-items-strecht overflow-hidden searchBar ${styles.searchBar} ${styles[props.size]}`}
        >
          <div
            data-testid="searchBarIcon"
            className={`d-none d-sm-flex align-items-center ${styles.iconWrapper}`}
            onClick={forceFocus}
          >
            <FiSearch />
          </div>

          <input
            ref={inputEl}
            className={`flex-grow-1 pl-sm-0 pl-3 ${styles.input}`}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            placeholder="Search packages"
            aria-label="Search"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            disabled={props.isSearching}
          />

          {props.isSearching && (
            <div
              className={classnames('position-absolute text-secondary', styles.loading, {
                [styles.bigLoading]: props.size === 'big',
              })}
            >
              <span data-testid="searchBarSpinning" className="spinner-border spinner-border-sm" />
            </div>
          )}

          <button
            data-testid="cleanBtn"
            type="button"
            className={classnames('close', styles.inputClean, { invisible: value === '' || props.isSearching })}
            aria-label="Close"
            onClick={cleanSearch}
          >
            <span aria-hidden="true">&times;</span>
          </button>

          <SearchTipsModal size={props.size} />
        </div>
      </div>
    </>
  );
};

export default React.memo(SearchBar);
