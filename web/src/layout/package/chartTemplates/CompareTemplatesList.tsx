import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { FaRegSquareMinus, FaRegSquarePlus } from 'react-icons/fa6';
import { TbSquareDot } from 'react-icons/tb';

import { ChartTmplTypeFile, CompareChartTemplate, CompareChartTemplateStatus } from '../../../types';
import styles from './CompareTemplatesList.module.css';
import ResourceLabel from './ResourceLabel';

interface Props {
  templates?: CompareChartTemplate[] | null;
  activeTemplateName?: string;
  onTemplateChange: (template: CompareChartTemplate | null) => void;
}

const CompareTemplatesList = (props: Props) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [visibleTemplates, setVisibleTemplates] = useState<CompareChartTemplate[]>(props.templates || []);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();

    setInputValue(e.target.value);
  };

  const getStatusIcon = (status: CompareChartTemplateStatus): JSX.Element => {
    return (
      <>
        {(() => {
          switch (status) {
            case CompareChartTemplateStatus.Deleted:
              return (
                <div className="text-danger" data-testid="tmpl-deleted-icon">
                  <FaRegSquareMinus />
                </div>
              );
            case CompareChartTemplateStatus.Added:
              return (
                <span className="text-success" data-testid="tmpl-added-icon">
                  <FaRegSquarePlus />
                </span>
              );
            case CompareChartTemplateStatus.Modified:
              return (
                <span className={styles.modifiedIcon} data-testid="tmpl-modified-icon">
                  <TbSquareDot />
                </span>
              );
            default:
              return null;
          }
        })()}
      </>
    );
  };

  useEffect(() => {
    const getVisibleTemplates = (): CompareChartTemplate[] => {
      const tmpls = props.templates || [];
      return tmpls.filter((tmpl: CompareChartTemplate) => {
        const term = `${tmpl.name} ${tmpl.resourceKinds ? tmpl.resourceKinds.join(' ') : ''}`.toLowerCase();
        return term.includes(inputValue.toLowerCase());
      });
    };

    const reviewActiveTemplate = (filteredTemplates: CompareChartTemplate[]) => {
      if (filteredTemplates.length === 0 && !isUndefined(props.activeTemplateName)) {
        props.onTemplateChange(null);
      } else {
        if (props.activeTemplateName) {
          const activeTemplate = filteredTemplates.find(
            (tmpl: CompareChartTemplate) => tmpl.name === props.activeTemplateName
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
      if (isUndefined(props.activeTemplateName) && props.templates) {
        props.onTemplateChange(props.templates[0]);
      }
    } else {
      const filteredTemplates = getVisibleTemplates();
      reviewActiveTemplate(filteredTemplates);
      setVisibleTemplates(filteredTemplates);
    }
  }, [inputValue, props.templates]);

  if (isNull(props.templates) || isUndefined(props.templates)) return null;
  return (
    <div className="h-100 d-flex flex-column overflow-auto pe-2">
      <div className="position-relative w-100">
        <div className="mb-3 input-group-sm">
          <input
            type="text"
            placeholder="Search by template or resource kind"
            className={`flex-grow-1 form-control ps-3 pe-4 ${styles.input}`}
            name="CompareChartTemplateInput"
            value={inputValue}
            onChange={onChange}
            spellCheck="false"
            disabled={isUndefined(props.templates) || props.templates.length === 0}
          />

          <FaSearch className={`text-muted position-absolute ${styles.searchIcon}`} />
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
          {visibleTemplates.map((template: CompareChartTemplate, index: number) => {
            const isActive: boolean =
              !isUndefined(props.activeTemplateName) && props.activeTemplateName === template.name;
            return (
              <div key={`template_${index}`}>
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
                                <div className="ps-2 ms-auto">{getStatusIcon(template.status)}</div>
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
                              <div className="ps-2 ms-auto">{getStatusIcon(template.status)}</div>
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

export default CompareTemplatesList;
