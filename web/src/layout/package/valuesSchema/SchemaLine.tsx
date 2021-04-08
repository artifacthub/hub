import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import classnames from 'classnames';
import { isArray, isEmpty, isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';

import { ActiveJSONSchemaValue } from '../../../types';
import formatStringForYAML from '../../../utils/formatStringForYAML';
import getJMESPathForValuesSchema from '../../../utils/getJMESPathForValuesSchema';
import SchemaDefinition from './SchemaDefinition';
import styles from './SchemaLine.module.css';

interface Props {
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
  onActivePathChange: (path?: string) => void;
  saveSelectedOption: (path: string, index: number) => void;
  hasDecorator?: boolean;
  isArrayParent?: boolean;
}

interface ValueProp {
  content: JSX.Element | null;
  className?: string;
}

const getValue = (newValue: any): ValueProp => {
  const valueToCheck = newValue;

  if (isUndefined(valueToCheck.default)) {
    return {
      content: null,
    };
  }

  if (isNull(valueToCheck.default)) {
    return {
      content: <span>null</span>,
      className: 'text-danger',
    };
  }

  switch (isArray(valueToCheck.type) ? valueToCheck.type[0] : valueToCheck.type) {
    case 'object':
      return {
        content: <span>{isEmpty(valueToCheck.default) ? '{}' : JSON.stringify(valueToCheck.default)}</span>,
        className: 'text-warning',
      };
    case 'array':
      return {
        content: (
          <>
            {isArray(valueToCheck.default) && (
              <>
                {valueToCheck.default.length === 0 ? (
                  <>{`[]`}</>
                ) : (
                  <>
                    {(valueToCheck.default as string[]).map((listItem: string) => (
                      <div className={`level1 ${styles.line} ${styles.listItem} position-relative`} key={listItem}>
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
        content: <span>{valueToCheck.default!.toString()}</span>,
        className: 'text-danger',
      };
    case 'null':
      return {
        content: <span>null</span>,
        className: 'text-danger',
      };
    case 'string':
      const isLongText = (valueToCheck.default as string).length > 40;
      if (isLongText) {
        return {
          content: (
            <>
              |-
              <br />
              <div className={`${styles.line} level1`}>{valueToCheck.default}</div>
            </>
          ),
          className: 'text-warning',
        };
      } else {
        return {
          content: <span>{valueToCheck.default === '' ? `""` : formatStringForYAML(valueToCheck.default)}</span>,
          className: 'text-warning',
        };
      }
    default:
      return {
        content: null,
      };
  }
};

const SchemaLine = (props: Props) => {
  const [value, setValue] = useState<ActiveJSONSchemaValue | null>({
    active: 0,
    combinationType: null,
    options: [props.value],
    error: false,
  });

  async function getCurrentJSON() {
    let currentValue = props.value;
    let error = false;

    let options = [currentValue];
    let comb: string | null = null;

    if (!isNull(currentValue)) {
      const checkCombinations = (valueToCheck: JSONSchema) => {
        if (valueToCheck.oneOf) {
          options = valueToCheck.oneOf as JSONSchema[];
          comb = 'oneOf';
        } else if (valueToCheck.anyOf) {
          options = valueToCheck.anyOf as JSONSchema[];
          comb = 'anyOf';
        }
      };

      if (currentValue.$ref) {
        error = true;
      } else {
        checkCombinations(currentValue);
      }
    }

    setValue({
      active: 0,
      combinationType: comb,
      options: options,
      error: error,
    });
  }

  const activeValue = value ? value.options[value.active] : null;
  useEffect(() => {
    getCurrentJSON();
  }, [props.value]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isNull(value) || isNull(activeValue)) return null;

  const { className, content } = getValue(activeValue);

  let children = activeValue.properties;
  let isArrayParent = false;
  if (
    props.value.type === 'array' &&
    props.value.items &&
    (props.value.items as JSONSchema).hasOwnProperty('properties')
  ) {
    isArrayParent = true;
    children = (props.value.items as JSONSchema).properties;
  }

  const currentPath = getJMESPathForValuesSchema(isArrayParent ? `${props.name}[0]` : props.name, props.path);
  const isExpanded = !isUndefined(props.activePath) && props.activePath === currentPath;

  const onChangeSelectedValue = (newValue: ActiveJSONSchemaValue) => {
    setValue(newValue);
    props.saveSelectedOption(currentPath, newValue.active);
  };

  return (
    <React.Fragment>
      <div className={`row position-relative ${styles.wrapper}`} data-testid="schemaLine">
        <div
          data-testid="lineContent"
          className={`col-7 bg-dark text-light position-relative py-1 user-select-none ${styles.content} ${props.className}`}
          onClick={() => props.onActivePathChange(!isExpanded ? currentPath : undefined)}
        >
          <div className={`level${props.level} text-monospace`}>
            {activeValue.title && <div className="text-muted text-truncate"># {activeValue.title}</div>}
            <span className={classnames({ [`position-relative ${styles.hasDecorator}`]: props.hasDecorator })}>
              {props.name}:{' '}
            </span>
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
            onActivePathChange={props.onActivePathChange}
          />
        </div>
      </div>

      {children && (
        <>
          {Object.keys(children).map((propName: string, index: number) => {
            const currentValue = children![propName] as JSONSchema;
            if (isUndefined(value)) return null;
            let isRequired = activeValue.required ? activeValue.required.includes(propName) : false;
            if (isArrayParent) {
              isRequired =
                (props.value.items as JSONSchema).hasOwnProperty('required') &&
                ((props.value.items! as JSONSchema).required as string[]).includes(propName);
            }
            return (
              <React.Fragment key={`${props.name}_${propName}`}>
                <SchemaLine
                  definitions={props.definitions}
                  value={currentValue}
                  name={propName}
                  level={isArrayParent ? props.level + 2 : props.level + 1}
                  isRequired={isRequired}
                  path={currentPath}
                  activePath={props.activePath}
                  onActivePathChange={props.onActivePathChange}
                  saveSelectedOption={props.saveSelectedOption}
                  hasDecorator={isArrayParent && index === 0}
                  isArrayParent={isArrayParent}
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
