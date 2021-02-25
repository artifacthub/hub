import { get, isEmpty, isObject, isString } from 'lodash';
import React, { useEffect, useState } from 'react';
import regexifyString from 'regexify-string';

import { ChartTemplate, ChartTemplateSpecialType } from '../../../types';
import processHelmTemplate from '../../../utils/processHelmTemplate';
import AutoresizeTextarea from '../../common/AutoresizeTextarea';
import ParamInfo from './ParamInfo';
import styles from './Template.module.css';

interface Props {
  template: ChartTemplate;
  setIsChangingTemplate: React.Dispatch<React.SetStateAction<boolean>>;
  values?: any;
}

const HIGHLIGHT_PATTERN = /\{\{(?!\{)((?:(?!\{\{).)*?)\}\}/gi;
const FUNCTIONS_DEFINITIONS = require('./functions.json');
const BUILTIN_DEFINITIONS = require('./builtIn.json');
const SPECIAL_CHARACTERS = /^[^)}]+/;

const Template = (props: Props) => {
  const [activeTemplate, setActiveTemplate] = useState<ChartTemplate>(props.template);

  useEffect(() => {
    props.setIsChangingTemplate(false);
  }, [activeTemplate, props]);

  useEffect(() => {
    if (props.template !== activeTemplate) {
      setActiveTemplate(props.template);
    }
  }, [activeTemplate, props.template]);

  const processActiveTemplate = (tmpl: string): JSX.Element | null => {
    const rows = tmpl.split('\n');
    const rowsContent = rows.map((line: string, index: number) => {
      // Don't display last line if empty
      if (index === rows.length - 1 && line === '') return null;
      return (
        <div className="d-flex flex-row my-1" key={`active-tmpl-${index}`}>
          <div className={`text-right mr-3 ${styles.lineNumber}`}>{index + 1}</div>
          <div className="flex-grow-1">
            {line.startsWith('#') ? <span className={styles.tmplComment}>{line}</span> : <>{processLine(line)}</>}
          </div>
          <div className="pl-2" />
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
    return regexifyString({
      pattern: SPECIAL_CHARACTERS,
      decorator: (match, index) => {
        const defaultValue = get(props.values, match.slice(1));
        const isDefaultObject = isObject(defaultValue);
        return (
          <React.Fragment key={`value_${word}_${index}`}>
            <ParamInfo
              element={<span className={styles.tmplValue}>{match}</span>}
              info={
                <div className="p-2 text-truncate">
                  <span className="text-muted mr-2">DEFAULT:</span>

                  {isDefaultObject ? (
                    <>
                      {isEmpty(defaultValue) ? (
                        <span className="text-nowrap">{JSON.stringify(defaultValue)}</span>
                      ) : (
                        <div className={`mt-2 ${styles.textarea}`}>
                          <AutoresizeTextarea
                            name="template"
                            value={JSON.stringify(defaultValue, null, 2)}
                            minRows={1}
                            maxRows={20}
                            disabled
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <span>{isString(defaultValue) ? defaultValue || `""` : JSON.stringify(defaultValue)}</span>
                  )}
                </div>
              }
              fixedWidth={isDefaultObject && !isEmpty(defaultValue)}
            />
          </React.Fragment>
        );
      },
      input: word,
    });
  };

  const renderTemplateFunction = (word: string) => {
    return regexifyString({
      pattern: SPECIAL_CHARACTERS,
      decorator: (match, index) => {
        const definition = FUNCTIONS_DEFINITIONS.hasOwnProperty(match);
        if (definition) {
          return (
            <React.Fragment key={`func_${word}_${index}`}>
              <ParamInfo
                element={<span className={styles.tmplFunction}>{match}</span>}
                info={FUNCTIONS_DEFINITIONS[word]}
                isMarkdown
                fixedWidth
              />
            </React.Fragment>
          );
        } else {
          return (
            <span key={`func_${word}_${index}`} className={styles.tmplFunction}>
              {match}
            </span>
          );
        }
      },
      input: word,
    });
  };

  const renderTemplateBuiltIn = (word: string) => {
    return regexifyString({
      pattern: SPECIAL_CHARACTERS,
      decorator: (match, index) => {
        const definition = BUILTIN_DEFINITIONS.hasOwnProperty(match);
        if (definition) {
          return (
            <React.Fragment key={`builtIn_${word}_${index}`}>
              <ParamInfo
                element={<span className={styles.tmplFunction}>{match}</span>}
                info={BUILTIN_DEFINITIONS[match]}
                isMarkdown
                fixedWidth
              />
            </React.Fragment>
          );
        } else {
          return (
            <span key={`builtIn_${word}_${index}`} className={styles.tmplBuiltIn}>
              {match}
            </span>
          );
        }
      },
      input: word,
    });
  };

  const processHelmTemplateContent = (str: string): JSX.Element => {
    const parts = str.split(' ');
    return (
      <span className={`badge font-weight-normal ${styles.badge}`}>
        {parts.map((word: string, index: number) => {
          return (
            <React.Fragment key={`helmTmpl_${index}`}>
              {(() => {
                switch (processHelmTemplate(word)) {
                  case ChartTemplateSpecialType.BuiltInObject:
                    return <>{renderTemplateBuiltIn(word)}</>;
                  case ChartTemplateSpecialType.ValuesBuiltInObject:
                    return <>{renderValue(word)}</>;
                  case ChartTemplateSpecialType.Function:
                    return <>{renderTemplateFunction(word)}</>;
                  case ChartTemplateSpecialType.FlowControl:
                    return <span className={styles.tmplFlowControl}>{word}</span>;
                  case ChartTemplateSpecialType.Variable:
                    return regexifyString({
                      pattern: SPECIAL_CHARACTERS,
                      decorator: (match, index) => {
                        return (
                          <span key={`var_${word}_${index}`} className={styles.tmplVariable}>
                            {match}
                          </span>
                        );
                      },
                      input: word,
                    });
                  default:
                    return <>{word}</>;
                }
              })()}
              {index === parts.length - 1 ? '' : ' '}
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  const processLine = (line: string) => {
    return regexifyString({
      pattern: HIGHLIGHT_PATTERN,
      decorator: (match, index) => {
        return <React.Fragment key={`line_${index}`}>{processHelmTemplateContent(match)}</React.Fragment>;
      },
      input: line,
    });
  };

  return <>{processActiveTemplate(activeTemplate.data)}</>;
};

export default React.memo(Template);
