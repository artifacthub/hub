import React from 'react';
import isUndefined from 'lodash/isUndefined';
import { useHistory, useLocation } from 'react-router-dom';
import { IoIosArrowBack } from 'react-icons/io';
import SubNavbar from './SubNavbar';
import styles from './BackToResults.module.css';

const BackToResults = () => {
  const history  = useHistory();
  const location = useLocation();

  // Back to results when search text has been sent
  if (isUndefined(location.state) || isUndefined(location.state.searchText)) return null;

  const onClick = () => {
    history.push({
      pathname: '/search',
      search: `?text=${encodeURIComponent(location.state.searchText)}&page=${location.state.pageNumber}${location.state.filtersQuery}`,
      state: { fromDetail: true },
    });
  }

  return (
    <SubNavbar>
      <button className={`btn btn-link btn-sm pl-0 d-flex align-items-center ${styles.link}`} onClick={onClick}>
        <IoIosArrowBack className="mr-2" />
        Back to "<span className="font-weight-bold">{location.state.searchText}</span>" results
      </button>
    </SubNavbar>
  );
};

export default BackToResults;
