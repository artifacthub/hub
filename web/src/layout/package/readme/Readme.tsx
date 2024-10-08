import classnames from 'classnames';
import isArray from 'lodash/isArray';
import isNull from 'lodash/isNull';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import { ElementType, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import { rehypeGithubAlerts } from 'rehype-github-alerts';
import remarkGfm from 'remark-gfm';

import useBreakpointDetect from '../../../hooks/useBreakpointDetect';
import AnchorHeader from '../../common/AnchorHeader';
import styles from './Readme.module.css';

interface Props {
  readme: string;
  scrollIntoView: (id?: string) => void;
  stopPkgLoading: () => void;
}

interface CodeProps {
  className: string;
  inline: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface ImageProps {
  alt: string;
  src: string;
}

interface LinkProps {
  href: string;
  target: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
}

interface BasicProps {
  children: JSX.Element | JSX.Element[];
  className?: string;
}

const AVAILABLE_LANGUAGES = [
  'oneC',
  'abnf',
  'accesslog',
  'actionscript',
  'ada',
  'angelscript',
  'apache',
  'applescript',
  'arcade',
  'arduino',
  'armasm',
  'asciidoc',
  'aspectj',
  'autohotkey',
  'autoit',
  'avrasm',
  'awk',
  'axapta',
  'bash',
  'basic',
  'bnf',
  'brainfuck',
  'cLike (c-like)',
  'c',
  'cal',
  'capnproto',
  'ceylon',
  'clean',
  'clojureRepl (clojure-repl)',
  'clojure',
  'cmake',
  'coffeescript',
  'coq',
  'cos',
  'cpp',
  'crmsh',
  'crystal',
  'csharp',
  'csp',
  'css',
  'd',
  'dart',
  'delphi',
  'diff',
  'django',
  'dns',
  'dockerfile',
  'dos',
  'dsconfig',
  'dts',
  'dust',
  'ebnf',
  'elixir',
  'elm',
  'erb',
  'erlangRepl',
  'erlang',
  'excel',
  'fix',
  'flix',
  'fortran',
  'fsharp',
  'gams',
  'gauss',
  'gcode',
  'gherkin',
  'glsl',
  'gml',
  'go',
  'golo',
  'gradle',
  'groovy',
  'haml',
  'handlebars',
  'haskell',
  'haxe',
  'hsp',
  'htmlbars',
  'http',
  'hy',
  'inform7',
  'ini',
  'irpf90',
  'isbl',
  'java',
  'javascript',
  'jbossCli (jboss-cli)',
  'json',
  'juliaRepl (julia-repl)',
  'julia',
  'kotlin',
  'lasso',
  'latex',
  'ldif',
  'leaf',
  'less',
  'lisp',
  'livecodeserver',
  'livescript',
  'llvm',
  'lsl',
  'lua',
  'makefile',
  'markdown',
  'mathematica',
  'matlab',
  'maxima',
  'mel',
  'mercury',
  'mipsasm',
  'mizar',
  'mojolicious',
  'monkey',
  'moonscript',
  'n1ql',
  'nginx',
  'nim',
  'nix',
  'nodeRepl (node-repl)',
  'nsis',
  'objectivec',
  'ocaml',
  'openscad',
  'oxygene',
  'parser3',
  'perl',
  'pf',
  'pgsql',
  'phpTemplate (php-template)',
  'php',
  'plaintext',
  'pony',
  'powershell',
  'processing',
  'profile',
  'prolog',
  'properties',
  'protobuf',
  'puppet',
  'purebasic',
  'pythonRepl',
  'python',
  'q',
  'qml',
  'r',
  'reasonml',
  'rib',
  'roboconf',
  'routeros',
  'rsl',
  'ruby',
  'ruleslanguage',
  'rust',
  'sas',
  'scala',
  'scheme',
  'scilab',
  'scss',
  'shell',
  'smali',
  'smalltalk',
  'sml',
  'sqf',
  'sql',
  'stan',
  'stata',
  'step21',
  'stylus',
  'subunit',
  'swift',
  'taggerscript',
  'tap',
  'tcl',
  'thrift',
  'tp',
  'twig',
  'typescript',
  'vala',
  'vbnet',
  'vbscriptHtml',
  'vbscript',
  'verilog',
  'vhdl',
  'vim',
  'x86asm',
  'xl',
  'xml',
  'xquery',
  'yaml',
  'zephir',
];

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EmojiConvertor = require('emoji-js');
const emoji = new EmojiConvertor();

const checkCodeLanguage = (language: string | null): string => {
  let lang = 'text';
  if (language) {
    if (AVAILABLE_LANGUAGES.includes(language)) {
      lang = language;
    } else if (language === 'console') {
      lang = 'bash';
    }
  }
  return lang;
};

const Readme = (props: Props) => {
  useLayoutEffect(() => {
    props.stopPkgLoading();
  }, [props.readme]);

  const Code: ElementType = ({ inline, className, children }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || '');
    if (inline) {
      return <code className={className}>{children}</code>;
    } else {
      return (
        <SyntaxHighlighter language={checkCodeLanguage(match ? match[1] : 'bash')} style={github}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      );
    }
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
          target={data.target}
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
    if (data.className && data.className === 'markdown-alert-title')
      return <p className={`fw-semibold ${data.className}`}>{data.children}</p>;
    const isOneChild = data.children && isArray(data.children) && data.children.length === 1;
    if (isUndefined(data.children)) return null;
    let content = data.children;
    if (isArray(data.children)) {
      content = data.children.map((child: JSX.Element) => {
        if (isString(child)) {
          return emoji.replace_colons(child);
        }
        return child;
      });
    } else if (isString(data.children)) {
      return emoji.replace_colons(data.children);
    }

    return <p className={classnames({ 'd-block w-100 h-100': isOneChild }, styles.paragraph)}>{content}</p>;
  };

  const Blockquote: ElementType = (data: BasicProps) => {
    return <blockquote className={`text-muted position-relative ${styles.quote}`}>{data.children}</blockquote>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Heading: ElementType = (data: any) => <AnchorHeader {...data} scrollIntoView={props.scrollIntoView} />;

  const isElementInView = (id: string) => {
    try {
      const item = document.querySelector(id);
      return !isNull(item);
    } catch {
      return false;
    }
  };

  const Pre: ElementType = (props: CodeProps) => {
    return <>{props.children}</>;
  };

  useEffect(() => {
    // Scrolls to hash (if necessary) when readme is loaded
    props.scrollIntoView();
  }, []);

  return (
    <ReactMarkdown
      className={`mt-3 mb-5 position-relative ${styles.md}`}
      children={props.readme}
      linkTarget="_blank"
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
        h1: Heading,
        h2: Heading,
        h3: Heading,
        h4: Heading,
        h5: Heading,
        h6: Heading,
        p: Paragraph,
        blockquote: Blockquote,
      }}
    />
  );
};

export default memo(Readme, (prevProps: Props, nextProps: Props) => {
  // Only refreshes when readme changes
  if (prevProps.readme !== nextProps.readme) {
    return false;
  }
  return true;
});
