import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';

import { ChartTemplate, ChartTmplTypeFile } from '../../../types';
import isVisibleItemInContainer from '../../../utils/isVisibleItemInContainer';
import ResourceLabel from './ResourceLabel';
import styles from './TemplatesList.module.css';

interface Props {
  templates: ChartTemplate[] | null;
  activeTemplateName?: string | null;
  onTemplateChange: (template: ChartTemplate | null) => void;
}

const TemplatesList = (props: Props) => {
  const templatesListWrapper = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [visibleTemplates, setVisibleTemplates] = useState<ChartTemplate[]>(props.templates || []);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();

    setInputValue(e.target.value);
  };

  useEffect(() => {
    const getVisibleTemplates = (): ChartTemplate[] => {
      const tmpls = props.templates || [];
      return tmpls.filter((tmpl: ChartTemplate) => {
        const term = `${tmpl.name} ${tmpl.resourceKinds ? tmpl.resourceKinds.join(' ') : ''}`.toLowerCase();
        return term.includes(inputValue.toLowerCase());
      });
    };

    const reviewActiveTemplate = (filteredTemplates: ChartTemplate[]) => {
      if (filteredTemplates.length === 0 && !isUndefined(props.activeTemplateName)) {
        props.onTemplateChange(null);
      } else {
        if (props.activeTemplateName) {
          const activeTemplate = filteredTemplates.find(
            (tmpl: ChartTemplate) => tmpl.name === props.activeTemplateName
          );
          if (isUndefined(activeTemplate)) {
            props.onTemplateChange(filteredTemplates[0]);
          }
        } else {
          props.onTemplateChange(filteredTemplates[0]);
        }
      }
    };

    if (inputValue === '') {
      setVisibleTemplates(props.templates || []);
      if (isUndefined(props.activeTemplateName) && !isNull(props.templates)) {
        props.onTemplateChange(props.templates[0]);
      }
    } else {
      const filteredTemplates = getVisibleTemplates();
      reviewActiveTemplate(filteredTemplates);
      setVisibleTemplates(filteredTemplates);
    }
  }, [inputValue]);

  // Display active template in list
  useLayoutEffect(() => {
    if (props.activeTemplateName) {
      const element = document.getElementById(`tmpl_${props.activeTemplateName}`);
      if (element && templatesListWrapper && templatesListWrapper.current) {
        const isVisible = isVisibleItemInContainer(element as HTMLDivElement, templatesListWrapper.current);
        if (!isVisible) {
          element.scrollIntoView({ block: 'start' });
        }
      }
    }
  }, [props.activeTemplateName]);

  if (isNull(props.templates)) return null;
  return (
    <div ref={templatesListWrapper} className="h-100 d-flex flex-column overflow-auto pe-2">
      <div className="position-relative w-100">
        <div className="mb-3 input-group-sm">
          <input
            type="text"
            placeholder="Search by template or resource kind"
            className={`flex-grow-1 form-control ps-3 pe-4 ${styles.input}`}
            name="chartTemplateInput"
            value={inputValue}
            onChange={onChange}
            spellCheck="false"
          />

          <FaSearch className={`text-muted position-absolute ${styles.searchIcon}`} />

          <div className="alert p-0 mt-3">
            <small className="text-muted text-break fst-italic">
              This chart version contains <span className="fw-bold">{props.templates.length}</span>{' '}
              {props.templates.length === 1 ? 'template' : 'templates'}
            </small>
          </div>
        </div>
      </div>

      {visibleTemplates.length === 0 ? (
        <div
          className={`alert alert-dark p-2 text-center ${styles.alert}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <small className="text-muted">Sorry, no matches found</small>
        </div>
      ) : (
        <>
          {visibleTemplates.map((template: ChartTemplate, index: number) => {
            const isActive: boolean =
              !isUndefined(props.activeTemplateName) && props.activeTemplateName === template.name;
            return (
              <div id={`tmpl_${template.name}`} key={`template_${index}`}>
                <button
                  className={classnames('btn btn-light btn-sm mb-2 text-start w-100', styles.btn, {
                    [`activeTemplate ${styles.active}`]: isActive,
                  })}
                  onClick={() => {
                    if (!isActive) {
                      props.onTemplateChange(template);
                    }
                  }}
                  aria-label={`Show template ${template.name}`}
                  aria-pressed={isActive}
                >
                  <div className="d-flex flex-column">
                    {(() => {
                      switch (template.type) {
                        case ChartTmplTypeFile.Template:
                          return (
                            <>
                              <div className="d-flex flex-row align-items-baseline mb-1">
                                <div className={styles.legend}>
                                  <small className="text-muted text-uppercase">Template:</small>
                                </div>
                                <div className={`text-truncate ${styles.templateName}`}>{template.name}</div>
                              </div>
                              <div className="d-flex flex-row mb-1">
                                <div className={styles.legend}>
                                  <small className="text-muted text-uppercase">Resource:</small>
                                </div>
                                {template.resourceKinds && template.resourceKinds.length > 0 ? (
                                  <>
                                    {template.resourceKinds.length > 1 ? (
                                      <>
                                        <ResourceLabel text="Multiple kinds" />
                                      </>
                                    ) : (
                                      <ResourceLabel text={template.resourceKinds[0]} />
                                    )}
                                  </>
                                ) : (
                                  <>-</>
                                )}
                              </div>
                            </>
                          );
                        case ChartTmplTypeFile.Helper:
                          return (
                            <div className="d-flex flex-row align-items-baseline mb-1">
                              <div className={styles.legend}>
                                <small className="text-muted text-uppercase">Helper:</small>
                              </div>
                              <div className={`text-truncate ${styles.templateName}`}>{template.name}</div>
                            </div>
                          );
                      }
                    })()}
                  </div>
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default TemplatesList;
