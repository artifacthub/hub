import classnames from 'classnames';
import isArray from 'lodash/isArray';
import isNull from 'lodash/isNull';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import type { ReactNode } from 'react';
import {
  cloneElement,
  ElementType,
  isValidElement,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import { rehypeGithubAlerts } from 'rehype-github-alerts';
import remarkGfm from 'remark-gfm';

import useBreakpointDetect from '../../../hooks/useBreakpointDetect';
import checkCodeLanguage from '../../../utils/checkCodeLanguage';
import AnchorHeader from '../../common/AnchorHeader';
import styles from './Readme.module.css';

interface Props {
  readme: string;
  scrollIntoView: (id?: string) => void;
  stopPkgLoading: () => void;
}

interface CodeProps {
  className?: string;
  inline?: boolean;
  node?: {
    type?: string;
  };
  isInPre?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface ImageProps {
  alt: string;
  src: string;
}

interface LinkProps {
  href: string;
  target?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface BasicProps {
  children: ReactNode;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EmojiConvertor = require('emoji-js');
const emoji = new EmojiConvertor();

const Readme = (props: Props) => {
  useLayoutEffect(() => {
    props.stopPkgLoading();
  }, [props.readme]);

  const Code: ElementType = ({ className, children, isInPre }: CodeProps) => {
    if (!isInPre) {
      return className ? <code className={className}>{children}</code> : <code>{children}</code>;
    }

    const match = /language-(\w+)/.exec(className || '');

    return (
      <SyntaxHighlighter language={checkCodeLanguage(match ? match[1] : 'bash')} style={github}>
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  };

  const Image: ElementType = (data: ImageProps) => {
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
          alt={data.alt || ''}
          className={classnames({ 'd-none': error })}
          onError={() => setError(true)}
          onLoad={checkImageInBreakpoint}
        />
      </span>
    ) : null;
  };

  // Only for external links and anchors
  const Link: ElementType = (data: LinkProps) => {
    const isContentImage =
      data.children && isArray(data.children) && data.children.length > 0 && !isUndefined(data.children[0].props)
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
          target={data.target || '_blank'}
          rel="noopener noreferrer"
          className={classnames('text-primary', { 'd-inline': !isContentImage })}
        >
          {data.children}
        </a>
      );
      // We only displays anchors when title is on the Readme
    } else if (data.href.startsWith('#') && isElementInView(data.href)) {
      return (
        <button
          className={classnames('btn btn-link text-primary text-start border-0 p-0', styles.btnLink)}
          onClick={() => props.scrollIntoView(data.href)}
          aria-label="Go to element"
        >
          {data.children}
        </button>
      );
    } else {
      return <>{data.children}</>;
    }
  };

  const Table: ElementType = (data: BasicProps) => (
    <div className="mw-100 overflow-auto">
      <table>{data.children}</table>
    </div>
  );

  const Paragraph: ElementType = (data: BasicProps) => {
    if (data.className && data.className === 'markdown-alert-title') {
      return <p className={`fw-semibold ${data.className}`}>{data.children}</p>;
    }
    const isOneChild = data.children && isArray(data.children) && data.children.length === 1;
    if (isUndefined(data.children)) return null;
    if (isArray(data.children)) {
      const processed = data.children.map((child) => {
        if (isString(child)) {
          return emoji.replace_colons(child);
        }
        return child;
      });
      const hasElements = processed.some((child) => isValidElement(child));
      return (
        <p className={classnames({ 'd-block w-100 h-100': isOneChild && !hasElements }, styles.paragraph)}>
          {processed}
        </p>
      );
    } else if (isString(data.children)) {
      return <p className={styles.paragraph}>{emoji.replace_colons(data.children)}</p>;
    }

    if (isValidElement(data.children)) {
      return <p className={styles.paragraph}>{data.children}</p>;
    }

    return <p className={styles.paragraph}>{data.children}</p>;
  };

  const Blockquote: ElementType = (data: BasicProps) => {
    return <blockquote className={`text-muted position-relative ${styles.quote}`}>{data.children}</blockquote>;
  };

  const getHeadingComponent = (level: number): ElementType => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data: any) => <AnchorHeader {...data} level={level} scrollIntoView={props.scrollIntoView} />;
  };

  const isElementInView = (id: string) => {
    try {
      const item = document.querySelector(id);
      return !isNull(item);
    } catch {
      return false;
    }
  };

  const mapPreChild = (child: CodeProps['children']) => {
    if (isValidElement<CodeProps>(child)) {
      return cloneElement<CodeProps>(child, { isInPre: true });
    }

    return child;
  };

  const Pre: ElementType = (props: CodeProps) => {
    if (isArray(props.children)) {
      return <>{props.children.map((child) => mapPreChild(child))}</>;
    }

    return <>{mapPreChild(props.children)}</>;
  };

  useEffect(() => {
    // Scrolls to hash (if necessary) when readme is loaded
    props.scrollIntoView();
  }, []);

  return (
    <div className={`mt-3 mb-5 position-relative ${styles.md}`}>
      <ReactMarkdown
        children={props.readme}
        skipHtml
        remarkPlugins={[[remarkGfm, { tableCellPadding: false }]]}
        rehypePlugins={[rehypeGithubAlerts]}
        components={{
          pre: Pre,
          code: Code,
          image: Image,
          img: Image,
          a: Link,
          table: Table,
          h1: getHeadingComponent(1),
          h2: getHeadingComponent(2),
          h3: getHeadingComponent(3),
          h4: getHeadingComponent(4),
          h5: getHeadingComponent(5),
          h6: getHeadingComponent(6),
          p: Paragraph,
          blockquote: Blockquote,
        }}
      />
    </div>
  );
};

export default memo(Readme, (prevProps: Props, nextProps: Props) => {
  // Only refreshes when readme changes
  if (prevProps.readme !== nextProps.readme) {
    return false;
  }
  return true;
});
