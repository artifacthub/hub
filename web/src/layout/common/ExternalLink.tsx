import isUndefined from 'lodash/isUndefined';
import React from 'react';

import styles from './ExternalLink.module.css';

interface Props {
  children: JSX.Element | JSX.Element[] | string;
  href: string;
  className?: string;
  btnType?: boolean;
  target?: string;
}

const ExternalLink = (props: Props) => (
  <>
    {!isUndefined(props.btnType) && props.btnType ? (
      <button
        data-testid="externalBtn"
        type="button"
        className={`btn p-0 ${styles.link} ${props.className}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          window.open(props.href, props.target || '_blank');
        }}
      >
        {props.children}
      </button>
    ) : (
      <a
        className={`${styles.link} ${props.className}`}
        href={props.href}
        role="button"
        target={props.target || '_blank'}
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {props.children}
      </a>
    )}
  </>
);

export default ExternalLink;
