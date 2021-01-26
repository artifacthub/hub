import React from 'react';
import { FaRss } from 'react-icons/fa';

import { Repository } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import getHubBaseURL from '../../utils/getHubBaseURL';
import styles from './RSSLinkTitle.module.css';

interface Props {
  title: string;
  normalizedName: string;
  repository: Repository;
  version: string;
}

const RSSLinkTitle = (props: Props) => (
  <div className="d-flex flex-row align-items-center mt-2 mb-1">
    <div data-testid="smallTitle">
      <small className="card-title text-muted text-uppercase">{props.title}</small>
    </div>

    <small>
      <a
        className={`badge badge-pill badge-secondary rssBadge ml-3 ${styles.badge}`}
        rel="alternate noopener noreferrer"
        role="button"
        target="_blank"
        type="application/rss+xml"
        href={`${getHubBaseURL()}/api/v1${buildPackageURL(
          props.normalizedName,
          props.repository,
          props.version
        )}/feed/rss`}
      >
        <div className="d-flex flex-row align-items-center">
          <FaRss className="mr-1" />
          <div>RSS</div>
        </div>
      </a>
    </small>
  </div>
);

export default RSSLinkTitle;
