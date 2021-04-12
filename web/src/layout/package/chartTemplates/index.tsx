import { compact, isNull, uniq } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { ImInsertTemplate } from 'react-icons/im';
import { MdClose } from 'react-icons/md';
import { useHistory } from 'react-router-dom';

import { API } from '../../../api';
import { ChartTemplate, ChartTmplTypeFile, RepositoryKind, SearchFiltersURL } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import BlockCodeButtons from '../../common/BlockCodeButtons';
import ErrorBoundary from '../../common/ErrorBoundary';
import Loading from '../../common/Loading';
import Modal from '../../common/Modal';
import styles from './ChartTemplatesModal.module.css';
import Template from './Template';
import TemplatesList from './TemplatesList';

interface Props {
  packageId: string;
  version: string;
  repoKind: RepositoryKind;
  visibleChartTemplates: boolean;
  visibleTemplate?: string;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  btnClassName?: string;
}

interface FileProps {
  name: string;
  extension: string;
}

const KIND = /(\nkind: [A-Za-z0-9"]*|^kind: [A-Za-z0-9"]*)/g;

const getFileNameAndExt = (str: string): FileProps => {
  const file = str.split('/').pop() || str;
  return {
    name: file.substr(0, file.lastIndexOf('.')),
    extension: file.substr(file.lastIndexOf('.') + 1, file.length),
  };
};

const getResourceKinds = (data: string): string[] => {
  const kinds = data.match(KIND);
  if (kinds) {
    const cleanKinds = kinds.map((kind: string) => {
      const parts = kind.split(':');
      return parts[1].replaceAll('"', '').trim();
    });
    return uniq(compact(cleanKinds));
  }
  return [];
};

const decodeData = (data: string): string => {
  try {
    return atob(data);
  } catch {
    return Buffer.from(data, 'base64').toString('binary');
  }
};

const formatTemplates = (templates: ChartTemplate[]): ChartTemplate[] => {
  let finalTemplates: ChartTemplate[] = [];
  let finalHelpers: ChartTemplate[] = [];
  templates.forEach((template: ChartTemplate) => {
    const templateName = template.name.replace('templates/', '');
    const { name, extension } = getFileNameAndExt(templateName);
    if (['yaml', 'tpl'].includes(extension)) {
      const decodedData = decodeData(template.data);
      const tmpl = {
        name: templateName,
        fileName: name,
        resourceKinds: getResourceKinds(decodedData),
        data: decodedData,
      };

      if (extension === 'yaml') {
        finalTemplates.push({ ...tmpl, type: ChartTmplTypeFile.Template });
      } else {
        finalHelpers.push({ ...tmpl, type: ChartTmplTypeFile.Helper });
      }
    }
  });
  return [...finalTemplates, ...finalHelpers];
};

