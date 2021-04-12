import classnames from 'classnames';
import React from 'react';
import { FaGithub, FaSlack, FaTwitter } from 'react-icons/fa';
import { FiExternalLink, FiHexagon } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import ExternalLink from '../common/ExternalLink';
import styles from './Footer.module.css';

interface Props {
  isHidden?: boolean;
}

const Footer = (props: Props) => (
  <footer
    role="contentinfo"
    className={classnames('position-relative', styles.footer, {
      [styles.invisibleFooter]: props.isHidden,
    })}
  >
    <div className={classnames('container-lg px-4', { invisible: props.isHidden })}>
      <div className={`d-flex flex-row flex-wrap align-items-stretch justify-content-between ${styles.footerContent}`}>
        <div>
          <div className="h6 font-weight-bold text-uppercase">Project</div>
          <div className="d-flex flex-column text-left">
            <ExternalLink className="text-muted mb-1" href="/docs">
              Documentation
            </ExternalLink>
            <ExternalLink className="text-muted mb-1" href="https://blog.artifacthub.io/blog/">
              Blog
            </ExternalLink>
            <Link
              className="text-muted mb-1"
              to={{
                pathname: '/stats',
              }}
            >
              Statistics
            </Link>
          </div>
        </div>

        <div>
          <div className="h6 font-weight-bold text-uppercase">Community</div>
          <div className="d-flex flex-column text-left">
            <ExternalLink className="text-muted mb-1" href="https://github.com/cncf/hub">
              <div className="d-flex align-items-center">
                <FaGithub className="mr-2" />
                GitHub
              </div>
            </ExternalLink>
            <ExternalLink className="text-muted mb-1" href="https://cloud-native.slack.com/channels/artifact-hub">
              <div className="d-flex align-items-center">
                <FaSlack className="mr-2" />
                Slack
              </div>
            </ExternalLink>
            <ExternalLink className="text-muted mb-1" href="https://twitter.com/cncfartifacthub">
              <div className="d-flex align-items-center">
                <FaTwitter className="mr-2" />
                Twitter
              </div>
            </ExternalLink>
          </div>
        </div>

        <div className={styles.fullMobileSection}>
          <div className="h6 font-weight-bold text-uppercase">About</div>
          <div className={`text-muted ${styles.copyrightContent}`}>
            Artifact Hub is an <b className="d-inline-block">Open Source</b> project licensed under the{' '}
            <ExternalLink className="d-inline-block text-muted mb-1" href="https://www.apache.org/licenses/LICENSE-2.0">
              <div className="d-flex align-items-center">
                Apache License 2.0
                <span className={styles.smallIcon}>
                  <FiExternalLink className="ml-1" />
                </span>
              </div>
            </ExternalLink>
          </div>
        </div>

        <div className={`ml-0 ml-lg-auto mt-3 mt-lg-0 text-center ${styles.fullMobileSection}`}>
          <div className="d-flex flex-column align-items-center h-100">
            <div className={styles.hexagon}>
              <FiHexagon />
            </div>
            <div className="mt-2 mt-lg-4">
              <small>
                <span className="d-none d-sm-inline mr-1">Copyright</span>© The Artifact Hub Authors
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
