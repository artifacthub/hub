import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import classnames from 'classnames';
import { isArray, isEmpty, isEqual, isNull, isUndefined } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';

import { ActiveJSONSchemaValue } from '../../../types';
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
}

interface ValueProp {
  content: JSX.Element | null;
  className?: string;
}

interface PathProps {
  isArrayParent: boolean;
  name: string;
  activePath?: string;
  path?: string;
}

interface CurrentPath {
  path: string;
  isExpanded: boolean;
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
          content: <span>{valueToCheck.default === '' ? `""` : valueToCheck.default}</span>,
          className: 'text-warning',
        };
      }
    default:
      return {
        content: null,
      };
  }
};

const checkCurrentPath = (pathProps: PathProps) => {
  const currentPath = getJMESPathForValuesSchema(
    pathProps.isArrayParent ? `${pathProps.name}[0]` : pathProps.name,
    pathProps.path
  );
  const isExpanded = !isUndefined(pathProps.activePath) && pathProps.activePath === currentPath;

  return { isExpanded: isExpanded, path: currentPath };
};

const SchemaLine = (props: Props) => {
  const {
    saveSelectedOption,
    activePath,
    name,
    path,
    value,
    isRequired,
    onActivePathChange,
    level,
    hasDecorator,
    className,
    definitions,
  } = props;

  async function getCurrentJSON() {
    let currentValue = value;
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

    setCurrentValue({
      active: 0,
      combinationType: comb,
      options: options,
      error: error,
    });
  }

  const [currentValue, setCurrentValue] = useState<ActiveJSONSchemaValue | null>({
    active: 0,
    combinationType: null,
    options: [value],
    error: false,
  });
  const activeValue = currentValue ? currentValue.options[currentValue.active] : null;

  useEffect(() => {
    getCurrentJSON();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  const [valueStatus, setValueStatus] = useState<ValueProp>(getValue(activeValue));

  useEffect(() => {
    setValueStatus(getValue(activeValue));
  }, [activeValue]);

  let children = !isNull(activeValue) ? activeValue.properties : {};
  let isArrayParent = false;
  if (value.type === 'array' && value.items && (value.items as JSONSchema).hasOwnProperty('properties')) {
    isArrayParent = true;
    children = (value.items as JSONSchema).properties;
  }

  const [currentPath, setCurrentPath] = useState<CurrentPath | null>(
    checkCurrentPath({
      isArrayParent: isArrayParent,
      name: name,
      activePath: activePath,
      path: path,
    })
  );

  useEffect(() => {
    const newPath = checkCurrentPath({
      isArrayParent: isArrayParent,
      name: name,
      activePath: activePath,
      path: path,
    });
    if (isNull(currentPath) || !isEqual(newPath, currentPath)) {
      setCurrentPath(newPath);
    }
  }, [activePath]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const onChangeSelectedValue = useCallback(
    (newValue: ActiveJSONSchemaValue) => {
      setCurrentValue(newValue);
      if (!isNull(currentPath)) {
        saveSelectedOption(currentPath.path, newValue.active);
      }
    },
    [currentPath, saveSelectedOption]
  );

  if (isNull(currentValue) || isNull(activeValue)) return null;

  return (
    <React.Fragment>
      <div className={`row position-relative ${styles.wrapper}`} data-testid="schemaLine">
        <div
          data-testid="lineContent"
          className={`col-7 bg-dark text-light position-relative py-1 user-select-none ${styles.content} ${className}`}
          onClick={() => onActivePathChange(currentPath && !currentPath.isExpanded ? currentPath.path : undefined)}
        >
          <div className={`level${level} text-monospace`}>
            {activeValue.title && <div className="text-muted text-truncate"># {activeValue.title}</div>}
            <span className={classnames({ [`position-relative ${styles.hasDecorator}`]: hasDecorator })}>{name}: </span>
            <span data-testid="defaultValue" className={`${valueStatus.className} ${styles.line}`}>
              {valueStatus.content}
            </span>
          </div>
        </div>

        <div className={`col-5 position-relative py-1 ${styles.description}`}>
          {!isNull(currentPath) && (
            <SchemaDefinition
              def={currentValue}
              setValue={onChangeSelectedValue}
              isRequired={isRequired}
              defaultValue={valueStatus.content}
              isExpanded={currentPath.isExpanded}
              path={currentPath.path}
              onActivePathChange={onActivePathChange}
            />
          )}
        </div>
      </div>

      {children && currentPath && (
        <>
          {Object.keys(children).map((propName: string, index: number) => {
            const currentValue = children![propName] as JSONSchema;
            if (isUndefined(value)) return null;
            let isRequired = activeValue.required ? activeValue.required.includes(propName) : false;
            if (isArrayParent) {
              isRequired =
                (value.items as JSONSchema).hasOwnProperty('required') &&
                ((value.items! as JSONSchema).required as string[]).includes(propName);
            }
            return (
              <React.Fragment key={`${name}_${propName}`}>
                <SchemaLine
                  definitions={definitions}
                  value={currentValue}
                  name={propName}
                  level={isArrayParent ? level + 2 : level + 1}
                  isRequired={isRequired}
                  path={currentPath.path}
                  activePath={activePath}
                  onActivePathChange={onActivePathChange}
                  saveSelectedOption={saveSelectedOption}
                  hasDecorator={isArrayParent && index === 0}
                />
              </React.Fragment>
            );
          })}
        </>
      )}
    </React.Fragment>
  );
};

export default React.memo(SchemaLine);
