import classnames from 'classnames';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { FiCode } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { GatekeeperCase, GatekeeperExample } from '../../types';
import isVisibleItemInContainer from '../../utils/isVisibleItemInContainer';
import BlockCodeButtons from '../common/BlockCodeButtons';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import styles from './GatekeeperExamplesModal.module.css';

interface Props {
  packageId: string;
  visibleModal: boolean;
  visibleExample?: string | null;
  visibleFile?: string | null;
  normalizedName: string;
  examples?: GatekeeperExample[];
}

const GatekeeperExamplesModal = (props: Props) => {
  const contentListWrapper = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const anchor = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<GatekeeperCase | null>(null);
  const [selectedExampleName, setSelectedExampleName] = useState<string | null>();
  const [isChangingSelectedItem, setIsChangingSelectedItem] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [visibleExamples, setVisibleExamples] = useState<GatekeeperExample[]>(props.examples || []);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);

  const onItemChange = (exampleName: string, caseItem: GatekeeperCase) => {
    setIsChangingSelectedItem(true);
    setSelectedExampleName(exampleName);
    setSelectedItem(caseItem);
    updateUrl(exampleName, caseItem.name);
    if (anchor && anchor.current) {
      anchor.current.scrollIntoView({
        block: 'start',
        inline: 'nearest',
        behavior: 'smooth',
      });
    }
    setIsChangingSelectedItem(false);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();

    setInputValue(e.target.value);
  };

  useEffect(() => {
    const getVisibleFiles = (): GatekeeperExample[] => {
      const examples: GatekeeperExample[] = [];
      props.examples!.forEach((example: GatekeeperExample) => {
        const cases = example.cases.filter((caseItem: GatekeeperCase) => {
          const term = caseItem.name.toLowerCase();
          return term.includes(inputValue.toLowerCase());
        });
        if (cases.length > 0) {
          examples.push({
            name: example.name,
            cases: cases,
          });
        }
      });

      return examples;
    };

    const reviewActiveFile = (currentFilteredExamples: GatekeeperExample[]) => {
      if (currentFilteredExamples.length === 0 && !isUndefined(selectedItem)) {
        updateUrl();
        setSelectedExampleName(null);
        setSelectedItem(null);
      } else {
        if (selectedItem && selectedExampleName) {
          const activeExample = currentFilteredExamples.find(
            (example: GatekeeperExample) => example.name === selectedExampleName
          );
          if (isUndefined(activeExample)) {
            onItemChange(currentFilteredExamples[0].name, currentFilteredExamples[0].cases[0]);
          } else {
            const activeCase = activeExample.cases.find((caseItem: GatekeeperCase) => isEqual(caseItem, selectedItem));
            if (isUndefined(activeCase)) {
              onItemChange(currentFilteredExamples[0].name, currentFilteredExamples[0].cases[0]);
            }
          }
        } else {
          onItemChange(currentFilteredExamples[0].name, currentFilteredExamples[0].cases[0]);
        }
      }
    };

    if (props.examples && !isEmpty(props.examples)) {
      if (inputValue === '') {
        setVisibleExamples(props.examples);
        if (isUndefined(selectedItem)) {
          onItemChange(props.examples[0].name, props.examples[0].cases[0]);
        }
      } else {
        const filteredFiles = getVisibleFiles();
        reviewActiveFile(filteredFiles);
        setVisibleExamples(filteredFiles);
      }
    }
  }, [inputValue]);

  const updateUrl = (example?: string, fileName?: string) => {
    navigate(
      {
        search: `?modal=examples${example ? `&example=${example.toLowerCase()}` : ''}${
          fileName ? `&file=${fileName.toLowerCase()}` : ''
        }`,
      },
      {
        state: location.state,
        replace: true,
      }
    );
  };

  const cleanUrl = () => {
    navigate('', {
      state: location.state,
      replace: true,
    });
  };

  useEffect(() => {
    if (props.visibleModal && !openStatus && props.examples && !isEmpty(props.examples)) {
      onOpenModal();
    }
  }, []);

  useEffect(() => {
    if (props.packageId !== currentPkgId) {
      setCurrentPkgId(props.packageId);
      if (openStatus) {
        setOpenStatus(false);
      } else if (!openStatus && props.visibleModal) {
        onOpenModal();
      }
    }
  }, [props.packageId]);

  // Display active file in list
  useLayoutEffect(() => {
    if (props.visibleFile && props.visibleExample && openStatus) {
      const element = document.getElementById(`case_${props.visibleExample}_${props.visibleFile}`);
      if (element && contentListWrapper && contentListWrapper.current) {
        const isVisible = isVisibleItemInContainer(element as HTMLDivElement, contentListWrapper.current);
        if (!isVisible) {
          element.scrollIntoView({ block: 'start' });
        }
      }
    }
  }, [props.visibleFile, props.visibleExample, openStatus]);

  if (isUndefined(props.examples) || props.examples.length === 0) return null;

  const onOpenModal = () => {
    if (props.examples && props.examples.length > 0) {
      setVisibleExamples(props.examples);
      let currentActiveExample = props.examples[0];
      let currentActiveFile = currentActiveExample.cases[0];
      if (props.visibleFile && props.visibleExample) {
        const activeExample = props.examples.find(
          (example: GatekeeperExample) => example.name.toLowerCase() === props.visibleExample
        );
        if (activeExample) {
          currentActiveExample = activeExample;
          const visibleFile = currentActiveExample.cases.find(
            (caseItem: GatekeeperCase) => caseItem.name.toLowerCase() === props.visibleFile
          );
          if (visibleFile) {
            currentActiveFile = visibleFile;
          }
        }
      }
      onItemChange(currentActiveExample.name, currentActiveFile);
      setOpenStatus(true);
    } else {
      cleanUrl();
    }
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    setSelectedItem(null);
    setInputValue('');
    cleanUrl();
  };

  return (
    <div className="mb-2">
      <div className="text-center">
        <button
          className="btn btn-outline-secondary btn-sm text-nowrap w-100"
          onClick={onOpenModal}
          aria-label="Open examples modal"
        >
          <div className="d-flex flex-row align-items-center justify-content-center">
            <FiCode />
            <span className="ms-2 fw-bold text-uppercase">Examples</span>
          </div>
        </button>
      </div>

      {openStatus && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Examples</div>}
          onClose={onCloseModal}
          open={openStatus}
          breakPoint="md"
          footerClassName={styles.modalFooter}
        >
          <div className="h-100 mw-100">
            <div className="d-flex flex-row align-items-stretch g-0 h-100 mh-100">
              <div ref={contentListWrapper} className="col-3 h-100 overflow-auto">
                <div className="position-relative w-100 pe-2">
                  <div className="mb-3 input-group-sm">
                    <input
                      type="text"
                      placeholder="Search by name"
                      className={`flex-grow-1 form-control ps-3 pe-4 ${styles.input}`}
                      name="contentDefaultModalInput"
                      value={inputValue}
                      onChange={onChange}
                      spellCheck="false"
                    />

                    <FaSearch className={`text-muted position-absolute ${styles.searchIcon}`} />

                    <div className="alert p-0 mt-3">
                      <small className="text-muted text-break fst-italic">
                        This package version contains <span className="fw-bold">{props.examples.length}</span>{' '}
                        {props.examples.length === 1 ? 'example' : 'examples'}
                      </small>
                    </div>
                  </div>
                </div>

                {isEmpty(visibleExamples) ? (
                  <div
                    className="alert alert-dark p-2 text-center"
                    role="alert"
                    aria-live="assertive"
                    aria-atomic="true"
                  >
                    <small className="text-muted">Sorry, no matches found</small>
                  </div>
                ) : (
                  <div className="pe-2">
                    {visibleExamples.map((example: GatekeeperExample) => {
                      return (
                        <div key={`example_${example.name}`} className="mb-3">
                          <div className="text-dark h-6 mb-2 text-truncate fw-bold">{example.name}</div>
                          {example.cases.map((c: GatekeeperCase) => {
                            const id = `case_${example.name.toLowerCase()}_${c.name.toLowerCase()}`;
                            const isActive =
                              !isNull(selectedItem) &&
                              selectedItem.name === c.name &&
                              selectedExampleName === example.name;
                            return (
                              <button
                                id={id}
                                key={id}
                                className={classnames('btn btn-light btn-sm mb-2 text-start w-100', styles.btn, {
                                  [`activeTemplate ${styles.active}`]: isActive,
                                })}
                                onClick={() => {
                                  if (!isActive) {
                                    onItemChange(example.name, c);
                                  }
                                }}
                                aria-label={`Show case ${c.name} in example ${example.name}`}
                                aria-pressed={isActive}
                              >
                                <div className="d-flex flex-column align-self-center">
                                  <div className="d-flex flex-row align-items-baseline">
                                    <div className={`text-truncate ${styles.btnItemContent}`}>{c.name}</div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="col-9 ps-3 h-100">
                <div className={`position-relative h-100 mh-100 border border-1 ${styles.templateWrapper}`}>
                  {isChangingSelectedItem && <Loading />}

                  <div className="d-flex flex-column h-100">
                    <div className="position-relative flex-grow-1 overflow-hidden h-100">
                      {!isEmpty(visibleExamples) && (
                        <>
                          {!isNull(selectedItem) && (
                            <>
                              <BlockCodeButtons
                                filename={`${selectedExampleName}-${selectedItem.name}.yaml`}
                                content={selectedItem.content}
                              />
                              <div className={`position-relative overflow-auto h-100 ${styles.fileWrapper}`}>
                                <div className={`position-absolute ${styles.anchor}`} ref={anchor} />

                                <SyntaxHighlighter
                                  language="yaml"
                                  style={docco}
                                  customStyle={{
                                    backgroundColor: 'transparent',
                                    padding: '1.5rem',
                                    lineHeight: '1.25rem',
                                    marginBottom: '0',
                                    height: '100%',
                                    fontSize: '80%',
                                    overflow: 'initial',
                                    color: '#636a6e',
                                  }}
                                  lineNumberStyle={{
                                    color: 'var(--color-black-25)',
                                    marginRight: '5px',
                                    fontSize: '0.8rem',
                                  }}
                                  showLineNumbers
                                >
                                  {selectedItem.content}
                                </SyntaxHighlighter>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GatekeeperExamplesModal;
