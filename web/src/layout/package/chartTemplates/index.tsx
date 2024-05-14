import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef, useState } from 'react';
import { GoCheck } from 'react-icons/go';
import { ImInsertTemplate } from 'react-icons/im';
import { MdClose } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';

import API from '../../../api';
import useOutsideClick from '../../../hooks/useOutsideClick';
import {
  ChartTemplate,
  ChartTmplTypeFile,
  DefinedTemplatesList,
  ErrorKind,
  RepositoryKind,
  TemplatesQuery,
  Version as VersionData,
} from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import formatChartTemplates from '../../../utils/formatChartTemplates';
import ElementWithTooltip from '../../common/ElementWithTooltip';
import Modal from '../../common/Modal';
import styles from './ChartTemplatesModal.module.css';
import CompareView from './CompareView';
import TemplatesView from './TemplatesView';

interface Props {
  normalizedName: string;
  packageId: string;
  version: string;
  sortedVersions: VersionData[];
  repoKind: RepositoryKind;
  visibleChartTemplates: boolean;
  visibleTemplate?: string | null;
  visibleLine?: string | null;
  compareVersionTo?: string | null;
}

const HELPER_TEMPLATE_NAME = /define "(.*?)"/;

const getDefinedTemplates = (templates: ChartTemplate[]): DefinedTemplatesList => {
  let tmplsInHelpers: DefinedTemplatesList = {};
  const helpers = templates.filter((tmpl: ChartTemplate) => tmpl.type === ChartTmplTypeFile.Helper);
  if (helpers) {
    helpers.forEach((tmpl: ChartTemplate) => {
      tmplsInHelpers = { ...tmplsInHelpers, ...readLines(tmpl) };
    });
  }
  return tmplsInHelpers;
};

const readLines = (template: ChartTemplate): DefinedTemplatesList => {
  const tmpls = template.data.split('\n\n');
  const tmplsLines = template.data.split(/\r?\n/);
  const tmplsInHelpers: DefinedTemplatesList = {};
  tmpls.forEach((code: string) => {
    const matches = code.match(HELPER_TEMPLATE_NAME);
    if (matches) {
      const currentLine = tmplsLines.findIndex((line: string) => line.includes(matches[0]));
      tmplsInHelpers[matches[1]] = {
        template: template.name,
        line: currentLine + 1,
      };
    }
  });
  return tmplsInHelpers;
};

