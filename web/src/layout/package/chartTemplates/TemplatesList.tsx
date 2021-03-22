import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';

import { ChartTemplate, ChartTmplTypeFile } from '../../../types';
import ResourceLabel from './ResourceLabel';
import styles from './TemplatesList.module.css';

interface Props {
  templates: ChartTemplate[];
  activeTemplateName?: string;
  onTemplateChange: (template: ChartTemplate | null) => void;
}

const TemplatesList = (props: Props) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [visibleTemplates, setVisibleTemplates] = useState<ChartTemplate[]>(props.templates);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();

    setInputValue(e.target.value);
  };

  useEffect(() => {
    const getVisibleTemplates = (): ChartTemplate[] => {
      return props.templates.filter((tmpl: ChartTemplate) => {
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
      setVisibleTemplates(props.templates);
      if (isUndefined(props.activeTemplateName)) {
        props.onTemplateChange(props.templates[0]);
      }
    } else {
      const filteredTemplates = getVisibleTemplates();
      reviewActiveTemplate(filteredTemplates);
      setVisibleTemplates(filteredTemplates);
    }
  }, [inputValue]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div className="h-100 d-flex flex-column overflow-auto pr-2">
      <div className="position-relative w-100">
        <div className="form-group input-group-sm">
          <input
            type="text"
            placeholder="Search by template or resource kind"
            className={`flex-grow-1 form-control pl-3 pr-4 ${styles.input}`}
            name="chartTemplateInput"
            value={inputValue}
            onChange={onChange}
            spellCheck="false"
          />

          <FaSearch className={`text-muted position-absolute ${styles.searchIcon}`} />

          <div className="alert p-0 mt-3">
            <small className="text-muted text-break font-italic">
              This chart version contains <span className="font-weight-bold">{props.templates.length}</span> templates
            </small>
          </div>
        </div>
      </div>

      {visibleTemplates.length === 0 ? (
        <div className={`alert alert-dark p-2 text-center ${styles.alert}`} role="alert">
          <small className="text-muted">Sorry, no matches found</small>
        </div>
      ) : (
        <>
          {visibleTemplates.map((template: ChartTemplate, index: number) => (
            <div key={`template_${index}`}>
              <button
                data-testid="tmplBtn"
                className={classnames('btn btn-light btn-sm mb-2 text-left w-100', styles.btn, {
                  [`activeTemplate ${styles.active}`]:
                    props.activeTemplateName && props.activeTemplateName === template.name,
                })}
                onClick={() => {
                  if (props.activeTemplateName && props.activeTemplateName !== template.name) {
                    props.onTemplateChange(template);
                  }
                }}
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
                          <div className="mb-1 text-truncate">
                            <div className={`d-inline-block ${styles.legend}`}>
                              <small className="text-muted text-uppercase">Helper:</small>
                            </div>
                            {template.name}
                          </div>
                        );
                    }
                  })()}
                </div>
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default TemplatesList;
