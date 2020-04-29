import isNull from 'lodash/isNull';
import React, { useLayoutEffect } from 'react';
import { GoLink } from 'react-icons/go';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import history from '../../utils/history';
import styles from './Readme.module.css';

interface Props {
  markdownContent: string;
}

// TODO - check relative paths ???

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

// TODO - get correct image
const Image: React.ElementType = (props: ImageProps) => {
  return /^https?:/.test(props.src) ? <img src={props.src} alt={props.alt} /> : null;
};

// Only for external links and anchors
const Link: React.ElementType = (props: LinkProps) => {
  if (/^https?:/.test(props.href)) {
    return (
      <a href={props.href} target={props.target}>
        {props.children}
      </a>
    );
    // We only displays anchors when title is on the Readme
  } else if (props.href.startsWith('#') && isElementInView(props.href)) {
    return (
      <button
        className={`btn btn-link d-inline-block border-0 p-0 ${styles.btnLink}`}
        onClick={() => scrollIntoView(props.href)}
      >
        {props.children}
      </button>
    );
  } else {
    return <>{props.children}</>;
  }
};

const Table: React.ElementType = (props: TableProps) => (
  <div className="w-100 overflow-auto">
    <table>{props.children}</table>
  </div>
);

const Heading: React.ElementType = (props) => {
  const value = props.children[0].props.value;

  const anchor = value
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]+/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+$/, '');

  const Tag = `h${props.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <Tag id={anchor} className={`position-relative ${styles.headingWrapper}`}>
      <a
        href={`${history.location.pathname}#${anchor}`}
        onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
          e.preventDefault();
          e.stopPropagation();
          scrollIntoView(`#${anchor}`);
        }}
        className={`text-reset text-center ${styles.headingLink}`}
      >
        <GoLink />
      </a>
      {props.children}
    </Tag>
  );
};

const scrollIntoView = (id?: string) => {
  const elId = id || history.location.hash;
  if (!elId) return null;

  const element = document.querySelector(elId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });

    if (id) {
      history.replace({
        pathname: history.location.pathname,
        hash: elId,
      });
    }
  }
};

const isElementInView = (id: string) => {
  return !isNull(document.querySelector(id));
};

const Readme = (props: Props) => {
  useLayoutEffect(() => {
    scrollIntoView();
  }, []);

  return (
    <span data-testid="readme">
      <ReactMarkdown
        className={`mt-3 mb-5 ${styles.md}`}
        source={props.markdownContent}
        linkTarget="_blank"
        escapeHtml={false}
        renderers={{
          code: Code,
          image: Image,
          link: Link,
          table: Table,
          heading: Heading,
        }}
      />
    </span>
  );
};

export default Readme;
