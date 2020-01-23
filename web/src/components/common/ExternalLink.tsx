import React from 'react';
import styles from './ExternalLink.module.css';

interface Props {
  children: JSX.Element | JSX.Element[] | string;
  href: string;
  className?: string;
}

const ExternalLink = (props: Props) => (
  <a
    className={`${styles.link} ${props.className}`}
    href={props.href}
    role="button"
    target="_blank"
    rel="noopener noreferrer"
  >
    {props.children}
  </a>
);

export default ExternalLink;
