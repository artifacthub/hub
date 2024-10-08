import classnames from 'classnames';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import { Dispatch, Fragment, memo, SetStateAction, useContext, useEffect, useState } from 'react';
import regexifyString from 'regexify-string';

import { AppCtx } from '../../../context/AppCtx';
import { ChartTemplate, ChartTemplateSpecialType, DefinedTemplate, DefinedTemplatesList } from '../../../types';
import processHelmTemplate from '../../../utils/processHelmTemplate';
import AutoresizeTextarea from '../../common/AutoresizeTextarea';
import ParamInfo from './ParamInfo';
import styles from './Template.module.css';

interface Props {
  template: ChartTemplate;
  visibleLine?: string | null;
  templatesInHelpers: DefinedTemplatesList;
  onDefinedTemplateClick: (templateName: string, line: string, lineNumber: string) => void;
  setIsChangingTemplate: Dispatch<SetStateAction<boolean>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values?: any;
}

const HIGHLIGHT_PATTERN = /{{(?!\/\*)(.*?)([^{]|{})*}}/;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FUNCTIONS_DEFINITIONS = require('./functions.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BUILTIN_DEFINITIONS = require('./builtIn.json');
const SPECIAL_CHARACTERS = /[^|({})-]+/;
const TOKENIZE_RE = /[^\s"']+|"([^"]*)"|'([^']*)/g;
const INITIAL_HELPER_COMMENT = /{{\/\*|{{- \/\*/;
const FINAL_HELPER_COMMENT = /\*\/}}|\*\/ -}}$/;

const Template = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [activeTemplate, setActiveTemplate] = useState<ChartTemplate>(props.template);
  const { effective } = ctx.prefs.theme;

  useEffect(() => {
    props.setIsChangingTemplate(false);
    goToLine();
  }, [activeTemplate]);

  useEffect(() => {
    if (props.template !== activeTemplate) {
      setActiveTemplate(props.template);
    }
  }, [activeTemplate, props.template]);

  useEffect(() => {
    goToLine();
  }, [props.visibleLine]);

  const goToLine = () => {
    if (props.visibleLine) {
      const element = document.getElementById(`line_${props.visibleLine}`);
      if (element) {
        element.scrollIntoView({ block: 'start' }); //, inline: 'nearest', behavior: 'smooth' });
      }
    }
  };

  const processActiveTemplate = (tmpl: string): JSX.Element | null => {
    const rows = tmpl.split('\n');
    // Don't display last line if empty
    const cleanRows = [...rows];
    // eslint-disable-next-line for-direction
    for (let i = rows.length - 1; i < rows.length; --i) {
      if (rows[i].trim() === '') {
        cleanRows.splice(i, 1);
      } else {
        break;
      }
    }

    let isComment = false;

    const rowsContent = cleanRows.map((line: string, index: number) => {
      if (line.match(INITIAL_HELPER_COMMENT) && !line.match(FINAL_HELPER_COMMENT)) {
        isComment = true;
      } else if (line.match(FINAL_HELPER_COMMENT)) {
        isComment = false;
      }

      return (
        <div className="d-flex flex-row my-1 position-relative" key={`active-tmps-${index}`}>
          <div data-testid="anchor" className={`position-absolute ${styles.anchor}`} id={`line_${index + 1}`} />
          <div className={`text-end me-3 ${styles.lineNumber}`}>{index + 1}</div>
          <div className="flex-grow-1 position-relative">
            {props.visibleLine && parseInt(props.visibleLine) === index + 1 && (
              <div className={`position-absolute ${styles.activeLine}`} />
            )}
            {line.startsWith('#') ||
            line.match(INITIAL_HELPER_COMMENT) ||
            line.match(FINAL_HELPER_COMMENT) ||
            isComment ? (
              <span className={`${styles.tmplComment} ${styles[`${effective}Theme`]}`}>{line}</span>
            ) : (
              <>{processLine(line, index + 1)}</>
            )}
          </div>
          <div className="ps-2" />
        </div>
      );
    });

    return (
      <code>
        <div className={styles.codeWrapper}>{rowsContent}</div>
      </code>
    );
  };

  const renderValue = (word: string) => {
    const defaultValue = get(props.values, word.slice(1));
    const isDefaultObject = isObject(defaultValue);
    const formattedValue =
      isDefaultObject && !isEmpty(defaultValue) ? JSON.stringify(defaultValue, null, 2) : JSON.stringify(defaultValue);

    return (
      <ParamInfo
        element={<span className={`${styles.tmplValue} ${styles[`${effective}Theme`]}`}>{word}</span>}
        info={
          <div className="p-2 text-truncate">
            <span className="text-muted me-2 normalOpacityFont">DEFAULT:</span>

            {isDefaultObject ? (
              <>
                {isEmpty(defaultValue) ? (
                  <span className="text-nowrap">{formattedValue}</span>
                ) : (
                  <div className={`mt-2 ${styles.textarea}`}>
                    <AutoresizeTextarea name="template" value={formattedValue} minRows={1} maxRows={20} disabled />
                  </div>
                )}
              </>
            ) : (
              <span>{isString(defaultValue) ? defaultValue || `""` : formattedValue}</span>
            )}
          </div>
        }
        fixedWidth={isDefaultObject && !isEmpty(defaultValue)}
      />
    );
  };

  const renderTemplateFunction = (word: string) => {
    const definition = FUNCTIONS_DEFINITIONS[word];
    if (definition) {
      return (
        <ParamInfo
          element={<span className={`${styles.tmplFunction} ${styles[`${effective}Theme`]}`}>{word}</span>}
          info={FUNCTIONS_DEFINITIONS[word]}
          isMarkdown
          fixedWidth
        />
      );
    } else {
      return <span className={`${styles.tmplFunction} ${styles[`${effective}Theme`]}`}>{word}</span>;
    }
  };

  const renderTemplateBuiltIn = (word: string) => {
    const definition = BUILTIN_DEFINITIONS[word];
    if (definition) {
      return (
        <ParamInfo
          element={<span className={`${styles.tmplBuiltIn}  ${styles[`${effective}Theme`]}`}>{word}</span>}
          info={BUILTIN_DEFINITIONS[word]}
          isMarkdown
          fixedWidth
        />
      );
    } else {
      return <span className={`${styles.tmplBuiltIn} ${styles[`${effective}Theme`]}`}>{word}</span>;
    }
  };

  const renderDefinedTemplate = (word: string, lineNumber: string): JSX.Element => {
    const templateInHelper: DefinedTemplate | undefined = !isEmpty(props.templatesInHelpers)
      ? props.templatesInHelpers[word.replace(/"/g, '')]
      : undefined;
    if (isUndefined(templateInHelper)) {
      return <>{word}</>;
    } else {
      return (
        <>
          <ParamInfo
            element={<span className={`${styles.tmplDefinedTemplate}  ${styles[`${effective}Theme`]}`}>{word}</span>}
            info={
              <div className="d-flex flex-column p-2">
                <div className={styles.definedTemplate}>
                  Template defined in <span className="fw-bold">{templateInHelper.template}</span> line{' '}
                  <span className="fw-bold">{templateInHelper.line}</span>
                </div>
                <div>
                  <button
                    className="ps-0 btn btn-sm btn-link"
                    onClick={() => {
                      props.onDefinedTemplateClick(
                        templateInHelper!.template,
                        templateInHelper!.line.toString(),
                        lineNumber
                      );
                      goToLine();
                    }}
                  >
                    <small>Go to definition</small>
                  </button>
                </div>
              </div>
            }
          />
        </>
      );
    }
  };

  const tokenizeContent = (str: string, lineNumber: string): JSX.Element | null => {
    const parts = str.match(TOKENIZE_RE);
    if (isNull(parts)) return null;
    return (
      <span className={`badge fw-normal border border-1 bg-white ${styles.badge}`}>
        {parts.map((word: string, idx: number) => {
          if (word === ')' || word === '|')
            return (
              <Fragment key={`helmTmpl_${lineNumber}_${idx}`}>
                <span
                  className={classnames(
                    'd-inline-flex',
                    { [styles.specialCharacter]: word === ')' },
                    { [styles.prevSpace]: word !== ')' }
                  )}
                >
                  {word}
                </span>{' '}
              </Fragment>
            );

          if (word.startsWith('"')) {
            // Only render defined template when is after template or include
            if (['template', 'include'].includes(parts[idx - 1])) {
              return (
                <Fragment key={`helmTmpl_${lineNumber}_${idx}`}>{renderDefinedTemplate(word, lineNumber)} </Fragment>
              );
            } else {
              return (
                <Fragment key={`helmTmpl_${lineNumber}_${idx}`}>
                  <span className="d-inline-flex">{word}</span>{' '}
                </Fragment>
              );
            }
          }

          return (
            <Fragment key={`helmTmpl_${lineNumber}_${idx}`}>
              {regexifyString({
                pattern: SPECIAL_CHARACTERS,
                decorator: (match, index) => {
                  return (
                    <Fragment key={`helmTmplReg_${lineNumber}_${index}`}>
                      {(() => {
                        switch (processHelmTemplate(match)) {
                          case ChartTemplateSpecialType.BuiltInObject:
                            return <>{renderTemplateBuiltIn(match)}</>;
                          case ChartTemplateSpecialType.ValuesBuiltInObject:
                            return <>{renderValue(match)}</>;
                          case ChartTemplateSpecialType.Function:
                            return <>{renderTemplateFunction(match)}</>;
                          case ChartTemplateSpecialType.FlowControl:
                            return (
                              <span className={`${styles.tmplFlowControl} ${styles[`${effective}Theme`]}`}>
                                {match}
                              </span>
                            );
                          case ChartTemplateSpecialType.Variable:
                            return (
                              <span className={`${styles.tmplVariable} ${styles[`${effective}Theme`]}`}>{match}</span>
                            );
                          default:
                            return <>{word}</>;
                        }
                      })()}
                    </Fragment>
                  );
                },
                input: word,
              })}
              {idx === parts.length - 1 ? '' : ' '}
            </Fragment>
          );
        })}
      </span>
    );
  };

  const processLine = (line: string, lineNumber: number) => {
    return regexifyString({
      pattern: HIGHLIGHT_PATTERN,
      decorator: (match, index) => {
        return (
          <span data-testid="betweenBracketsContent" key={`line_${index}`}>
            {tokenizeContent(match, lineNumber.toString())}
          </span>
        );
      },
      input: line,
    });
  };

  return <span data-testid="activeTmpl">{processActiveTemplate(activeTemplate.data)}</span>;
};

export default memo(Template);
