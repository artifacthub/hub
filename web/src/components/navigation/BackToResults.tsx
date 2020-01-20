import React from 'react';
import { useHistory } from 'react-router-dom';
import { IoIosArrowBack } from 'react-icons/io';
import SubNavbar from './SubNavbar';
import styles from './BackToResults.module.css';

const BackToResults = () => {
  const history = useHistory();

  // Back to results is not displayed when page is refreshed
  if (history.action === 'POP') return null;

  return (
    <SubNavbar>
      <button className={`btn btn-sm btn-link pl-0 d-flex align-items-center ${styles.link}`} onClick={history.goBack}>
        <IoIosArrowBack className="mr-2" />
        Back
      </button>
    </SubNavbar>
  );
};

export default BackToResults;
