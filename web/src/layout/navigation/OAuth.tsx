import React from 'react';

import getHubBaseURL from '../../utils/getHubBaseURL';
import styles from './OAuth.module.css';

interface Loading {
  status: boolean;
  type?: 'log' | 'google' | 'github' | 'oidc';
}

interface Props {
  separatorClassName?: string;
  isLoading: Loading;
  setIsLoading: (status: Loading) => void;
}

const GITHUB_LOGO = '/static/media/github-mark.svg';
const GOOGLE_LOGO = '/static/media/google.svg';
const OPENID_LOGO = '/static/media/openid.svg';

const OAuth = (props: Props) => {
  const goToOAuthPage = (name: 'google' | 'github' | 'oidc') => {
    props.setIsLoading({ type: name, status: true });
    window.location.href = `${getHubBaseURL()}/oauth/${name}?redirect_url=${window.location.pathname}`;
    return;
  };

  const isGithubAuth =
    (window as any).config &&
    (window as any).config.hasOwnProperty('githubAuth') &&
    (window as any).config.githubAuth === 'true';

  const isGoogleAuth =
    (window as any).config &&
    (window as any).config.hasOwnProperty('googleAuth') &&
    (window as any).config.googleAuth === 'true';

  const isOidcAuth =
    (window as any).config &&
    (window as any).config.hasOwnProperty('oidcAuth') &&
    (window as any).config.oidcAuth === 'true';

  if (!isGithubAuth && !isGoogleAuth && !isOidcAuth) return null;

  return (
    <>
      <div className={`${props.separatorClassName} my-4 position-relative text-center ${styles.separator}`}>
        <span className={`p-3 m-auto ${styles.separatorContent}`}>or sign in with</span>
        <div className={styles.divider} />
      </div>

      <div>
        <div className="d-flex flex-column mb-1">
          {isGithubAuth && (
            <button
              type="button"
              onClick={() => goToOAuthPage('github')}
              className={`btn btn-outline-secondary mb-3 btn-block ${styles.btn}`}
              disabled={props.isLoading.status}
            >
              <div className="d-flex align-items-center">
                <img alt="Github Logo" src={GITHUB_LOGO} className={styles.logo} />
                <div className="flex-grow-1 text-center">Github</div>
              </div>
            </button>
          )}

          {isGoogleAuth && (
            <button
              type="button"
              onClick={() => goToOAuthPage('google')}
              className={`btn btn-outline-secondary mb-3 btn-block ${styles.btn}`}
              disabled={props.isLoading.status}
            >
              <div className="d-flex align-items-center">
                <img alt="Google Logo" src={GOOGLE_LOGO} className={styles.logo} />
                <div className="flex-grow-1 text-center">Google</div>
              </div>
            </button>
          )}

          {isOidcAuth && (
            <button
              type="button"
              onClick={() => goToOAuthPage('oidc')}
              className={`btn btn-outline-secondary mb-3 btn-block ${styles.btn}`}
              disabled={props.isLoading.status}
            >
              <div className="d-flex align-items-center">
                <img alt="OpenID Logo" src={OPENID_LOGO} className={styles.logo} />
                <div className="flex-grow-1 text-center">OpenID Connect</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(OAuth);
