import { FaRss } from 'react-icons/fa';

import { Repository } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';

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
        className="badge bg-secondary rssBadge ms-3"
        rel="alternate noopener noreferrer"
        role="button"
        target="_blank"
        type="application/rss+xml"
        href={`/api/v1${buildPackageURL(props.normalizedName, props.repository, props.version)}/feed/rss`}
      >
        <div className="d-flex flex-row align-items-center">
          <FaRss className="me-1" />
          <div>RSS</div>
        </div>
      </a>
    </small>
  </div>
);

export default RSSLinkTitle;
