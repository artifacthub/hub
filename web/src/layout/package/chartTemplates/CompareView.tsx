import differenceBy from 'lodash/differenceBy';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { useEffect, useState } from 'react';
import { BsArrowsCollapse, BsArrowsExpand } from 'react-icons/bs';

import API from '../../../api';
import { ChartTemplate, CompareChartTemplate, CompareChartTemplateStatus, TemplatesQuery } from '../../../types';
import formatChartTemplates from '../../../utils/formatChartTemplates';
import ErrorBoundary from '../../common/ErrorBoundary';
import Loading from '../../common/Loading';
import CompareTemplatesList from './CompareTemplatesList';
import styles from './CompareView.module.css';
import DiffTemplate from './DiffTemplate';

interface Props {
  packageId: string;
  templates: ChartTemplate[] | null;
  currentVersion: string;
  visibleTemplate?: string | null;
  comparedVersion: string;
  updateUrl: (q: TemplatesQuery) => void;
}

const CompareView = (props: Props) => {
  const [diffTemplates, setDiffTemplates] = useState<ChartTemplate[] | null | undefined>();
  const [activeTemplate, setActiveTemplate] = useState<CompareChartTemplate | null>(null);
  const [isChangingTemplate, setIsChangingTemplate] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [visibleTemplates, setVisibleTemplates] = useState<CompareChartTemplate[] | undefined>();
  const [expanded, setExpanded] = useState<boolean>(false);

  const onTemplateChange = (template: CompareChartTemplate | null) => {
    setIsChangingTemplate(true);
    setExpanded(false);
    setActiveTemplate(template);
    props.updateUrl({ template: template ? template.name : undefined, compareTo: props.comparedVersion });
  };

  useEffect(() => {
    async function getDiffCompareChartTemplates(version: string) {
      try {
        setIsChangingTemplate(true);
        setIsLoading(true);
        const data = await API.getChartTemplates(props.packageId, version);
        if (data && data.templates) {
          const formattedTemplates: ChartTemplate[] = formatChartTemplates(data.templates);
          if (formattedTemplates.length > 0) {
            setDiffTemplates(formattedTemplates);
          } else {
            setDiffTemplates([]);
          }
        }
      } catch {
        setDiffTemplates(null);
        setIsChangingTemplate(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (props.comparedVersion !== '') {
      getDiffCompareChartTemplates(props.comparedVersion);
    } else {
      setDiffTemplates([]);
    }
  }, [props.comparedVersion]);

  useEffect(() => {
    const prepareVisibleTemplates = () => {
      const tmpls: CompareChartTemplate[] = [];
      props.templates!.forEach((tmpl: ChartTemplate) => {
        const diffTmpl = diffTemplates!.find((t: ChartTemplate) => t.name === tmpl.name);
        if (diffTmpl) {
          if (diffTmpl.data !== tmpl.data) {
            tmpls.push({ ...tmpl, compareData: diffTmpl.data, status: CompareChartTemplateStatus.Modified });
          }
        } else {
          tmpls.push({
            ...tmpl,
            compareData: '',
            status: CompareChartTemplateStatus.Added,
          });
        }
      });
      const others = differenceBy(diffTemplates!, props.templates!, 'name');
      others.forEach((tmpl: ChartTemplate) => {
        tmpls.push({
          ...tmpl,
          data: '',
          compareData: tmpl.data,
          status: CompareChartTemplateStatus.Deleted,
        });
      });
      const sortedTmpls: CompareChartTemplate[] = sortBy(tmpls, ['type', 'name']);
      setVisibleTemplates(sortedTmpls);
      if (sortedTmpls.length === 0) {
        setActiveTemplate(null);
      } else {
        if (props.visibleTemplate) {
          const selectedTmpl = sortedTmpls.find((tmpl: CompareChartTemplate) => props.visibleTemplate === tmpl.name);
          if (selectedTmpl) {
            setActiveTemplate(selectedTmpl);
          } else {
            setActiveTemplate(sortedTmpls[0]);
          }
        } else {
          setActiveTemplate(sortedTmpls[0]);
        }
      }
    };

    if (diffTemplates && !isNull(props.templates)) {
      prepareVisibleTemplates();
      setIsChangingTemplate(false);
    }
  }, [diffTemplates]);

  return (
    <div className="d-flex flex-row align-items-stretch g-0 h-100 mh-100">
      <div className="col-3 h-100">
        <CompareTemplatesList
          templates={visibleTemplates}
          activeTemplateName={activeTemplate ? activeTemplate.name : undefined}
          onTemplateChange={onTemplateChange}
        />
      </div>

      <div className="col-9 ps-3 h-100">
        <div className={`position-relative h-100 mh-100 border border-1 ${styles.templateWrapper}`}>
          {((isChangingTemplate && activeTemplate) || isLoading) && <Loading />}
          <div className={`position-absolute d-flex ${styles.wrapper}`}>
            <div className="position-relative">
              <button
                className={`btn btn-sm btn-primary fs-5 ${styles.btn}`}
                onClick={() => {
                  setExpanded(!expanded);
                }}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} code`}
                disabled={!isUndefined(visibleTemplates) && visibleTemplates.length === 0}
              >
                {expanded ? <BsArrowsCollapse /> : <BsArrowsExpand />}
              </button>
            </div>
          </div>

          <pre className={`text-muted h-100 mh-100 mb-0 overflow-hidden position-relative diffTemplate ${styles.pre}`}>
            {!isUndefined(visibleTemplates) && visibleTemplates.length === 0 && (
              <div className="d-flex align-items-center justify-content-center h-100 w-100 p-5">
                <div className={`alert alert-dark px-5 py-4 text-center ${styles.alert}`}>
                  <span className="text-muted">
                    No changes found when comparing version <span className="fw-bold">{props.currentVersion}</span> to{' '}
                    <span className="fw-bold">{props.comparedVersion}</span>
                  </span>
                </div>
              </div>
            )}
            {activeTemplate && (
              <ErrorBoundary className={styles.errorAlert} message="Something went wrong rendering the template.">
                <DiffTemplate
                  currentVersion={props.currentVersion}
                  diffVersion={props.comparedVersion}
                  template={activeTemplate!}
                  expanded={expanded}
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

export default CompareView;
