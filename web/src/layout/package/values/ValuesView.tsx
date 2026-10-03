import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import useOutsideClick from '../../../hooks/useOutsideClick';
import { ValuesQuery } from '../../../types';
import BlockCodeButtons from '../../common/BlockCodeButtons';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import ValuesSearch from '../../common/ValuesSearch';
import styles from './Values.module.css';

interface Props {
  values: string;
  lines?: Lines;
  sections?: Sections;
  normalizedName: string;
  updateUrl: (q: ValuesQuery) => void;
  visibleValuesPath?: string | null;
}

interface Lines {
  [key: number]: string;
}

interface Sections {
  [keyLine: number]: number;
}

const ValuesView = (props: Props) => {
  const code = useRef<HTMLDivElement | null>(null);
  const [topPositionMenu, setTopPositionMenu] = useState<number | undefined>();
  const [arrowLeftMargin, setArrowLeftMargin] = useState<number | undefined>();
  const [clickedLine, setClickedLine] = useState<number | undefined>();
  const [fullWidth, setFullWidth] = useState<number | undefined>();
  const [activeLine, setActiveLine] = useState<string | undefined>();
  const [collapsedSections, setCollapsedSections] = useState<number[]>([]);
  const isEmptyValues = props.values === ' ';

  const isSectionHeader = (lineNumber: number): boolean =>
    !isUndefined(props.sections) && !isUndefined(props.sections[lineNumber]);

  const isLineHidden = (lineNumber: number): boolean =>
    !isUndefined(props.sections) &&
    collapsedSections.some((keyLine: number) => lineNumber > keyLine && lineNumber <= (props.sections || {})[keyLine]);

  const toggleSection = (lineNumber: number) => {
    setCollapsedSections((prev: number[]) =>
      prev.includes(lineNumber) ? prev.filter((l: number) => l !== lineNumber) : [...prev, lineNumber]
    );
  };

  const expandSectionsContaining = (lineNumber: number) => {
    if (isUndefined(props.sections) || collapsedSections.length === 0) return;
    setCollapsedSections((prev: number[]) =>
      prev.filter((keyLine: number) => !(lineNumber > keyLine && lineNumber <= props.sections![keyLine]))
    );
  };

  const cleanClickedLine = () => {
    setClickedLine(undefined);
    setTopPositionMenu(undefined);
    setArrowLeftMargin(undefined);
  };

  useOutsideClick([code], !isUndefined(clickedLine), cleanClickedLine);

  useEffect(() => {
    const scrollIntoView = (path: string) => {
      if (isUndefined(path) || path === '') return;

      try {
        const element = document.getElementById(`line_${path}`);
        if (element && code && code.current) {
          code.current.scrollTo({
            top: element.offsetTop,
            left: 0, // Force horizontal scroll to 0
            behavior: 'smooth',
          });
        }
      } finally {
        // eslint-disable-next-line no-unsafe-finally
        return;
      }
    };

    if (!isUndefined(activeLine)) {
      expandSectionsContaining(parseInt(activeLine));
      // Wait for collapsed sections to expand before scrolling
      const timeout = setTimeout(() => scrollIntoView(activeLine), 50);
      return () => clearTimeout(timeout);
    }
  }, [activeLine]);

  useEffect(() => {
    return () => {
      setActiveLine(undefined);
      cleanClickedLine();
    };
  }, []);

  useLayoutEffect(() => {
    if (isUndefined(activeLine) && props.visibleValuesPath && !isUndefined(props.lines)) {
      const selectedLine = Object.keys(props.lines).find(
        (line: string) => props.lines![parseInt(line)] === props.visibleValuesPath!
      );
      if (selectedLine) {
        setTimeout(() => {
          setActiveLine(selectedLine);
        }, 100);
      } else {
        props.updateUrl({});
      }
    }
  }, [props.visibleValuesPath]);

  useEffect(() => {
    if (!isUndefined(clickedLine)) {
      if (code && code.current && isUndefined(fullWidth)) {
        setFullWidth(code.current.scrollWidth);
      }
      const element = document.getElementById(`line_${clickedLine}`);
      if (element) {
        const attr = element.querySelector('.hljs-attr');
        if (attr) {
          const lineBoundingX = element.getBoundingClientRect().x;
          const attrBounding = attr.getBoundingClientRect();
          setArrowLeftMargin(attrBounding.width / 2.0 + attrBounding.x - lineBoundingX - 6);
        }
        setTopPositionMenu(element.offsetTop + element.offsetHeight + 5);
      }
    } else {
      setTopPositionMenu(undefined);
    }
  }, [clickedLine, fullWidth]);

  const onSearch = (selectedLine?: string) => {
    setActiveLine(selectedLine);
    props.updateUrl({ selectedLine: selectedLine });
  };

  return (
    <>
      {props.lines && (
        <ValuesSearch pathsObj={props.lines} activePath={activeLine} onSearch={onSearch} wrapperClassName="w-50" />
      )}

      <div className={`position-relative flex-grow-1 ${styles.content}`}>
        <BlockCodeButtons
          filename={`values-${props.normalizedName}.yaml`}
          content={props.values}
          disabled={isEmptyValues}
        />

        <div ref={code} className={`overflow-auto h-100 position-relative border border-1 ${styles.codeWrapper}`}>
          {!isUndefined(props.lines) && !isUndefined(clickedLine) && !isUndefined(topPositionMenu) && (
            <div
              role="complementary"
              className={classnames('dropdown-menu dropdown-menu-left show', styles.dropdown)}
              style={{ top: topPositionMenu }}
            >
              <div
                className={`dropdown-arrow ${styles.arrow}`}
                style={{ left: arrowLeftMargin ? `${arrowLeftMargin}px` : '1rem' }}
              />

              <ButtonCopyToClipboard
                className="dropdown-item mw-100"
                text={props.lines[clickedLine]}
                contentBtn="Copy entry path to clipboard"
                visibleBtnText
                label="Copy entry path to clipboard"
                onClick={() => {
                  setClickedLine(undefined);
                  setTopPositionMenu(undefined);
                }}
                disabled={isEmptyValues}
                noTooltip
              />
            </div>
          )}

          {!isEmptyValues && (
            <SyntaxHighlighter
              language="yaml"
              style={docco}
              customStyle={{
                backgroundColor: 'transparent',
                padding: '1.5rem',
                paddingLeft: '4.5rem',
                lineHeight: '1.25rem',
                marginBottom: '0',
                height: '100%',
                fontSize: '80%',
                color: '#636a6e',
                overflow: 'visible',
              }}
              lineNumberStyle={{
                display: 'none',
              }}
              className="customYAML"
              useInlineStyles={false}
              showLineNumbers
              wrapLines
              lineProps={(lineNumber) => {
                const isHeader = isSectionHeader(lineNumber);
                const onLineClick = (e: ReactMouseEvent<HTMLElement>) => {
                  // Clicks on the line wrapper itself (not its content) toggle the section
                  if (isHeader && e.target === e.currentTarget) {
                    toggleSection(lineNumber);
                    return;
                  }
                  const isClicked = clickedLine === lineNumber;
                  if (props.lines && !isUndefined(props.lines[lineNumber]) && !isClicked) {
                    setClickedLine(lineNumber);
                  } else {
                    cleanClickedLine();
                  }
                };
                const onLineKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSection(lineNumber);
                  }
                };
                return {
                  id: `line_${lineNumber}`,
                  className: 'line',
                  hidden: isLineHidden(lineNumber),
                  style: { position: 'relative', width: fullWidth ? `${fullWidth}px` : 'auto' },
                  'data-line-number': lineNumber,
                  'data-clickable-line': props.lines && props.lines[lineNumber] ? 'true' : 'false',
                  'data-active-line': lineNumber === clickedLine,
                  onClick: onLineClick,
                  ...(isHeader && {
                    'data-section-header': 'true',
                    'aria-expanded': !collapsedSections.includes(lineNumber),
                    tabIndex: 0,
                    onKeyDown: onLineKeyDown,
                  }),
                };
              }}
            >
              {props.values}
            </SyntaxHighlighter>
          )}
        </div>
      </div>
    </>
  );
};

export default ValuesView;
