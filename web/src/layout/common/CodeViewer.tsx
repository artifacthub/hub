import { CSSProperties, useMemo } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import styles from './CodeViewer.module.css';

const DEFAULT_PLAIN_CODE_MIN_CHARS = 150000;
const DEFAULT_PLAIN_CODE_MIN_LINES = 1000;
const SYNTAX_WARNING = 'Syntax highlighting is disabled for large files.';

interface Props {
  content: string;
  language: string;
  style?: { [key: string]: CSSProperties };
  customStyle?: CSSProperties;
  lineNumberStyle?: CSSProperties;
  showLineNumbers?: boolean;
  plainCodeMinChars?: number;
  plainCodeMinLines?: number;
  plainCodeTestId?: string;
  plainCodeLinesTestId?: string;
  hideSyntaxWarning?: boolean;
}

const getLineCount = (content: string): number => content.split('\n').length;

const getLineNumbers = (lineCount: number): string =>
  Array.from({ length: lineCount }, (_, index) => (index + 1).toString()).join('\n');

// Large files use plain rendering to avoid expensive syntax highlighting work.
const isPlainCodeContent = (
  contentLength: number,
  lineCount: number,
  plainCodeMinChars: number,
  plainCodeMinLines: number
): boolean => lineCount >= plainCodeMinLines || contentLength >= plainCodeMinChars;

const getPlainCodeWrapperStyle = (customStyle?: CSSProperties): CSSProperties | undefined => {
  if (!customStyle) return undefined;

  const plainCodeWrapperStyle = { ...customStyle };
  delete plainCodeWrapperStyle.overflow;
  return plainCodeWrapperStyle;
};

const hasCustomStyleProperty = (customStyle: CSSProperties | undefined, property: keyof CSSProperties): boolean =>
  customStyle?.[property] !== undefined;

const getPlainCodeWrapperClassName = (customStyle?: CSSProperties): string => {
  const classNames = ['overflow-auto', styles.plainCodeWrapper];

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
  if (!hasCustomStyleProperty(customStyle, 'color')) classNames.push('text-muted');

  return classNames.join(' ');
};

export const isCodeViewerPlainContent = (
  content: string,
  plainCodeMinChars: number = DEFAULT_PLAIN_CODE_MIN_CHARS,
  plainCodeMinLines: number = DEFAULT_PLAIN_CODE_MIN_LINES
): boolean => isPlainCodeContent(content.length, getLineCount(content), plainCodeMinChars, plainCodeMinLines);

export const CodeViewerSyntaxWarning = (props: { className?: string }) => (
  <div className={`alert alert-warning px-3 py-3 ${styles.syntaxWarning} ${props.className || ''}`} role="alert">
    <span className="fw-bold">Note:</span> {SYNTAX_WARNING}
  </div>
);

const CodeViewer = (props: Props) => {
  const lineCount = useMemo(() => getLineCount(props.content), [props.content]);
  const lineNumbers = useMemo(() => getLineNumbers(lineCount), [lineCount]);
  const plainCodeMinChars = props.plainCodeMinChars || DEFAULT_PLAIN_CODE_MIN_CHARS;
  const plainCodeMinLines = props.plainCodeMinLines || DEFAULT_PLAIN_CODE_MIN_LINES;
  // Reuse lineCount so parent rerenders do not split large content again.
  const usePlainCode = useMemo(
    () => isPlainCodeContent(props.content.length, lineCount, plainCodeMinChars, plainCodeMinLines),
    [props.content.length, lineCount, plainCodeMinChars, plainCodeMinLines]
  );

  if (usePlainCode) {
    return (
      <div
        className={getPlainCodeWrapperClassName(props.customStyle)}
        style={getPlainCodeWrapperStyle(props.customStyle)}
      >
        {!props.hideSyntaxWarning && <CodeViewerSyntaxWarning />}
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
    );
  }

  return (
    <SyntaxHighlighter
      language={props.language}
      style={props.style || docco}
      customStyle={props.customStyle}
      lineNumberStyle={props.lineNumberStyle}
      showLineNumbers={props.showLineNumbers}
    >
      {props.content}
    </SyntaxHighlighter>
  );
};

export default CodeViewer;
