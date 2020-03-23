import classnames from 'classnames';
import isNull from 'lodash/isNull';
import React, { useEffect, useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useHistory } from 'react-router-dom';

import prepareQueryString from '../../utils/prepareQueryString';
import styles from './SearchBar.module.css';

interface Props {
  formClassName?: string;
  text?: string;
  size: 'big' | 'normal';
  isSearching: boolean;
}

const SearchBar = (props: Props) => {
  const history = useHistory();
  const [value, setValue] = useState(props.text || '');
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

  useEffect(() => {
    setValue(props.text || '');
  }, [props.text]);

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      // When return key is pressed
      if (e.keyCode === 13 && value !== '') {
        e.preventDefault();
        forceBlur();

        history.push({
          pathname: '/packages/search',
          search: prepareQueryString({
            pageNumber: 1,
            text: value,
            filters: {},
            deprecated: false,
          }),
        });
      }
    };

    window.addEventListener('keydown', downHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
    };
  }, [history, value]);

  return (
    <>
      <div className={`position-relative ${props.formClassName}`}>
        <div className={`d-flex align-items-strecht overflow-hidden ${styles.searchBar} ${styles[props.size]}`}>
          <div className={`d-none d-sm-flex align-items-center ${styles.iconWrapper}`} onClick={forceFocus}>
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
            disabled={props.isSearching}
          />

          <button
            data-testid="cleanBtn"
            type="button"
            className={classnames('close', styles.inputClean, { invisible: value === '' })}
            aria-label="Close"
            onClick={cleanSearch}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {props.isSearching && (
          <div className={`position-absolute text-light ${styles.loading}`}>
            <span
              data-testid="searchBarSpinning"
              className={`spinner-border spinner-border-${props.size === 'big' ? 'lg' : 'sm'}`}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default SearchBar;
