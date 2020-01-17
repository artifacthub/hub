import React, { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import getSearchParams from '../../utils/getSearchParams';
import { FiSearch } from 'react-icons/fi';
import styles from './SearchBar.module.css';

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

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setValue(e.target.value);
  }

  useEffect(() => {
    const downHandler = (e: KeyboardEvent) => {
      // When return key is pressed
      if (e.keyCode === 13) {
        e.preventDefault();
        history.push(`/search?text=${value}`);
      }
    }

    window.addEventListener('keydown', downHandler);

    return () => {
      window.removeEventListener('keydown', downHandler);
    };
  }, [history, value]);

  return (
    <form className={props.formClassName}>
      <div className={`d-flex align-items-center ${styles.searchBar} ${styles[props.size]}`}>
        <FiSearch className={`ml-1 mr-3 d-none d-sm-block ${styles.icon}`} />

        <input
          className={styles.input}
          type="text"
          placeholder="Search..."
          aria-label="Search"
          value={value}
          onChange={onChange}
        />
      </div>
    </form>
  );
}

export default SearchBar;
