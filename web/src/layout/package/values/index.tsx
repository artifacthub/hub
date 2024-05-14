import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef, useState } from 'react';
import { GoCheck } from 'react-icons/go';
import { MdClose } from 'react-icons/md';
import { VscListTree } from 'react-icons/vsc';
import { useLocation, useNavigate } from 'react-router-dom';
import { isDocument, isMap, isSeq, LineCounter, parseDocument } from 'yaml';

import API from '../../../api';
import useOutsideClick from '../../../hooks/useOutsideClick';
import { ErrorKind, ValuesQuery, Version as VersionData } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import getJMESPathForValuesSchema from '../../../utils/getJMESPathForValuesSchema';
import ElementWithTooltip from '../../common/ElementWithTooltip';
import Modal from '../../common/Modal';
import CompareView from './CompareView';
import styles from './Values.module.css';
import ValuesView from './ValuesView';

interface Props {
  packageId: string;
  version: string;
  sortedVersions: VersionData[];
  normalizedName: string;
  visibleValues: boolean;
  compareVersionTo?: string | null;
  visibleValuesPath?: string | null;
}

interface Lines {
  [key: number]: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPathsPerLine = (values: any): Lines => {
  const lineCounter = new LineCounter();
  const doc = parseDocument(values, { lineCounter });
  const lines: Lines = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractKeys = (elem: any, path?: string) => {
    if (elem) {
      if (isDocument(elem) && elem.contents) {
        extractKeys(elem.contents);
      } else if (isMap(elem)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elem.items.forEach((item: any) => {
          const currentPath = getJMESPathForValuesSchema(item.key.value, path);
          const line = lineCounter.linePos(item.key.range[0]).line;
          lines[line] = currentPath;
          extractKeys(item.value, currentPath);
        });
      } else if (isSeq(elem)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const navigate = useNavigate();
  const location = useLocation();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [values, setValues] = useState<string | undefined | null>();
  const [currentPkgId, setCurrentPkgId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lines, setLines] = useState<Lines | undefined>();
  const [enabledDiff, setEnabledDiff] = useState<boolean>(
    !isUndefined(props.compareVersionTo) && !isNull(props.compareVersionTo)
  );
  const [comparedVersion, setComparedVersion] = useState<string>(props.compareVersionTo || '');
  const [visibleDropdown, setVisibleDropdown] = useState<boolean>(false);
  const ref = useRef(null);
  const versionsWrapper = useRef<HTMLDivElement>(null);
  useOutsideClick([ref], visibleDropdown, () => setVisibleDropdown(false));

  const cleanUrl = () => {
    navigate('', {
      state: location.state,
      replace: true,
    });
  };

  const updateUrl = (q: ValuesQuery) => {
    let selectedPath;
    if (!isUndefined(q.selectedLine) && !isUndefined(lines)) {
      selectedPath = lines[parseInt(q.selectedLine)];
    }
    navigate(
      {
        search: `?modal=values${selectedPath ? `&path=${selectedPath}` : ''}${
          q.template ? `&template=${q.template}` : ''
        }${q.compareTo ? `&compare-to=${q.compareTo}` : ''}`,
      },
      {
        state: location.state,
        replace: true,
      }
    );
  };

  async function getValues() {
    try {
      setIsLoading(true);
      const data = await API.getChartValues(props.packageId, props.version);
      setValues(data || ' ');
      setLines(getPathsPerLine(data));
      setCurrentPkgId(props.packageId);
      setIsLoading(false);
      setOpenStatus(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      cleanUrl();
    }
  }

  const onOpenModal = () => {
    getValues();
    if (!props.visibleValues) {
      updateUrl({});
    }
  };

  const onCloseModal = () => {
    setValues(undefined);
    setOpenStatus(false);
    setEnabledDiff(false);
    setComparedVersion('');
    cleanUrl();
  };

  const onVersionChange = (version: string) => {
    setComparedVersion(version);
    updateUrl({ compareTo: version });
    setVisibleDropdown(false);
    setEnabledDiff(true);
  };

  useEffect(() => {
    if (props.visibleValues && !openStatus && isUndefined(currentPkgId)) {
      onOpenModal();
    }
  }, []);

  useEffect(() => {
    if ((openStatus || props.visibleValues) && !isUndefined(currentPkgId)) {
      onCloseModal();
    }
  }, [props.packageId]);

  const isDisabledDiffView = props.sortedVersions.length <= 1 || values === ' ';

  return (
    <>
      <button
        className="btn btn-outline-secondary btn-sm w-100"
        onClick={onOpenModal}
        aria-label="Open default values modal"
      >
        <div className="d-flex flex-row align-items-center justify-content-center text-uppercase">
          {isLoading ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ms-2 fw-bold">Getting values...</span>
            </>
          ) : (
            <>
              <VscListTree className="me-2" />
              <span className="fw-bold">Default values</span>
            </>
          )}
        </div>
      </button>

      {openStatus && values && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={
            <div className="d-flex flex-row align-items-center flex-grow-1">
              <div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Default values</div>
              <div className="mx-4">
                <div className="btn-group" role="group">
                  <ElementWithTooltip
                    element={
                      <button
                        type="button"
                        className={classnames('btn btn-outline-primary btn-sm dropdown-toggle', {
                          disabled: isDisabledDiffView,
                        })}
                        onClick={() => setVisibleDropdown(!visibleDropdown)}
                        aria-label="Open diff template view"
                        aria-disabled={isDisabledDiffView}
                      >
                        <span className="pe-2">
                          {enabledDiff ? (
                            <span>
                              Comparing to version:
                              <span className="fw-bold ps-2">{comparedVersion}</span>
                            </span>
                          ) : (
                            'Compare to version ...'
                          )}
                        </span>
                      </button>
                    }
                    visibleTooltip={isDisabledDiffView}
                    tooltipMessage="There is only one version of this chart"
                    active
                  />

                  <div
                    ref={ref}
                    role="complementary"
                    className={classnames(
                      'dropdown-menu dropdown-menu-end text-nowrap overflow-hidden',
                      styles.versionsDropdown,
                      {
                        show: visibleDropdown,
                      }
                    )}
                  >
                    {enabledDiff && (
                      <>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setVisibleDropdown(false);
                            if (versionsWrapper && versionsWrapper.current) {
                              versionsWrapper.current.scroll(0, 0);
                            }
                            setEnabledDiff(false);
                            setComparedVersion('');
                          }}
                        >
                          <div className="d-flex flex-row align-items-center">
                            <MdClose />
                            <div className="ms-2">Exit compare mode</div>
                          </div>
                        </button>

                        <div className="dropdown-divider mb-0" />
                      </>
                    )}

                    <div
                      ref={versionsWrapper}
                      className={classnames('overflow-scroll h-100', { [`pt-2 ${styles.versionsList}`]: enabledDiff })}
                    >
                      {props.sortedVersions.map((v: VersionData) => {
                        if (v.version === props.version) return null;
                        return (
                          <button
                            key={`opt_${v.version}`}
                            className={`dropdown-item ${styles.btnItem}`}
                            onClick={() => onVersionChange(v.version)}
                          >
                            <div className="d-flex flex-row align-items-center">
                              <div className={styles.itemIcon}>
                                {v.version === comparedVersion && <GoCheck className="text-success" />}
                              </div>
                              <div className="ms-2 text-truncate">{v.version}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
          onClose={onCloseModal}
          open={openStatus}
          breakPoint="md"
          footerClassName={styles.modalFooter}
        >
          <div className="mw-100 h-100 d-flex flex-column overflow-hidden">
            {values && (
              <>
                {enabledDiff ? (
                  <CompareView
                    packageId={props.packageId}
                    values={values}
                    currentVersion={props.version}
                    comparedVersion={comparedVersion}
                  />
                ) : (
                  <ValuesView
                    values={values}
                    lines={lines}
                    normalizedName={props.normalizedName}
                    updateUrl={updateUrl}
                    visibleValuesPath={props.visibleValuesPath}
                  />
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default Values;
