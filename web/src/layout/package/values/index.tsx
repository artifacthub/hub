import classnames from 'classnames';
import { isUndefined } from 'lodash';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { VscListTree } from 'react-icons/vsc';
import { useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import { isDocument, isMap, isSeq, LineCounter, parseDocument } from 'yaml';

import API from '../../../api';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { ErrorKind, SearchFiltersURL } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import getJMESPathForValuesSchema from '../../../utils/getJMESPathForValuesSchema';
import BlockCodeButtons from '../../common/BlockCodeButtons';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import Modal from '../../common/Modal';
import ValuesSearch from '../../common/ValuesSearch';
import styles from './Values.module.css';

interface Props {
  packageId: string;
  version: string;
  normalizedName: string;
  visibleValues: boolean;
  visibleValuesPath?: string;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

interface Lines {
  [key: number]: string;
}

const getPathsPerLine = (values: any): Lines => {
  const lineCounter = new LineCounter();
  const doc = parseDocument(values, { lineCounter });
  let lines: Lines = {};

  const extractKeys = (elem: any, path?: string) => {
    if (elem) {
      if (isDocument(elem) && elem.contents) {
        extractKeys(elem.contents);
      } else if (isMap(elem)) {
        elem.items.forEach((item: any) => {
          const currentPath = getJMESPathForValuesSchema(item.key.value, path);
          const line = lineCounter.linePos(item.key.range[0]).line;
          lines[line] = currentPath;
          extractKeys(item.value, currentPath);
        });
      } else if (isSeq(elem)) {
        elem.items.forEach((item: any, index: number) => {
          extractKeys(item, `${path}[${index}]`);
        });
      }
    }
  };
  extractKeys(doc);

  return lines;
};

const Values = (props: Props) => {
  const history = useHistory();
  const code = useRef<HTMLDivElement | null>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [values, setValues] = useState<string | undefined | null>();
  const [currentPkgId, setCurrentPkgId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<string | undefined>();
  const [lines, setLines] = useState<Lines | undefined>();
  const [clickedLine, setClickedLine] = useState<number | undefined>();
  const [topPositionMenu, setTopPositionMenu] = useState<number | undefined>();
  const [arrowLeftMargin, setArrowLeftMargin] = useState<number | undefined>();
  const [fullWidth, setFullWidth] = useState<number | undefined>();

  const cleanClickedLine = () => {
    setClickedLine(undefined);
    setTopPositionMenu(undefined);
    setArrowLeftMargin(undefined);
  };

  useOutsideClick([code], !isUndefined(clickedLine), cleanClickedLine);

  const updateUrl = (lineNumber?: string) => {
    let selectedPath;
    if (!isUndefined(lineNumber) && !isUndefined(lines)) {
      selectedPath = lines[parseInt(lineNumber)];
    }
    history.replace({
      search: `?modal=values${selectedPath ? `&path=${selectedPath}` : ''}`,
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  async function getValues() {
    try {
      setIsLoading(true);
      const data = await API.getChartValues(props.packageId, props.version);
      setValues(data);
      setLines(getPathsPerLine(data));
      setCurrentPkgId(props.packageId);
      setIsLoading(false);
      setOpenStatus(true);
    } catch (err: any) {
      if (err.kind === ErrorKind.NotFound) {
        alertDispatcher.postAlert({
          type: 'danger',
          message:
            'We could not find the default values for this chart version. Please check that the chart tgz package still exists in the source repository as it might not be available anymore.',
          dismissOn: 10 * 1000, // 10s
        });
      } else {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting chart default values, please try again later.',
        });
      }
      setValues(null);
      setIsLoading(false);
    }
  }

  const onOpenModal = () => {
    getValues();
    history.replace({
      search: `?modal=values${props.visibleValuesPath ? `&path=${props.visibleValuesPath}` : ''}`,
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const onCloseModal = () => {
    setValues(undefined);
    setOpenStatus(false);
    setActiveLine(undefined);
    cleanClickedLine();
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  useEffect(() => {
    if (props.visibleValues && !openStatus && isUndefined(currentPkgId)) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if ((openStatus || props.visibleValues) && !isUndefined(currentPkgId)) {
      onCloseModal();
    }
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const onSearch = (selectedLine?: string) => {
    setActiveLine(selectedLine);
    updateUrl(selectedLine);
  };

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
        return;
      }
    };

    if (!isUndefined(activeLine)) {
      scrollIntoView(activeLine);
    }
  }, [activeLine]);

  useLayoutEffect(() => {
    if (isUndefined(activeLine) && !isUndefined(props.visibleValuesPath) && !isUndefined(lines)) {
      const selectedLine = Object.keys(lines).find((line: string) => lines[parseInt(line)] === props.visibleValuesPath);
      if (selectedLine) {
        setTimeout(() => {
          setActiveLine(selectedLine);
        }, 100);
      } else {
        history.replace({
          search: '?modal=values',
          state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
        });
      }
    }
  }, [props.visibleValuesPath, lines]); /* eslint-disable-line react-hooks/exhaustive-deps */

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

  return (
    <>
      <button
        className="btn btn-outline-secondary btn-block btn-sm"
        onClick={onOpenModal}
        aria-label="Open default values modal"
      >
        <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
          {isLoading ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2 font-weight-bold">Getting values...</span>
            </>
          ) : (
            <>
              <VscListTree className="mr-2" />
              <span className="font-weight-bold">Default values</span>
            </>
          )}
        </div>
      </button>

      {openStatus && values && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Default values</div>}
          onClose={onCloseModal}
          open={openStatus}
          breakPoint="md"
        >
          <div className="mw-100 h-100 d-flex flex-column overflow-hidden">
            {lines && (
              <ValuesSearch pathsObj={lines} activePath={activeLine} onSearch={onSearch} wrapperClassName="w-50" />
            )}

            {values && (
              <div className={`position-relative flex-grow-1 ${styles.content}`}>
                <BlockCodeButtons
                  filename={`values-${props.normalizedName}.yaml`}
                  content={values}
                  tooltipType="light"
                />

                <div ref={code} className={`overflow-auto h-100 position-relative ${styles.codeWrapper}`}>
                  {!isUndefined(lines) && !isUndefined(clickedLine) && !isUndefined(topPositionMenu) && (
                    <div
                      role="complementary"
                      className={classnames('dropdown-menu dropdown-menu-left show', styles.dropdown)}
                      style={{ top: topPositionMenu }}
                    >
                      <div
                        className={`arrow ${styles.arrow}`}
                        style={{ left: arrowLeftMargin ? `${arrowLeftMargin}px` : '1rem' }}
                      />

                      <ButtonCopyToClipboard
                        className="dropdown-item mw-100"
                        text={lines[clickedLine]}
                        contentBtn="Copy entry path to clipboard"
                        visibleBtnText
                        label="Copy entry path to clipboard"
                        onClick={() => {
                          setClickedLine(undefined);
                          setTopPositionMenu(undefined);
                        }}
                        noTooltip
                      />
                    </div>
                  )}

                  <SyntaxHighlighter
                    language="yaml"
                    style={tomorrowNight}
                    customStyle={{
                      backgroundColor: 'transparent',
                      padding: '1.5rem',
                      paddingLeft: '4.5rem',
                      lineHeight: '1.25rem',
                      marginBottom: '0',
                      height: '100%',
                      fontSize: '80%',
                      color: '#f8f9fa',
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
                      return {
                        id: `line_${lineNumber}`,
                        className: 'line',
                        style: { position: 'relative', width: fullWidth ? `${fullWidth}px` : 'auto' },
                        'data-line-number': lineNumber,
                        'data-clickable-line': lines && lines[lineNumber] ? 'true' : 'false',
                        'data-active-line': lineNumber === clickedLine,
                        onClick() {
                          const isClicked = clickedLine === lineNumber;
                          if (lines && !isUndefined(lines[lineNumber]) && !isClicked) {
                            setClickedLine(lineNumber);
                          } else {
                            cleanClickedLine();
                          }
                        },
                      };
                    }}
                  >
                    {values}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default Values;