const ChartTemplatesModal = (props: Props) => {
  const history = useHistory();
  const anchor = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [templates, setTemplates] = useState<ChartTemplate[] | null | undefined>();
  const [activeTemplate, setActiveTemplate] = useState<ChartTemplate | null>(null);
  const [values, setValues] = useState<any | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPkgId, setCurrentPkgId] = useState<string>(props.packageId);
  const [currentVersion, setCurrentVersion] = useState<string>(props.version);
  const [isChangingTemplate, setIsChangingTemplate] = useState<boolean>(false);

  const onTemplateChange = (template: ChartTemplate | null) => {
    setIsChangingTemplate(true);
    setActiveTemplate(template);
    updateUrl(template ? template.name : undefined);
    if (!isNull(template)) {
      if (anchor && anchor.current) {
        anchor.current.scrollIntoView({
          block: 'start',
          inline: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  };

  const updateUrl = (templateName?: string) => {
    history.replace({
      search: `?modal=template${templateName ? `&template=${templateName}` : ''}`,
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
    if (props.visibleChartTemplates && !openStatus && props.repoKind === RepositoryKind.Helm) {
      onOpenModal();
    } else {
      cleanUrl();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (props.packageId !== currentPkgId && openStatus) {
      setOpenStatus(false);
    }
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (props.repoKind !== RepositoryKind.Helm) return null;

  async function getChartTemplates() {
    try {
      setIsLoading(true);
      setCurrentPkgId(props.packageId);
      setCurrentVersion(props.version);

      const data = await API.getChartTemplates(props.packageId, props.version);
      if (data && data.templates) {
        const formattedTemplates = formatTemplates(data.templates);
        if (formattedTemplates.length > 0) {
          setTemplates(formattedTemplates);
          let activeTmpl;
          if (props.visibleTemplate) {
            activeTmpl = formattedTemplates.find((tmpl: ChartTemplate) => tmpl.name === props.visibleTemplate);
            if (!activeTmpl) {
              updateUrl(formattedTemplates[0].name);
            }
          } else {
            updateUrl(formattedTemplates[0].name);
          }
          setActiveTemplate(activeTmpl || formattedTemplates[0]);
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
    } catch {
      setTemplates(null);
      setValues(null);
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'An error occurred getting chart templates, please try again later.',
      });
      cleanUrl();
      setIsLoading(false);
    }
  }

  const onOpenModal = () => {
    if (templates && props.packageId === currentPkgId && props.version === currentVersion) {
      setOpenStatus(true);
    } else {
      getChartTemplates();
    }
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    setActiveTemplate(templates ? templates[0] : null);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  return (
    <div className="mb-2">
      <div className="text-center">
        <button
          data-testid="tmplModalBtn"
          className={`btn btn-secondary btn-sm text-nowrap ${props.btnClassName}`}
          onClick={onOpenModal}
        >
          <div className="d-flex flex-row align-items-center justify-content-center">
            {isLoading ? (
              <>
                <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                <span className="d-none d-md-inline ml-2 font-weight-bold">Loading templates...</span>
              </>
            ) : (
              <>
                <ImInsertTemplate />
                <span className="ml-2 font-weight-bold text-uppercase">Templates</span>
              </>
            )}
          </div>
        </button>
      </div>

      {openStatus && templates && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Templates</div>}
          onClose={onCloseModal}
          closeButton={
            <div className="w-100 d-flex flex-row align-items-center justify-content-between">
              <small className="mr-3">
                <span className="font-weight-bold">TIP:</span> some extra info may be displayed when hovering over{' '}
                <span className="font-weight-bold">values</span> entries and other{' '}
                <span className="font-weight-bold">built-in objects and functions</span>.
              </small>
              <button className="btn btn-sm btn-secondary text-uppercase" onClick={() => setOpenStatus(false)}>
                <div className="d-flex flex-row align-items-center">
                  <MdClose className="mr-2" />
                  <div>Close</div>
                </div>
              </button>
            </div>
          }
          open={openStatus}
          breakPoint="md"
        >
          <div className="h-100 mw-100">
            <div className="d-flex flex-row align-items-strecht no-gutters h-100 mh-100">
              <div className="col-3 h-100">
                <TemplatesList
                  templates={templates}
                  activeTemplateName={activeTemplate ? activeTemplate.name : undefined}
                  onTemplateChange={onTemplateChange}
                />
              </div>

              <div className="col-9 pl-3 h-100">
                <div className={`position-relative h-100 mh-100 ${styles.templateWrapper}`}>
                  {isChangingTemplate && activeTemplate && <Loading />}
                  {activeTemplate && (
                    <BlockCodeButtons
                      filename={activeTemplate.name}
                      content={activeTemplate.data}
                      boxShadowColor="var(--extra-light-gray)"
                    />
                  )}
                  <pre className={`text-muted h-100 mh-100 mb-0 overflow-auto position-relative ${styles.pre}`}>
                    {activeTemplate && (
                      <ErrorBoundary
                        className={styles.errorAlert}
                        message="Something went wrong rendering the template."
                      >
                        <>
                          <div className={`position-absolute ${styles.anchor}`} ref={anchor} />
                          <Template
                            template={activeTemplate!}
                            values={values}
                            setIsChangingTemplate={setIsChangingTemplate}
                          />
                        </>
                      </ErrorBoundary>
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ChartTemplatesModal;
