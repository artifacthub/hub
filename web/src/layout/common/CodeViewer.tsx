import { CSSProperties, useMemo } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import styles from './CodeViewer.module.css';

const PLAIN_CODE_MIN_CHARS = 150000;
const PLAIN_CODE_MIN_LINES = 1000;
const SYNTAX_WARNING = 'Syntax highlighting is disabled for large files.';

interface Props {
  content: string;
  language: string;
  style?: { [key: string]: CSSProperties };
  customStyle?: CSSProperties;
  lineNumberStyle?: CSSProperties;
  showLineNumbers?: boolean;
  plainCodeTestId?: string;
  plainCodeLinesTestId?: string;
}

const getCodeViewerLineCount = (content: string): number => content.split('\n').length;

const getLineNumbers = (lineCount: number): string =>
  Array.from({ length: lineCount }, (_, index) => (index + 1).toString()).join('\n');

// Large files use plain rendering to avoid expensive syntax highlighting work.
const isCodeViewerPlainContent = (contentLength: number, lineCount: number): boolean =>
  contentLength > PLAIN_CODE_MIN_CHARS || lineCount > PLAIN_CODE_MIN_LINES;

const getPlainCodeWrapperStyle = (
  customStyle?: CSSProperties,
  style?: { [key: string]: CSSProperties }
): CSSProperties | undefined => {
  if (!customStyle && !style?.hljs) return undefined;

  const plainCodeWrapperStyle = { ...style?.hljs, ...customStyle };
  delete plainCodeWrapperStyle.height;
  delete plainCodeWrapperStyle.overflow;
  delete plainCodeWrapperStyle.overflowX;
  return plainCodeWrapperStyle;
};

const getPlainCodeContainerStyle = (customStyle?: CSSProperties): CSSProperties | undefined => {
  if (!customStyle?.height) return undefined;

  return { height: customStyle.height };
};

const hasCustomStyleProperty = (customStyle: CSSProperties | undefined, property: keyof CSSProperties): boolean =>
  customStyle?.[property] !== undefined;

const getPlainCodeWrapperClassName = (
  customStyle?: CSSProperties,
  style?: { [key: string]: CSSProperties }
): string => {
  const classNames = ['flex-grow-1', 'overflow-auto', styles.plainCodeWrapper];

  if (
    !hasCustomStyleProperty(customStyle, 'padding') &&
    !hasCustomStyleProperty(customStyle, 'paddingTop') &&
    !hasCustomStyleProperty(customStyle, 'paddingRight') &&
    !hasCustomStyleProperty(customStyle, 'paddingBottom') &&
    !hasCustomStyleProperty(customStyle, 'paddingLeft')
  ) {
    classNames.push('p-4');
  }
  if (!hasCustomStyleProperty(customStyle, 'fontSize')) classNames.push('small');
  if (!hasCustomStyleProperty(customStyle, 'lineHeight')) classNames.push('lh-sm');
  if (!hasCustomStyleProperty(customStyle, 'color') && !hasCustomStyleProperty(style?.hljs, 'color')) {
    classNames.push('text-muted');
  }

  return classNames.join(' ');
};

const CodeViewerSyntaxWarning = (props: { className?: string }) => (
  <div
    className={`alert alert-secondary flex-shrink-0 px-3 py-2 mb-0 rounded-0 border-0 ${styles.syntaxWarning} ${props.className || ''}`}
    role="alert"
  >
    <span className="fw-bold">Note:</span> {SYNTAX_WARNING}
  </div>
);

const CodeViewer = (props: Props) => {
  const syntaxStyle = props.style || docco;
  const lineCount = useMemo(() => getCodeViewerLineCount(props.content), [props.content]);
  const lineNumbers = useMemo(() => getLineNumbers(lineCount), [lineCount]);
  // Reuse lineCount so parent rerenders do not split large content again.
  const usePlainCode = useMemo(
    () => isCodeViewerPlainContent(props.content.length, lineCount),
    [props.content.length, lineCount]
  );

  if (usePlainCode) {
    return (
      <div
        className={`d-flex flex-column ${styles.plainCodeContainer}`}
        style={getPlainCodeContainerStyle(props.customStyle)}
      >
        <div
          className={getPlainCodeWrapperClassName(props.customStyle, syntaxStyle)}
          style={getPlainCodeWrapperStyle(props.customStyle, syntaxStyle)}
        >
          <div className={`d-flex ${styles.plainCodeContent}`}>
            {props.showLineNumbers && (
              <pre
                className={`mb-0 bg-transparent text-end user-select-none pe-4 ${styles.plainCodeLines}`}
                style={props.lineNumberStyle}
                aria-hidden="true"
                data-testid={props.plainCodeLinesTestId}
              >
                {lineNumbers}
              </pre>
            )}
            <pre className={`mb-0 bg-transparent ${styles.plainCode}`} data-testid={props.plainCodeTestId}>
              {props.content}
            </pre>
          </div>
        </div>
        <CodeViewerSyntaxWarning />
      </div>
    );
  }

  return (
    <SyntaxHighlighter
      language={props.language}
      style={syntaxStyle}
      customStyle={props.customStyle}
      lineNumberStyle={props.lineNumberStyle}
      showLineNumbers={props.showLineNumbers}
    >
      {props.content}
    </SyntaxHighlighter>
  );
};

export default CodeViewer;
