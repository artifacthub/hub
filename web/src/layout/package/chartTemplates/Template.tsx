import classnames from 'classnames';
import { get, isEmpty, isNull, isObject, isString } from 'lodash';
import { Dispatch, Fragment, memo, SetStateAction, useContext, useEffect, useState } from 'react';
import regexifyString from 'regexify-string';

import { AppCtx } from '../../../context/AppCtx';
import { ChartTemplate, ChartTemplateSpecialType } from '../../../types';
import processHelmTemplate from '../../../utils/processHelmTemplate';
import AutoresizeTextarea from '../../common/AutoresizeTextarea';
import ParamInfo from './ParamInfo';
import styles from './Template.module.css';

interface Props {
  template: ChartTemplate;
  setIsChangingTemplate: Dispatch<SetStateAction<boolean>>;
  values?: any;
}

const HIGHLIGHT_PATTERN = /{{(?!\/\*)(.*?)([^{]|{})*}}/;
const FUNCTIONS_DEFINITIONS = require('./functions.json');
const BUILTIN_DEFINITIONS = require('./builtIn.json');
const SPECIAL_CHARACTERS = /[^|({})-]+/;
const TOKENIZE_RE = /[^\s"']+|"([^"]*)"|'([^']*)/g;

const Template = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [activeTemplate, setActiveTemplate] = useState<ChartTemplate>(props.template);
  const { effective } = ctx.prefs.theme;

  useEffect(() => {
    props.setIsChangingTemplate(false);
  }, [activeTemplate]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (props.template !== activeTemplate) {
      setActiveTemplate(props.template);
    }
  }, [activeTemplate, props.template]);

  const processActiveTemplate = (tmpl: string): JSX.Element | null => {
    const rows = tmpl.split('\n');
    // Don't display last line if empty
    let cleanRows = [...rows];
    for (let i = rows.length - 1; i < rows.length; --i) {
      if (rows[i].trim() === '') {
        cleanRows.splice(i, 1);
      } else {
        break;
      }
    }

    const rowsContent = cleanRows.map((line: string, index: number) => {
      return (
        <div className="d-flex flex-row my-1" key={`active-tmpl-${index}`}>
          <div className={`text-right mr-3 ${styles.lineNumber}`}>{index + 1}</div>
          <div className="flex-grow-1">
            {line.startsWith('#') ? (
              <span className={`${styles.tmplComment} ${styles[`${effective}Theme`]}`}>{line}</span>
            ) : (
              <>{processLine(line)}</>
            )}
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
    const defaultValue = get(props.values, word.slice(1));
    const isDefaultObject = isObject(defaultValue);
    const formattedValue =
      isDefaultObject && !isEmpty(defaultValue) ? JSON.stringify(defaultValue, null, 2) : JSON.stringify(defaultValue);

    return (
      <ParamInfo
        element={<span className={`${styles.tmplValue} ${styles[`${effective}Theme`]}`}>{word}</span>}
        info={
          <div className="p-2 text-truncate">
            <span className="text-muted mr-2 normalOpacityFont">DEFAULT:</span>

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
    const definition = FUNCTIONS_DEFINITIONS.hasOwnProperty(word);
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
    const definition = BUILTIN_DEFINITIONS.hasOwnProperty(word);
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

  const tokenizeContent = (str: string, lineNumber: number): JSX.Element | null => {
    const parts = str.match(TOKENIZE_RE);
    if (isNull(parts)) return null;
    return (
      <span className={`badge font-weight-normal ${styles.badge}`}>
        {parts.map((word: string, idx: number) => {
          if (word === ')' || word === '|' || word.startsWith(`"`))
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

  const processLine = (line: string) => {
    return regexifyString({
      pattern: HIGHLIGHT_PATTERN,
      decorator: (match, index) => {
        return (
          <span data-testid="betweenBracketsContent" key={`line_${index}`}>
            {tokenizeContent(match, index)}
          </span>
        );
      },
      input: line,
    });
  };

  return <span data-testid="activeTmpl">{processActiveTemplate(activeTemplate.data)}</span>;
};

export default memo(Template);
