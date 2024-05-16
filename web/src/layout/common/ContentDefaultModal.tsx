import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import { stringify } from 'yaml';

import { ContentDefaultModalKind, CustomResourcesDefinition } from '../../types';
import isVisibleItemInContainer from '../../utils/isVisibleItemInContainer';
import BlockCodeButtons from './BlockCodeButtons';
import styles from './ContentDefaultModal.module.css';
import Loading from './Loading';
import Modal from './Modal';

interface Props {
  packageId: string;
  kind: ContentDefaultModalKind;
  language: string;
  modalName: string;
  visibleModal: boolean;
  visibleFile?: string | null;
  btnModalContent: JSX.Element;
  normalizedName: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files?: any[];
}

const FILE_TYPE = {
  [ContentDefaultModalKind.CustomResourcesDefinition]: {
    singular: 'resource',
    plural: 'resources',
  },
  [ContentDefaultModalKind.Policy]: {
    singular: 'policy',
    plural: 'policies',
  },
  [ContentDefaultModalKind.Rules]: {
    singular: 'rules',
    plural: 'rules',
  },
  [ContentDefaultModalKind.Examples]: {
    singular: 'example',
    plural: 'examples',
  },
};

const ContentDefaultModal = (props: Props) => {
  const contentListWrapper = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const anchor = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isChangingSelectedItem, setIsChangingSelectedItem] = useState<boolean>(false);
  const [code, setCode] = useState<string | undefined>(undefined);
  const [inputValue, setInputValue] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [visibleFiles, setVisibleFiles] = useState<any[]>(props.files || []);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onItemChange = (file: any | null) => {
    setIsChangingSelectedItem(true);
    setSelectedItem(file);
    updateUrl(file ? file.name.toLowerCase() : undefined);
    const getContent = (): string | undefined => {
      let content: string | undefined;
      switch (props.kind) {
        case ContentDefaultModalKind.CustomResourcesDefinition:
          if (!isNull(file) && !isUndefined(file.example)) {
            content = stringify(file.example, { sortMapEntries: true });
          }
          break;
        default:
          content = file.file;
          break;
      }

      return content;
    };

    if (!isNull(file)) {
      setCode(getContent());
      if (anchor && anchor.current) {
        anchor.current.scrollIntoView({
          block: 'start',
          inline: 'nearest',
          behavior: 'smooth',
        });
      }
    } else {
      setCode(undefined);
    }
    setIsChangingSelectedItem(false);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();

    setInputValue(e.target.value);
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getVisibleFiles = (): any[] => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return props.files!.filter((file: any) => {
        const term = `${file.name} ${file.kind || ''}`.toLowerCase();
        return term.includes(inputValue.toLowerCase());
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewActiveFile = (currentFilteredFiles: any[][]) => {
      if (currentFilteredFiles.length === 0 && !isUndefined(selectedItem)) {
        onItemChange(null);
      } else {
        if (selectedItem) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeFile = currentFilteredFiles.find((file: any) => file === selectedItem);
          if (isUndefined(activeFile)) {
            onItemChange(currentFilteredFiles[0]);
          }
        } else {
          onItemChange(currentFilteredFiles[0]);
        }
      }
    };

    if (props.files && props.files.length > 0) {
      if (inputValue === '') {
        setVisibleFiles(props.files);
        if (isUndefined(selectedItem)) {
          onItemChange(props.files[0]);
        }
      } else {
        const filteredFiles = getVisibleFiles();
        reviewActiveFile(filteredFiles);
        setVisibleFiles(filteredFiles);
      }
    }
  }, [inputValue]);

  const updateUrl = (fileName?: string) => {
    navigate(
      { pathname: location.pathname, search: `?modal=${props.modalName}${fileName ? `&file=${fileName}` : ''}` },
      {
        state: location.state,
        replace: true,
      }
    );
  };

  const cleanUrl = () => {
    navigate(
      { pathname: '' },
      {
        state: location.state,
        replace: true,
      }
    );
  };

  useEffect(() => {
    if (props.visibleModal && !openStatus && props.files && props.files.length > 0) {
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
    if (props.visibleFile && openStatus) {
      const element = document.getElementById(`file_${props.visibleFile.toLowerCase()}`);
      if (element && contentListWrapper && contentListWrapper.current) {
        const isVisible = isVisibleItemInContainer(element as HTMLDivElement, contentListWrapper.current);
        if (!isVisible) {
          element.scrollIntoView({ block: 'start' });
        }
      }
    }
  }, [props.visibleFile, openStatus]);

  if (isUndefined(props.files) || props.files.length === 0) return null;

  const getSelectedFileName = (): string => {
    switch (props.kind) {
      case ContentDefaultModalKind.CustomResourcesDefinition:
        return `${props.normalizedName}-${selectedItem.kind}.yaml`;
      case ContentDefaultModalKind.Rules:
        return `${props.normalizedName}-${selectedItem.name.replace('.yaml', '')}.yaml`;
      case ContentDefaultModalKind.Policy:
      case ContentDefaultModalKind.Examples:
        return `${props.normalizedName}-${selectedItem.name}`;
    }
  };

  const onOpenModal = () => {
    if (props.files && props.files.length > 0) {
      setVisibleFiles(props.files);
      let currentActiveFile = props.files[0];
      if (props.visibleFile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const visibleFile = props.files.find((file: any) => file.name.toLowerCase() === props.visibleFile);
        if (visibleFile) {
          currentActiveFile = visibleFile;
        }
      }
      onItemChange(currentActiveFile);
      setOpenStatus(true);
    } else {
      cleanUrl();
    }
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    setSelectedItem(null);
    setCode(undefined);
    setInputValue('');
    cleanUrl();
  };

  return (
    <div className="mb-2">
      <div className="text-center">
        <button
          className="btn btn-outline-secondary btn-sm text-nowrap w-100"
          onClick={onOpenModal}
          aria-label={`Open ${props.title} modal`}
          disabled={isUndefined(props.files) || props.files.length === 0}
        >
          {props.btnModalContent}
        </button>
      </div>

      {openStatus && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>{props.title}</div>}
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
                      placeholder={`Search by name ${
                        props.kind === ContentDefaultModalKind.CustomResourcesDefinition ? 'or resource kind' : ''
                      }`}
                      className={`flex-grow-1 form-control ps-3 pe-4 ${styles.input}`}
                      name="contentDefaultModalInput"
                      value={inputValue}
                      onChange={onChange}
                      spellCheck="false"
                    />

                    <FaSearch className={`text-muted position-absolute ${styles.searchIcon}`} />

                    <div className="alert p-0 mt-3">
                      <small className="text-muted text-break fst-italic">
                        This package version contains <span className="fw-bold">{props.files.length}</span>{' '}
                        {FILE_TYPE[props.kind][props.files.length === 1 ? 'singular' : 'plural']}
                      </small>
                    </div>
                  </div>
                </div>

                {visibleFiles.length === 0 ? (
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
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {visibleFiles.map((file: any, index: number) => {
                      const isActive = selectedItem === file;
                      return (
                        <button
                          id={`file_${file.name.toLowerCase()}`}
                          key={`file_${file.name}_${index}`}
                          className={classnames('btn btn-light btn-sm mb-2 text-start w-100', styles.btn, {
                            [`activeTemplate ${styles.active}`]: isActive,
                          })}
                          onClick={() => {
                            if (!isActive) {
                              onItemChange(file);
                            }
                          }}
                          aria-label={`Show ${props.title} ${file.name}`}
                          aria-pressed={isActive}
                        >
                          <div className="d-flex flex-column align-self-center">
                            {(() => {
                              let resource: CustomResourcesDefinition;
                              switch (props.kind) {
                                case ContentDefaultModalKind.CustomResourcesDefinition:
                                  resource = file as CustomResourcesDefinition;
                                  return (
                                    <>
                                      <div className="d-flex flex-row align-items-baseline my-1">
                                        <div className={styles.legend}>
                                          <small className="text-muted text-uppercase">Kind:</small>
                                        </div>
                                        <span className={`text-truncate border border-1 fw-semibold ${styles.label}`}>
                                          {resource.kind}
                                        </span>
                                      </div>

                                      <div className="d-flex flex-row align-items-baseline mb-1">
                                        <div className={styles.legend}>
                                          <small className="text-muted text-uppercase">Version:</small>
                                        </div>
                                        <div className={`text-truncate ${styles.btnItemContent}`}>
                                          {resource.version}
                                        </div>
                                      </div>
                                    </>
                                  );

                                default:
                                  return (
                                    <div className="d-flex flex-row align-items-baseline mb-1">
                                      <div>
                                        <small className="text-muted text-uppercase me-2">Name:</small>
                                      </div>
                                      <div className={`text-truncate ${styles.btnItemContent}`}>{file.name}</div>
                                    </div>
                                  );
                              }
                            })()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="col-9 ps-3 h-100">
                <div className={`position-relative h-100 mh-100 border border-1 ${styles.templateWrapper}`}>
                  {isChangingSelectedItem && <Loading />}

                  <div className="d-flex flex-column h-100">
                    {!isNull(selectedItem) && (
                      <>
                        {(() => {
                          switch (props.kind) {
                            case ContentDefaultModalKind.CustomResourcesDefinition:
                              return (
                                <div className={`p-3 border-bottom border-1 ${styles.extraInfo}`}>
                                  <div className="h6 fw-bold">{selectedItem.displayName || selectedItem.name}</div>
                                  <div className="mb-1">
                                    <small className="text-muted text-uppercase me-2">Name:</small>
                                    <span className={`text-truncate ${styles.btnItemContent}`}>
                                      {selectedItem.name}
                                    </span>
                                  </div>

                                  <div className="mb-1">
                                    <small className="text-muted text-uppercase me-2">Description:</small>
                                    <span className={styles.btnItemContent}>
                                      {selectedItem.description.replace(/\n/g, ' ')}
                                    </span>
                                  </div>
                                </div>
                              );

                            default:
                              return null;
                          }
                        })()}
                      </>
                    )}
                    <div className="position-relative flex-grow-1 overflow-hidden h-100">
                      {visibleFiles.length > 0 && (
                        <>
                          {code && !isNull(selectedItem) ? (
                            <>
                              <BlockCodeButtons filename={getSelectedFileName()} content={code} />
                              <div className={`position-relative overflow-auto h-100 ${styles.fileWrapper}`}>
                                <div className={`position-absolute ${styles.anchor}`} ref={anchor} />

                                <SyntaxHighlighter
                                  language={props.language}
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
                                    minWidth: '3rem',
                                  }}
                                  showLineNumbers
                                >
                                  {code}
                                </SyntaxHighlighter>
                              </div>
                            </>
                          ) : (
                            <div className="fst-italic d-flex align-items-center justify-content-center h-100 h3">
                              No example provided
                            </div>
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

export default ContentDefaultModal;
