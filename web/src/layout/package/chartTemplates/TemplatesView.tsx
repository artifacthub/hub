import { isNull } from 'lodash';
import { useEffect, useRef, useState } from 'react';

import { ChartTemplate, TemplatesQuery } from '../../../types';
import BlockCodeButtons from '../../common/BlockCodeButtons';
import ErrorBoundary from '../../common/ErrorBoundary';
import Loading from '../../common/Loading';
import Template from './Template';
import TemplatesList from './TemplatesList';
import styles from './TemplatesView.module.css';

interface Props {
  templates: ChartTemplate[] | null;
  values?: any;
  normalizedName: string;
  visibleTemplate?: string;
  updateUrl: (q: TemplatesQuery) => void;
}

const TemplatesView = (props: Props) => {
  const tmplWrapper = useRef<HTMLPreElement>(null);
  const [activeTemplate, setActiveTemplate] = useState<ChartTemplate | null>(null);
  const [isChangingTemplate, setIsChangingTemplate] = useState<boolean>(false);

  const onTemplateChange = (template: ChartTemplate | null) => {
    setIsChangingTemplate(true);
    setActiveTemplate(template);
    props.updateUrl({ template: template ? template.name : undefined });
    if (!isNull(template)) {
      if (tmplWrapper && tmplWrapper.current) {
        tmplWrapper.current.scroll(0, 0);
      }
    }
  };

  useEffect(() => {
    if (props.templates) {
      let activeTmpl;
      if (props.visibleTemplate) {
        activeTmpl = props.templates.find((tmpl: ChartTemplate) => tmpl.name === props.visibleTemplate);
        if (!activeTmpl) {
          props.updateUrl({ template: props.templates[0].name });
        }
      } else {
        props.updateUrl({ template: props.templates[0].name });
      }
      setActiveTemplate(activeTmpl || props.templates[0]);
    }
  }, [props.templates]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div className="d-flex flex-row align-items-stretch g-0 h-100 mh-100">
      <div className="col-3 h-100">
        <TemplatesList
          templates={props.templates}
          activeTemplateName={activeTemplate ? activeTemplate.name : undefined}
          onTemplateChange={onTemplateChange}
        />
      </div>

      <div className="col-9 ps-3 h-100">
        <div className={`position-relative h-100 mh-100 border ${styles.templateWrapper}`}>
          {isChangingTemplate && activeTemplate && <Loading />}
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
                  values={props.values}
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
