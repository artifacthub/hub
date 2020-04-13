import React from 'react';

import githubLogo from '../../images/github-mark.svg';
import googleLogo from '../../images/google.svg';
import getHubBaseURL from '../../utils/getHubBaseURL';
import styles from './OAuth.module.css';

interface Props {
  separatorClassName?: string;
}

const OAuth = (props: Props) => {
  const goToOAuthPage = (name: string) => {
    window.location.href = `${getHubBaseURL()}/oauth/${name}`;
    return;
  };

  return (
    <>
      <div className={`${props.separatorClassName} my-4 position-relative text-center ${styles.separator}`}>
        <span className={`p-3 m-auto ${styles.separatorContent}`}>or sign in with</span>
        <div className={styles.divider} />
      </div>

      <div>
        <div className="d-flex flex-column mb-1">
          <button
            type="button"
            onClick={() => goToOAuthPage('github')}
            className={`btn btn-outline-secondary mb-3 btn-block ${styles.btn}`}
          >
            <div className="d-flex align-items-center">
              <img alt="Github Logo" src={githubLogo} className={styles.logo} />
              <div className="flex-grow-1 text-center">Github</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => goToOAuthPage('google')}
            className={`btn btn-outline-secondary mb-3 btn-block ${styles.btn}`}
          >
            <div className="d-flex align-items-center">
              <img alt="Google Logo" src={googleLogo} className={styles.logo} />
              <div className="flex-grow-1 text-center">Google</div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default OAuth;
