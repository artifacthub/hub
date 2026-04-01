import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { ElementType, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import getMetaTag from '../../utils/getMetaTag';
import styles from './BannerMOTD.module.css';

interface MOTDSeverity {
  [keys: string]: string;
}

interface LinkProps {
  href?: string;
  target?: string;
  children?: React.ReactNode;
}

interface HeadingProps {
  children?: React.ReactNode;
}

const SEVERITIES: MOTDSeverity = { warning: 'warning', info: 'info', error: 'danger' };

const Link: ElementType = ({ children, target, href }: LinkProps) => (
  <a href={href} target={target || '_blank'} rel="noopener noreferrer" className="text-decoration-none fw-semibold">
    {children}
  </a>
);

const Heading: ElementType = ({ children }: HeadingProps) => <h6 className="d-inline fw-semibold">{children}</h6>;

const BannerMOTD = () => {
  const [openStatus, setOpenStatus] = useState(true);

  const motdTag: string | null = getMetaTag('motd');
  const motd = !isNull(motdTag) && motdTag !== '' && motdTag !== '{{ .motd }}' ? motdTag : null;

  if (isNull(motd) || !openStatus) return null;

  const motdSeverity: string | null = getMetaTag('motdSeverity');
  const severityType = motdSeverity ? SEVERITIES[motdSeverity] : 'info';

  return (
    <div
      className={classnames(
        'alert mb-0 py-2 rounded-0 text-center',
        `alert-${severityType} ${styles[`${severityType}Alert`]}`,
        styles.wrapper,
        'motdBanner'
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="container-lg px-sm-4 px-lg-0">
        <ReactMarkdown
          skipHtml
          allowedElements={['p', 'strong', 'em', 'a', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']}
          unwrapDisallowed
          remarkPlugins={[remarkGfm]}
          components={{
            a: Link,
            h1: Heading,
            h2: Heading,
            h3: Heading,
            h4: Heading,
            h5: Heading,
            h6: Heading,
          }}
        >
          {motd}
        </ReactMarkdown>
      </div>

      <button
        type="button"
        className={`btn-close position-absolute ${styles.close}`}
        onClick={() => setOpenStatus(false)}
        aria-label="Close banner"
      ></button>
    </div>
  );
};

export default BannerMOTD;
