import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { isArray, isEmpty, isUndefined } from 'lodash';
import React from 'react';

import SchemaDefinition from './SchemaDefinition';
import styles from './SchemaLine.module.css';

interface Prop {
  name: string;
  value: JSONSchema;
  level: number;
  isRequired: boolean;
  className?: string;
  path?: string;
  activePath?: string;
  setActivePath: React.Dispatch<React.SetStateAction<string | undefined>>;
}

interface ValueProp {
  content: JSX.Element | null;
  className?: string;
}

const SchemaLine = (props: Prop) => {
  const getValue = (): ValueProp => {
    if (isUndefined(props.value.default)) {
      return {
        content: null,
      };
    }
    switch (props.value.type) {
      case 'object':
        return {
          content: <span>{isEmpty(props.value.default) ? '{}' : JSON.stringify(props.value.default)}</span>,
          className: 'text-warning',
        };
      case 'array':
        return {
          content: (
            <>
              {isArray(props.value.default) && (
                <>
                  {props.value.default.length === 0 ? (
                    <>{`[]`}</>
                  ) : (
                    <>
                      {(props.value.default as string[]).map((listItem: string) => (
                        <div className={`${styles.level1} ${styles.line}`} key={listItem}>
                          - {listItem}
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
      case 'bigint':
      case 'integer':
        return {
          content: <span>{props.value.default!.toString()}</span>,
          className: 'text-danger',
        };
      case 'string':
        const isLongText = (props.value.default as string).length > 40;
        if (isLongText) {
          return {
            content: (
              <>
                |-
                <br />
                <div className={`${styles.line} ${styles.level1}`}>{props.value.default}</div>
              </>
            ),
            className: 'text-warning',
          };
        } else {
          return {
            content: <span>{props.value.default === '' ? `""` : props.value.default}</span>,
            className: 'text-warning',
          };
        }
      default:
        return {
          content: null,
        };
    }
  };

  const compoundCurrentPath = (): string => {
    let name = props.name.includes('.') ? `"${props.name}"` : props.name;
    return isUndefined(props.path) ? name : `${props.path}.${name}`;
  };

  const { className, content } = getValue();
  const currentPath = compoundCurrentPath();
  const isExpanded = !isUndefined(props.activePath) && props.activePath === currentPath;

  return (
    <React.Fragment>
      <div className={`row position-relative ${styles.wrapper}`}>
        <div
          className={`col-7 bg-dark text-light position-relative py-1 user-select-none ${styles.content} ${props.className}`}
          onClick={() => props.setActivePath(!isExpanded ? currentPath : undefined)}
        >
          <div className={`${styles[`level${props.level}`]} text-monospace`}>
            {props.value.title && <div className="text-muted text-truncate"># {props.value.title}</div>}
            {props.name}: <span className={`${className} ${styles.line}`}>{content}</span>
          </div>
        </div>

        <div className={`col-5 position-relative py-1 ${styles.description}`}>
          <SchemaDefinition
            def={props.value}
            isRequired={props.isRequired}
            defaultValue={content}
            isExpanded={isExpanded}
            path={currentPath}
            setActivePath={props.setActivePath}
          />
        </div>
      </div>

      {props.value.properties && (
        <>
          {Object.keys(props.value.properties).map((propName: string, index: number) => {
            const value = props.value.properties![propName] as JSONSchema;
            if (isUndefined(value)) return null;
            const isRequired = props.value.required ? props.value.required.includes(propName) : false;
            return (
              <React.Fragment key={`${props.name}_${propName}`}>
                <SchemaLine
                  value={value}
                  name={propName}
                  level={props.level + 1}
                  isRequired={isRequired}
                  path={currentPath}
                  activePath={props.activePath}
                  setActivePath={props.setActivePath}
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
