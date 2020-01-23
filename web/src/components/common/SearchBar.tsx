import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import getSearchParams from '../../utils/getSearchParams';
import { FiSearch } from 'react-icons/fi';
import styles from './SearchBar.module.css';
import isNull from 'lodash/isNull';

interface Props {
  formClassName?: string;
  text?: string;
  size: 'big' | 'normal';
}

const SearchBar = (props: Props) => {
  const location = useLocation();
  const history = useHistory();
  const params = getSearchParams(location.search);
  const [value, setValue] = useState(params.text || '');
  const inputEl = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setValue(e.target.value);
  }

  const cleanSearch = (): void => {
    setValue('');
    forceFocus();
  };

  const forceFocus = (): void => {
    if (!isNull(inputEl) && !isNull(inputEl.current)) {
      inputEl.current.focus();
    }
  };

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      // When return key is pressed
      if (e.keyCode === 13) {
        e.preventDefault();
        history.push(`/search?text=${encodeURIComponent(value)}`);
      }
    }

    window.addEventListener('keydown', downHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
    };
  }, [history, value]);

  return (
    <form className={props.formClassName}>
      <div className={`d-flex align-items-strecht overflow-hidden ${styles.searchBar} ${styles[props.size]}`}>
        <div
          className={`d-none d-sm-flex align-items-center ${styles.iconWrapper}`}
          onClick={forceFocus}
        >
          <FiSearch />
        </div>

        <input
          ref={inputEl}
          className={`flex-grow-1 ${styles.input}`}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          placeholder="Search packages"
          aria-label="Search"
          value={value}
          onChange={onChange}
        />

        {value !== '' && (
          <button
            type="button"
            className={`close ${styles.inputClean}`}
            aria-label="Close"
            onClick={cleanSearch}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        )}
      </div>
    </form>
  );
}

export default SearchBar;
