import classnames from 'classnames';
import { isArray, isUndefined } from 'lodash';
import isNull from 'lodash/isNull';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import useBreakpointDetect from '../../../hooks/useBreakpointDetect';
import AnchorHeader from '../../common/AnchorHeader';
import styles from './Readme.module.css';

interface Props {
  readme: string;
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

interface BasicProps {
  children: JSX.Element | JSX.Element[];
}

const Readme = (props: Props) => {
  const Code: React.ElementType = (props: CodeProps) => {
    if (props.value) {
      return (
        <SyntaxHighlighter language="bash" style={docco}>
          {props.value}
        </SyntaxHighlighter>
      );
    } else {
      return null;
    }
  };

  const Image: React.ElementType = (data: ImageProps) => {
    const img = useRef<HTMLImageElement>(null);
    const [error, setError] = useState<boolean>(false);
    const [isBigImage, setIsBigImage] = useState<boolean>(false);
    const point = useBreakpointDetect();

    const checkImageInBreakpoint = useCallback(() => {
      if (!isNull(img) && img.current && point && ['md', 'lg', 'xl'].includes(point) && img.current!.width > 410) {
        setIsBigImage(true);
      }
    }, [point]);

    useEffect(() => {
      checkImageInBreakpoint();
    }, [point, checkImageInBreakpoint]);

    return /^https?:/.test(data.src) ? (
      <span className={classnames({ 'overflow-hidden d-table-cell': isBigImage })}>
        <img
          ref={img}
          src={data.src}
          alt={data.alt}
          className={classnames({ 'd-none': error })}
          onError={() => setError(true)}
          onLoad={checkImageInBreakpoint}
        />
      </span>
    ) : null;
  };

  // Only for external links and anchors
  const Link: React.ElementType = (data: LinkProps) => {
    const isContentImage =
      data.children && isArray(data.children) && data.children.length > 0
        ? !isUndefined(data.children[0].props.src)
        : false;

    if (/^https?:/.test(data.href)) {
      return (
        // We need to force display inline when content is not an image due to
        // .paragraph a:only-child {
        //   display: table-cell;
        // }
        <a
          href={data.href}
          target={data.target}
          rel="noopener noreferrer"
          className={classnames({ 'd-inline': !isContentImage })}
        >
          {data.children}
        </a>
      );
      // We only displays anchors when title is on the Readme
    } else if (data.href.startsWith('#') && isElementInView(data.href)) {
      return (
        <button
          className={classnames('btn btn-link text-left border-0 p-0', styles.btnLink)}
          onClick={() => props.scrollIntoView(data.href)}
        >
          {data.children}
        </button>
      );
    } else {
      return <>{data.children}</>;
    }
  };

  const Table: React.ElementType = (data: BasicProps) => (
    <div className="mw-100 overflow-auto">
      <table>{data.children}</table>
    </div>
  );

  const Paragraph: React.ElementType = (data: BasicProps) => {
    const isOneChild = data.children && isArray(data.children) && data.children.length === 1;
    if (isUndefined(data.children)) return null;
    return <p className={classnames({ 'd-block w-100 h-100': isOneChild }, styles.paragraph)}>{data.children}</p>;
  };

  const Blockquote: React.ElementType = (data: BasicProps) => {
    return <blockquote className={`text-muted ${styles.quote}`}>{data.children}</blockquote>;
  };

  const Heading: React.ElementType = (data: any) => <AnchorHeader {...data} scrollIntoView={props.scrollIntoView} />;

  const isElementInView = (id: string) => {
    try {
      const item = document.querySelector(id);
      return !isNull(item);
    } catch {
      return false;
    }
  };

  return (
    <ReactMarkdown
      className={`mt-3 mb-5 position-relative ${styles.md}`}
      children={props.readme}
      linkTarget="_blank"
      skipHtml
      renderers={{
        code: Code,
        image: Image,
        link: Link,
        imageReference: Image,
        linkReference: Link,
        table: Table,
        heading: Heading,
        paragraph: Paragraph,
        blockquote: Blockquote,
      }}
    />
  );
};

export default React.memo(Readme, (prevProps: Props, nextProps: Props) => {
  // Only refreshes when readme changes
  if (prevProps.readme !== nextProps.readme) {
    return false;
  }
  return true;
});
