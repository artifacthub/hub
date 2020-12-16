import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { isArray, isEmpty, isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';

import { ActiveJSONSchemaValue } from '../../../types';
import getJMESPathForValuesSchema from '../../../utils/getJMESPathForValuesSchema';
import SchemaDefinition from './SchemaDefinition';
import styles from './SchemaLine.module.css';

interface Prop {
  definitions?: {
    [k: string]: any;
  };
  name: string;
  value: JSONSchema;
  level: number;
  isRequired: boolean;
  className?: string;
  path?: string;
  activePath?: string;
  setActivePath: React.Dispatch<React.SetStateAction<string | undefined>>;
  saveSelectedOption: (path: string, index: number) => void;
}

interface ValueProp {
  content: JSX.Element | null;
  className?: string;
}

const SchemaLine = (props: Prop) => {
  async function getCurrentJSON() {
    let currentValue = props.value;
    let error = false;

    let options = [currentValue];
    let comb = null;

    const checkCombinations = (valueToCheck: JSONSchema) => {
      if (valueToCheck.oneOf) {
        options = valueToCheck.oneOf as JSONSchema[];
        comb = 'anyOf';
      } else if (valueToCheck.anyOf) {
        options = valueToCheck.anyOf as JSONSchema[];
        comb = 'oneOf';
      }
    };

    if (currentValue.$ref) {
      error = true;
    } else {
      checkCombinations(currentValue);
    }

    setValue({
      active: 0,
      combinationType: comb,
      options: options,
      error: error,
    });
  }

  const [value, setValue] = useState<ActiveJSONSchemaValue | null>(null);
  const activeValue = value ? value.options[value.active] : null;

  useEffect(() => {
    getCurrentJSON();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isNull(value) || isNull(activeValue)) return null;

  const getValue = (): ValueProp => {
    if (isUndefined(activeValue.default)) {
      return {
        content: null,
      };
    }

    if (isNull(activeValue.default)) {
      return {
        content: <span>null</span>,
        className: 'text-danger',
      };
    }

    switch (isArray(activeValue.type) ? activeValue.type[0] : activeValue.type) {
      case 'object':
        return {
          content: <span>{isEmpty(activeValue.default) ? '{}' : JSON.stringify(activeValue.default)}</span>,
          className: 'text-warning',
        };
      case 'array':
        return {
          content: (
            <>
              {isArray(activeValue.default) && (
                <>
                  {activeValue.default.length === 0 ? (
                    <>{`[]`}</>
                  ) : (
                    <>
                      {(activeValue.default as string[]).map((listItem: string) => (
                        <div
                          className={`${styles.level1} ${styles.line} ${styles.listItem} position-relative`}
                          key={listItem}
                        >
                          {listItem}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          ),
          className: 'text-warning',
        };
      case 'boolean':
      case 'integer':
        return {
          content: <span>{activeValue.default!.toString()}</span>,
          className: 'text-danger',
        };
      case 'null':
        return {
          content: <span>null</span>,
          className: 'text-danger',
        };
      case 'string':
        const isLongText = (activeValue.default as string).length > 40;
        if (isLongText) {
          return {
            content: (
              <>
                |-
                <br />
                <div className={`${styles.line} ${styles.level1}`}>{activeValue.default}</div>
              </>
            ),
            className: 'text-warning',
          };
        } else {
          return {
            content: <span>{activeValue.default === '' ? `""` : activeValue.default}</span>,
            className: 'text-warning',
          };
        }
      default:
        return {
          content: null,
        };
    }
  };

  const { className, content } = getValue();
  const currentPath = getJMESPathForValuesSchema(props.name, props.path);
  const isExpanded = !isUndefined(props.activePath) && props.activePath === currentPath;

  const onChangeSelectedValue = (newValue: ActiveJSONSchemaValue) => {
    setValue(newValue);
    props.saveSelectedOption(currentPath, newValue.active);
  };

  return (
    <React.Fragment>
      <div className={`row position-relative ${styles.wrapper}`} data-testid="schemaLine">
        <div
          className={`col-7 bg-dark text-light position-relative py-1 user-select-none ${styles.content} ${props.className}`}
          onClick={() => props.setActivePath(!isExpanded ? currentPath : undefined)}
        >
          <div className={`${styles[`level${props.level}`]} text-monospace`}>
            {activeValue.title && <div className="text-muted text-truncate"># {activeValue.title}</div>}
            {props.name}:{' '}
            <span data-testid="defaultValue" className={`${className} ${styles.line}`}>
              {content}
            </span>
          </div>
        </div>

        <div className={`col-5 position-relative py-1 ${styles.description}`}>
          <SchemaDefinition
            def={value}
            setValue={onChangeSelectedValue}
            isRequired={props.isRequired}
            defaultValue={content}
            isExpanded={isExpanded}
            path={currentPath}
            setActivePath={props.setActivePath}
          />
        </div>
      </div>

      {activeValue.properties && (
        <>
          {Object.keys(activeValue.properties).map((propName: string) => {
            const currentValue = activeValue.properties![propName] as JSONSchema;
            if (isUndefined(value)) return null;
            const isRequired = activeValue.required ? activeValue.required.includes(propName) : false;
            return (
              <React.Fragment key={`${props.name}_${propName}`}>
                <SchemaLine
                  definitions={props.definitions}
                  value={currentValue}
                  name={propName}
                  level={props.level + 1}
                  isRequired={isRequired}
                  path={currentPath}
                  activePath={props.activePath}
                  setActivePath={props.setActivePath}
                  saveSelectedOption={props.saveSelectedOption}
                />
              </React.Fragment>
            );
          })}
        </>
      )}
    </React.Fragment>
  );
};

export default SchemaLine;
