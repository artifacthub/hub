import isUndefined from 'lodash/isUndefined';

import ExternalLink from './ExternalLink';
import styles from './NoData.module.css';

interface Props {
  children: string | JSX.Element;
  className?: string;
  issuesLinkVisible?: boolean;
}

const NoData = (props: Props) => (
  <div
    role="alert"
    className={`alert alert-primary ms-auto me-auto my-5 text-center p-4 p-sm-5 border border-1 ${styles.wrapper} ${props.className}`}
  >
    <div className="h4">{props.children}</div>
    {!isUndefined(props.issuesLinkVisible) && props.issuesLinkVisible && (
      <div className="h6 mt-4">
        If this error persists, please create an issue{' '}
        <ExternalLink href="https://github.com/artifacthub/hub/issues/new/choose" label="GitHub issue">
          <u>here</u>
        </ExternalLink>
      </div>
    )}
  </div>
);

export default NoData;
