import classnames from 'classnames';
import { FaGithub, FaSlack, FaTwitter } from 'react-icons/fa';
import { FiExternalLink, FiHexagon } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import isWhiteLabel from '../../utils/isWhiteLabel';
import ExternalLink from '../common/ExternalLink';
import styles from './Footer.module.css';

interface Props {
  isHidden?: boolean;
}

const Footer = (props: Props) => {
  const whiteLabel = isWhiteLabel();

  return (
    <footer
      role="contentinfo"
      className={classnames('position-relative text-white', styles.footer, {
        [styles.invisibleFooter]: props.isHidden,
      })}
    >
      <div className={styles.mainFooter}>
        <div className={classnames('container-lg px-4', { invisible: props.isHidden })}>
          {!whiteLabel ? (
            <>
              <div
                className={`d-flex flex-row flex-wrap align-items-stretch justify-content-between ${styles.footerContent}`}
              >
                <div>
                  <div className="h6 fw-semibold text-uppercase">Project</div>
                  <div className="d-flex flex-column text-start">
                    <ExternalLink
                      className={`mb-1 ${styles.link}`}
                      href="/docs"
                      label="Open documentation"
                      target="_self"
                    >
                      Documentation
                    </ExternalLink>
                    <ExternalLink
                      className={`mb-1 ${styles.link}`}
                      href="https://blog.artifacthub.io/blog/"
                      label="Open blog"
                    >
                      Blog
                    </ExternalLink>
                    <Link
                      className={`mb-1 ${styles.link}`}
                      to={{
                        pathname: '/stats',
                      }}
                    >
                      Statistics
                    </Link>
                  </div>
                </div>

                <div>
                  <div className="h6 fw-semibold text-uppercase">Community</div>
                  <div className="d-flex flex-column text-start">
                    <ExternalLink
                      className={`mb-1 ${styles.link}`}
                      href="https://github.com/artifacthub/hub"
                      label="Open GitHub"
                    >
                      <div className="d-flex align-items-center">
                        <FaGithub className="me-2" />
                        GitHub
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      className={`mb-1 ${styles.link}`}
                      href="https://cloud-native.slack.com/channels/artifact-hub"
                      label="Open Slack channel"
                    >
                      <div className="d-flex align-items-center">
                        <FaSlack className="me-2" />
                        Slack
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      className={`mb-1 ${styles.link}`}
                      href="https://twitter.com/cncfartifacthub"
                      label="Open Twitter"
                    >
                      <div className="d-flex align-items-center">
                        <FaTwitter className="me-2" />
                        Twitter
                      </div>
                    </ExternalLink>
                  </div>
                </div>

                <div className={styles.fullMobileSection}>
                  <div className="h6 fw-semibold text-uppercase">About</div>
                  <div className={styles.copyrightContent}>
                    Artifact Hub is an <b className="d-inline-block">Open Source</b> project licensed under the{' '}
                    <ExternalLink
                      className={`d-inline-block mb-1 ${styles.linkInText}`}
                      href="https://www.apache.org/licenses/LICENSE-2.0"
                      label="Open Apache License 2.0 documentation"
                    >
                      <div className="d-flex align-items-center">
                        Apache License 2.0
                        <span className={styles.smallIcon}>
                          <FiExternalLink className="ms-1" />
                        </span>
                      </div>
                    </ExternalLink>
                  </div>
                </div>

                <div className={`ms-0 ms-lg-auto mt-3 mt-lg-0 text-center ${styles.fullMobileSection}`}>
                  <div className="d-flex flex-column align-items-center h-100">
                    <div className={styles.hexagon}>
                      <FiHexagon />
                    </div>
                    <div className="mt-2 mt-lg-4">
                      <small>
                        <span className="d-none d-sm-inline me-1">Copyright</span>© The Artifact Hub Authors
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <ExternalLink href="https://artifacthub.io" label="Artifact Hub site">
              <div className="d-flex flex-column align-items-center">
                <small className="mb-2 text-light">Powered by</small>
                <img
                  className={styles.AHlogo}
                  src="https://artifacthub.io/static/media/logo/artifacthub-brand-white.svg"
                  alt="Logo Artifact Hub"
                />
              </div>
            </ExternalLink>
          )}
        </div>
      </div>
      {!whiteLabel && (
        <div className={`text-center py-2 px-3 px-md-4 ${styles.trademark} trademark`}>
          <small className="opacity-75">
            © 2024{' '}
            <ExternalLink className="opacity-100 text-white" href="https://linuxfoundation.org/">
              The Linux Foundation
            </ExternalLink>
            . All rights reserved. The Linux Foundation has registered trademarks and uses trademarks. For a list of
            trademarks of The Linux Foundation, please see our{' '}
            <ExternalLink className="opacity-100 text-white" href="https://linuxfoundation.org/trademark-usage">
              Trademark Usage
            </ExternalLink>{' '}
            page.{' '}
            <ExternalLink
              className="opacity-100 text-white"
              href="https://www.linuxfoundation.org/legal/privacy-policy"
            >
              Privacy Policy
            </ExternalLink>
            .
          </small>
        </div>
      )}
    </footer>
  );
};

export default Footer;
