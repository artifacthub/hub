import isNull from 'lodash/isNull';
import React, { useLayoutEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import AnchorHeader from '../common/AnchorHeader';
import ErrorBoundary from '../common/ErrorBoundary';
import styles from './Readme.module.css';

interface Props {
  markdownContent: string;
  scrollIntoView: (id?: string) => void;
}

interface CodeProps {
  language: string;
  value: string;
}

interface ImageProps {
  alt: string;
  src: string;
}

interface LinkProps {
  href: string;
  target: string;
  children: any;
}

interface TableProps {
  children: JSX.Element | JSX.Element[];
}

const Readme = (props: Props) => {
  const Code: React.ElementType = (props: CodeProps) => {
    if (props.value) {
      return (
        <SyntaxHighlighter language={props.language || 'bash'} style={docco}>
          {props.value}
        </SyntaxHighlighter>
      );
    } else {
      return null;
    }
  };

  const Image: React.ElementType = (data: ImageProps) => {
    return /^https?:/.test(data.src) ? <img src={data.src} alt={data.alt} /> : null;
  };

  // Only for external links and anchors
  const Link: React.ElementType = (data: LinkProps) => {
    if (/^https?:/.test(data.href)) {
      return (
        <a href={data.href} target={data.target}>
          {data.children}
        </a>
      );
      // We only displays anchors when title is on the Readme
    } else if (data.href.startsWith('#') && isElementInView(data.href)) {
      return (
        <button
          className={`btn btn-link d-inline-block border-0 p-0 ${styles.btnLink}`}
          onClick={() => props.scrollIntoView(data.href)}
        >
          {data.children}
        </button>
      );
    } else {
      return <>{data.children}</>;
    }
  };

  const Table: React.ElementType = (data: TableProps) => (
    <div className="w-100 overflow-auto">
      <table>{data.children}</table>
    </div>
  );

  const Heading: React.ElementType = (data) => <AnchorHeader {...data} scrollIntoView={props.scrollIntoView} />;

  const isElementInView = (id: string) => {
    try {
      const item = document.querySelector(id);
      return !isNull(item);
    } catch {
      return false;
    }
  };

  useLayoutEffect(() => {
    props.scrollIntoView();
  }, [props]);

  return (
    <ErrorBoundary message="Something went wrong rendering the README file of this package.">
      <span data-testid="readme">
        <ReactMarkdown
          className={`mt-3 mb-5 ${styles.md}`}
          source={props.markdownContent}
          linkTarget="_blank"
          skipHtml
          renderers={{
            code: Code,
            image: Image,
            link: Link,
            table: Table,
            heading: Heading,
          }}
        />
      </span>
    </ErrorBoundary>
  );
};

export default Readme;
