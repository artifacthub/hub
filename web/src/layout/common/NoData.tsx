import isUndefined from 'lodash/isUndefined';
import React from 'react';

import ExternalLink from './ExternalLink';
import styles from './NoData.module.css';

interface Props {
  children: string | JSX.Element;
  className?: string;
  issuesLinkVisible?: boolean;
}

const NoData = (props: Props) => (
  <div
    data-testid="noData"
    className={`alert alert-primary ml-auto mr-auto my-5 text-center p-4 p-sm-5 border ${styles.wrapper} ${props.className}`}
  >
    <div className="h4">{props.children}</div>
    {!isUndefined(props.issuesLinkVisible) && props.issuesLinkVisible && (
      <div className="h6 mt-4">
        If this error persists, please create an issue{' '}
        <ExternalLink href="https://github.com/artifacthub/hub/issues/new/choose">
          <u>here</u>
        </ExternalLink>
      </div>
    )}
  </div>
);

export default NoData;
