import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef, useState } from 'react';

import { ChartTemplate, DefinedTemplatesList, TemplatesQuery } from '../../../types';
import BlockCodeButtons from '../../common/BlockCodeButtons';
import ErrorBoundary from '../../common/ErrorBoundary';
import Loading from '../../common/Loading';
import Template from './Template';
import TemplatesList from './TemplatesList';
import styles from './TemplatesView.module.css';

interface Props {
  templates: ChartTemplate[] | null;
  templatesInHelpers: DefinedTemplatesList;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values?: any;
  normalizedName: string;
  visibleTemplate?: string | null;
  visibleLine?: string | null;
  updateUrl: (q: TemplatesQuery) => void;
}

const TemplatesView = (props: Props) => {
  const tmplWrapper = useRef<HTMLPreElement>(null);
  const [activeTemplate, setActiveTemplate] = useState<ChartTemplate | null | undefined>();
  const [isChangingTemplate, setIsChangingTemplate] = useState<boolean>(false);

  const getChartTemplate = (name: string): ChartTemplate | null => {
    if (!isNull(props.templates)) {
      const selectedTemplate = props.templates.find((tmpl: ChartTemplate) => tmpl.name === name);
      return selectedTemplate || null;
    }
    return null;
  };

  const onTemplateChange = (template: ChartTemplate | null, line?: string) => {
    if (template !== activeTemplate || isNull(template)) {
      setIsChangingTemplate(true);
    }
    if (isNull(template)) {
      setActiveTemplate(null);
    } else {
      if (isUndefined(line)) {
        if (tmplWrapper && tmplWrapper.current) {
          tmplWrapper.current.scroll(0, 0);
        }
      }
    }
    props.updateUrl({ template: template ? template.name : undefined, line: line });
  };

  const onDefinedTemplateClick = (templateName: string, line: string, lineNumber: string) => {
    props.updateUrl({ template: activeTemplate!.name, line: lineNumber });
    const tmpl = getChartTemplate(templateName);
    if (!isNull(tmpl)) {
      onTemplateChange(tmpl, line);
    }
  };

  useEffect(() => {
    if (props.templates) {
      let activeTmpl = null;
      if (props.visibleTemplate) {
        activeTmpl = getChartTemplate(props.visibleTemplate);
      }
      if (!activeTmpl) {
        props.updateUrl({ template: props.templates[0].name });
      }
      setActiveTemplate(activeTmpl || props.templates[0]);
    }
  }, [props.templates]);

  useEffect(() => {
    if (props.templates && props.visibleTemplate) {
      const activeTmpl = getChartTemplate(props.visibleTemplate);
      if (!activeTmpl) {
        props.updateUrl({ template: props.templates[0].name });
      }
      if (
        isUndefined(activeTemplate) ||
        isNull(activeTemplate) ||
        (activeTmpl && activeTemplate.name !== activeTmpl.name)
      ) {
        setActiveTemplate(activeTmpl || props.templates[0]);
      }
    }
  }, [props.visibleTemplate]);

  return (
    <div className="d-flex flex-row align-items-stretch g-0 h-100 mh-100">
      <div className="col-3 h-100">
        <TemplatesList
          templates={props.templates}
          activeTemplateName={activeTemplate ? activeTemplate.name : props.visibleTemplate}
          onTemplateChange={onTemplateChange}
        />
      </div>

      <div className="col-9 ps-3 h-100">
        <div className={`position-relative h-100 mh-100 border border-1 ${styles.templateWrapper}`}>
          {((isChangingTemplate && activeTemplate) || isUndefined(activeTemplate)) && <Loading />}
          {activeTemplate && (
            <BlockCodeButtons
              filename={`${props.normalizedName}-${activeTemplate.name}`}
              content={activeTemplate.data}
              boxShadowColor="var(--extra-light-gray)"
            />
          )}
          <pre
            ref={tmplWrapper}
            className={`text-muted h-100 mh-100 mb-0 overflow-auto position-relative ${styles.pre}`}
          >
            {activeTemplate && (
              <ErrorBoundary className={styles.errorAlert} message="Something went wrong rendering the template.">
                <Template
                  template={activeTemplate!}
                  templatesInHelpers={props.templatesInHelpers}
                  values={props.values}
                  visibleLine={props.visibleLine}
                  onDefinedTemplateClick={onDefinedTemplateClick}
                  setIsChangingTemplate={setIsChangingTemplate}
                />
              </ErrorBoundary>
            )}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TemplatesView;