const ChartTemplatesModal = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [templates, setTemplates] = useState<ChartTemplate[] | null | undefined>();
  const [templatesInHelpers, setTemplatesInHelpers] = useState<DefinedTemplatesList>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [values, setValues] = useState<any | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);
  const [currentVersion, setCurrentVersion] = useState<string>(props.version);
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
    });
  };

  const updateUrl = (q: TemplatesQuery) => {
    navigate(
      {
        search: `?modal=template${q.template ? `&template=${q.template}` : ''}${q.line ? `&line=${q.line}` : ''}${
          q.compareTo ? `&compare-to=${q.compareTo}` : ''
        }`,
      },
      {
        state: location.state,
      }
    );
  };

  const onVersionChange = (version: string) => {
    setComparedVersion(version);
    if (props.visibleTemplate) {
      updateUrl({ template: props.visibleTemplate, compareTo: version });
    }
    setVisibleDropdown(false);
    setEnabledDiff(true);
  };

  useEffect(() => {
    if (props.visibleChartTemplates) {
      if (!openStatus && props.repoKind === RepositoryKind.Helm) {
        onOpenModal();
      } else {
        cleanUrl();
      }
    }
  }, []);

  useEffect(() => {
    if (props.packageId !== currentPkgId && openStatus) {
      setOpenStatus(false);
    }
  }, [props.packageId]);

  if (props.repoKind !== RepositoryKind.Helm) return null;

  async function getChartTemplates() {
    try {
      setIsLoading(true);
      setCurrentPkgId(props.packageId);
      setCurrentVersion(props.version);

      const data = await API.getChartTemplates(props.packageId, props.version);
      if (data && data.templates) {
        const formattedTemplates = formatChartTemplates(data.templates);
        if (formattedTemplates.length > 0) {
          setTemplatesInHelpers(getDefinedTemplates(formattedTemplates));
          setTemplates(formattedTemplates);
          setValues(data ? { Values: { ...data.values } } : null);
          setOpenStatus(true);
        } else {
          setTemplates(null);
          alertDispatcher.postAlert({
            type: 'warning',
            message: 'This Helm chart does not contain any template.',
          });
          cleanUrl();
        }
      } else {
        setTemplates(null);
        alertDispatcher.postAlert({
          type: 'warning',
          message: 'This Helm chart does not contain any template.',
        });
        cleanUrl();
      }
      setIsLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.kind === ErrorKind.NotFound) {
        alertDispatcher.postAlert({
          type: 'danger',
          message:
            'We could not find the templates for this chart version. Please check that the chart tgz package still exists in the source repository as it might not be available anymore.',
          dismissOn: 10 * 1000, // 10s
        });
      } else {
        alertDispatcher.postAlert({
          type: 'danger',
          message: 'An error occurred getting chart templates, please try again later.',
        });
      }
      setTemplates(null);
      setValues(null);
      cleanUrl();
      setIsLoading(false);
    }
  }

  const onOpenModal = () => {
    if (templates && props.packageId === currentPkgId && props.version === currentVersion) {
      setOpenStatus(true);
      updateUrl({ template: templates[0].name });
    } else {
      getChartTemplates();
    }
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    setEnabledDiff(false);
    setComparedVersion('');
    navigate('', {
      state: location.state,
    });
  };

  const isDisabledDiffView = props.sortedVersions.length <= 1;

  return (
    <div className="mb-2">
      <div className="text-center">
        <button
          className="btn btn-outline-secondary btn-sm text-nowrap w-100"
          onClick={onOpenModal}
          aria-label="Open templates modal"
        >
          <div className="d-flex flex-row align-items-center justify-content-center">
            {isLoading ? (
              <>
                <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                <span className="d-none d-md-inline ms-2 fw-bold">Loading templates...</span>
              </>
            ) : (
              <>
                <ImInsertTemplate />
                <span className="ms-2 fw-bold text-uppercase">Templates</span>
              </>
            )}
          </div>
        </button>
      </div>

      {openStatus && templates && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={
            <div className="d-flex flex-row align-items-center flex-grow-1">
              <div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Templates</div>
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
                      styles.dropdown,
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
          closeButton={
            <div className="w-100 d-flex flex-row align-items-center justify-content-between">
              <small className="me-3">
                {!enabledDiff && (
                  <>
                    <span className="fw-bold">TIP:</span> some extra info may be displayed when hovering over{' '}
                    <span className="fw-bold">values</span> entries and other{' '}
                    <span className="fw-bold">built-in objects and functions</span>.
                  </>
                )}
              </small>

              <button
                className="btn btn-sm btn-outline-secondary text-uppercase"
                onClick={() => setOpenStatus(false)}
                aria-label="Close"
              >
                <div className="d-flex flex-row align-items-center">
                  <MdClose className="me-2" />
                  <div>Close</div>
                </div>
              </button>
            </div>
          }
          open={openStatus}
          breakPoint="md"
          footerClassName={styles.modalFooter}
        >
          <div className="h-100 mw-100">
            {!isUndefined(templates) && (
              <>
                {enabledDiff ? (
                  <CompareView
                    packageId={props.packageId}
                    templates={templates}
                    currentVersion={props.version}
                    updateUrl={updateUrl}
                    comparedVersion={comparedVersion}
                    visibleTemplate={props.visibleTemplate}
                  />
                ) : (
                  <TemplatesView
                    templates={templates}
                    templatesInHelpers={templatesInHelpers}
                    values={values}
                    normalizedName={props.normalizedName}
                    visibleTemplate={props.visibleTemplate}
                    visibleLine={props.visibleLine}
                    updateUrl={updateUrl}
                  />
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ChartTemplatesModal;
