import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import { stringify } from 'yaml';

import { CustomResourcesDefinition, FileModalKind, SearchFiltersURL } from '../../types';
import BlockCodeButtons from './BlockCodeButtons';
import styles from './FilesModal.module.css';
import Loading from './Loading';
import Modal from './Modal';

interface Props {
  packageId: string;
  kind: FileModalKind;
  language: string;
  modalName: string;
  visibleModal: boolean;
  visibleFile?: string;
  btnModalContent: JSX.Element;
  normalizedName: string;
  title: string;
  files?: any[];
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const FILE_TYPE = {
  [FileModalKind.CustomResourcesDefinition]: {
    singular: 'resource',
    plural: 'resources',
  },
  [FileModalKind.Policy]: {
    singular: 'policy',
    plural: 'policies',
  },
  [FileModalKind.Rules]: {
    singular: 'rules',
    plural: 'rules',
  },
};

const FilesModal = (props: Props) => {
  const history = useHistory();
  const anchor = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isChangingSelectedItem, setIsChangingSelectedItem] = useState<boolean>(false);
  const [code, setCode] = useState<string | undefined>(undefined);
  const [inputValue, setInputValue] = useState<string>('');
  const [visibleFiles, setVisibleFiles] = useState<any[]>(props.files || []);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);

  const onItemChange = (file: any | null) => {
    setIsChangingSelectedItem(true);
    setSelectedItem(file);
    updateUrl(file ? file.name.toLowerCase() : undefined);
    const getContent = (): string | undefined => {
      let content: string | undefined;
      switch (props.kind) {
        case FileModalKind.CustomResourcesDefinition:
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
    const getVisibleFiles = (): any[] => {
      return props.files!.filter((file: any) => {
        const term = `${file.name} ${file.kind || ''}`.toLowerCase();
        return term.includes(inputValue.toLowerCase());
      });
    };

    const reviewActiveFile = (currentFilteredFiles: any[][]) => {
      if (currentFilteredFiles.length === 0 && !isUndefined(selectedItem)) {
        onItemChange(null);
      } else {
        if (selectedItem) {
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
  }, [inputValue]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const updateUrl = (fileName?: string) => {
    history.replace({
      search: `?modal=${props.modalName}${fileName ? `&file=${fileName}` : ''}`,
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const cleanUrl = () => {
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  useEffect(() => {
    if (props.visibleModal && !openStatus && props.files && props.files.length > 0) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (props.packageId !== currentPkgId) {
      setCurrentPkgId(props.packageId);
      if (openStatus) {
        setOpenStatus(false);
      } else if (!openStatus && props.visibleModal) {
        onOpenModal();
      }
    }
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isUndefined(props.files) || props.files.length === 0) return null;

  const getSelectedFileName = (): string => {
    switch (props.kind) {
      case FileModalKind.CustomResourcesDefinition:
        return `${props.normalizedName}-${selectedItem.kind}.yaml`;
      case FileModalKind.Rules:
        return `${props.normalizedName}-${selectedItem.name.replace('.yaml', '')}.yaml`;
      case FileModalKind.Policy:
        return `${props.normalizedName}-${selectedItem.name}`;
    }
  };

  const onOpenModal = () => {
    if (props.files && props.files.length > 0) {
      setVisibleFiles(props.files);
      let currentActiveFile = props.files[0];
      if (props.visibleFile) {
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
          className="btn btn-outline-secondary btn-sm text-nowrap btn-block"
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
        >
          <div className="h-100 mw-100">
            <div className="d-flex flex-row align-items-strecht no-gutters h-100 mh-100">
              <div className="col-3 h-100 overflow-auto">
                <div className="position-relative w-100 pr-2">
                  <div className="form-group input-group-sm">
                    <input
                      type="text"
                      placeholder={`Search by name ${
                        props.kind === FileModalKind.CustomResourcesDefinition ? 'or resource kind' : ''
                      }`}
                      className={`flex-grow-1 form-control pl-3 pr-4 ${styles.input}`}
                      name="fileModalInput"
                      value={inputValue}
                      onChange={onChange}
                      spellCheck="false"
                    />

                    <FaSearch className={`text-muted position-absolute ${styles.searchIcon}`} />

                    <div className="alert p-0 mt-3">
                      <small className="text-muted text-break font-italic">
                        This package version contains <span className="font-weight-bold">{props.files.length}</span>{' '}
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
                  <div className="pr-2">
                    {visibleFiles.map((file: any, index: number) => {
                      const isActive = selectedItem === file;
                      return (
                        <button
                          key={`file_${file.name}_${index}`}
                          className={classnames('btn btn-light btn-sm mb-2 text-left w-100', styles.btn, {
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
                              switch (props.kind) {
                                case FileModalKind.CustomResourcesDefinition:
                                  const resource = file as CustomResourcesDefinition;
                                  return (
                                    <>
                                      <div className="d-flex flex-row align-items-baseline my-1">
                                        <div className={styles.legend}>
                                          <small className="text-muted text-uppercase">Kind:</small>
                                        </div>
                                        <span className={`text-truncate ${styles.label}`}>{resource.kind}</span>
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
                                        <small className="text-muted text-uppercase mr-2">Name:</small>
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

              <div className="col-9 pl-3 h-100">
                <div className={`position-relative h-100 mh-100 ${styles.templateWrapper}`}>
                  {isChangingSelectedItem && <Loading />}

                  <div className="d-flex flex-column h-100">
                    {!isNull(selectedItem) && (
                      <>
                        {(() => {
                          switch (props.kind) {
                            case FileModalKind.CustomResourcesDefinition:
                              return (
                                <div className={`p-3 border-bottom ${styles.extraInfo}`}>
                                  <div className="h6 font-weight-bold">
                                    {selectedItem.displayName || selectedItem.name}
                                  </div>
                                  <div className="d-flex flex-row align-items-baseline mb-1">
                                    <div className={styles.legend}>
                                      <small className="text-muted text-uppercase">Name:</small>
                                    </div>
                                    <div className={`text-truncate ${styles.btnItemContent}`}>{selectedItem.name}</div>
                                  </div>

                                  <div className="d-flex flex-row align-items-baseline mb-1">
                                    <div className={styles.legend}>
                                      <small className="text-muted text-uppercase">Description:</small>
                                    </div>
                                    <div className={styles.btnItemContent}>
                                      {selectedItem.description.replace(/\n/g, ' ')}
                                    </div>
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
                                  }}
                                  showLineNumbers
                                >
                                  {code}
                                </SyntaxHighlighter>
                              </div>
                            </>
                          ) : (
                            <div className="font-italic d-flex align-items-center justify-content-center h-100 h3">
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

export default FilesModal;
