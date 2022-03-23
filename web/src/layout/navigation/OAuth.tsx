import { Dispatch, SetStateAction } from 'react';

import cleanLoginUrlParams from '../../utils/cleanLoginUrlParams';
import getMetaTag from '../../utils/getMetaTag';
import styles from './OAuth.module.css';

interface Loading {
  status: boolean;
  type?: 'log' | 'google' | 'github' | 'oidc';
}

interface Props {
  separatorClassName?: string;
  isLoading: Loading;
  setIsLoading: Dispatch<SetStateAction<Loading>>;
}

const GITHUB_LOGO = '/static/media/github-mark.svg';
const GOOGLE_LOGO = '/static/media/google.svg';
const OPENID_LOGO = '/static/media/openid.svg';

const OAuth = (props: Props) => {
  const goToOAuthPage = (name: 'google' | 'github' | 'oidc') => {
    props.setIsLoading({ type: name, status: true });
    const querystring = cleanLoginUrlParams(window.location.search);
    window.location.href = `/oauth/${name}?redirect_url=${encodeURIComponent(
      `${window.location.pathname}${querystring !== '' ? `?${querystring}` : ''}`
    )}`;
    return;
  };

  const isGitHubAuth = getMetaTag('githubAuth', true);
  const isGoogleAuth = getMetaTag('googleAuth', true);
  const isOidcAuth = getMetaTag('oidcAuth', true);

  if (!isGitHubAuth && !isGoogleAuth && !isOidcAuth) return null;

  return (
    <>
      <div className={`${props.separatorClassName} my-4 position-relative text-center ${styles.separator}`}>
        <span className="p-3 m-auto bg-white">or sign in with</span>
        <div className={`position-absolute top-50 start-0 end-0 ${styles.divider}`} />
      </div>

      <div>
        <div className="d-flex flex-column mb-1">
          <div className="d-grid gap-4">
            {isGitHubAuth && (
              <button
                type="button"
                onClick={() => goToOAuthPage('github')}
                className={`btn btn-outline-secondary ${styles.btn}`}
                disabled={props.isLoading.status}
                aria-label="Sign in with GitHub"
              >
                <div className="d-flex align-items-center">
                  <img alt="GitHub Logo" src={GITHUB_LOGO} className={`lh-base ${styles.logo}`} />
                  <div className="flex-grow-1 text-center">GitHub</div>
                </div>
              </button>
            )}

            {isGoogleAuth && (
              <button
                type="button"
                onClick={() => goToOAuthPage('google')}
                className={`btn btn-outline-secondary ${styles.btn}`}
                disabled={props.isLoading.status}
                aria-label="Sign in with Google"
              >
                <div className="d-flex align-items-center">
                  <img alt="Google Logo" src={GOOGLE_LOGO} className={`lh-base ${styles.logo}`} />
                  <div className="flex-grow-1 text-center">Google</div>
                </div>
              </button>
            )}

            {isOidcAuth && (
              <button
                type="button"
                onClick={() => goToOAuthPage('oidc')}
                className={`btn btn-outline-secondary  ${styles.btn}`}
                disabled={props.isLoading.status}
                aria-label="Sign in with OpenID Connect"
              >
                <div className="d-flex align-items-center">
                  <img alt="OpenID Logo" src={OPENID_LOGO} className={`lh-base ${styles.logo}`} />
                  <div className="flex-grow-1 text-center">OpenID Connect</div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OAuth;
