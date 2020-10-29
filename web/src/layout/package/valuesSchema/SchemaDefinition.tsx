import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import classnames from 'classnames';
import { isArray, isEmpty, isUndefined } from 'lodash';
import React from 'react';
import { BsFillCaretDownFill, BsFillCaretRightFill } from 'react-icons/bs';
import { FaCheck } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';

import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import ExternalLink from '../../common/ExternalLink';
import styles from './SchemaDefinition.module.css';

interface Prop {
  def: JSONSchema;
  isRequired: boolean;
  defaultValue: JSX.Element | null;
  isExpanded: boolean;
  path: string;
  setActivePath: React.Dispatch<React.SetStateAction<string | undefined>>;
}

interface KeywordPropsByType {
  [key: string]: KeywordProp[];
}

interface KeywordProp {
  label: string;
  legend?: string;
  value: KeywordProp[] | string;
  ref?: string;
}

const SCHEMA_PROPS_PER_TYPE: KeywordPropsByType = {
  string: [
    {
      label: 'Format',
      value: 'format',
    },
    {
      label: 'Pattern',
      value: 'pattern',
    },

    {
      label: 'Length',
      value: [
        {
          label: 'Min length',
          value: 'minLength',
        },
        {
          label: 'Max length',
          value: 'minLength',
        },
      ],
    },
  ],
  integer: [
    {
      label: 'Range',
      value: [
        {
          label: 'Min',
          legend: 'x ≥',
          value: 'minimum',
        },
        {
          label: 'Exclusive min',
          legend: 'x >',
          value: 'exclusiveMinimum',
        },
        {
          label: 'Max',
          legend: 'x ≤',
          value: 'maximum',
        },
        {
          label: 'Exclusive Max',
          legend: 'x <',
          value: 'exclusiveMaximum',
        },
      ],
    },
  ],
  object: [
    {
      label: 'Properties',
      value: 'properties',
    },
  ],
  array: [
    {
      label: 'Items',
      value: 'items',
    },
    {
      label: 'Length',
      value: [
        {
          label: 'Min items',
          value: 'minItems',
        },
        {
          label: 'Max items',
          value: 'maxItems',
        },
      ],
    },
  ],
};

const SchemaDefinition = (props: Prop) => {
  if (isUndefined(props.def.type) || isArray(props.def.type)) return null;

  const typeDef = SCHEMA_PROPS_PER_TYPE[props.def.type];

  const formatPropValue = (value?: any): JSX.Element => {
    if (isUndefined(value)) {
      return <span className="ml-1">-</span>;
    }

    switch (typeof value) {
      case 'object':
        if (isArray(value)) {
          return (
            <div className="d-flex flex-column ml-3">
              {value.map((el: string) => (
                <div key={`it_${el}`} className={`${styles.listItem} position-relative`}>
                  {el}
                </div>
              ))}
            </div>
          );
        } else {
          return (
            <div className="ml-3">
              {Object.keys(value).map((el: string) => (
                <div key={`it_${el}`} className={`${styles.listItem} position-relative`}>
                  {el}: <span className="text-muted">{value[el].type || '-'}</span>
                </div>
              ))}
            </div>
          );
        }
      case 'boolean':
        return <span className="ml-1">{value.toString()}</span>;
      default:
        return <span className="ml-1">{value}</span>;
    }
  };

  const formatDefaultResume = () => {
    switch (typeof props.def.default) {
      case 'object':
        if (isEmpty(props.def.default)) {
          return <span className="ml-1">{props.defaultValue}</span>;
        } else {
          return (
            <>
              <FaCheck className="mr-1 text-success" />
              <small>(please expand for more details)</small>
            </>
          );
        }
      default:
        return <span className="ml-1">{props.defaultValue}</span>;
    }
  };

  const getItemsDef = (value?: any): JSX.Element => {
    if (isUndefined(value)) return <span className="ml-1">-</span>;
    const types = isArray(value) ? value.map((item: any) => item.type) : [value.type];
    return (
      <span className="ml-1">
        {`[${types.join(',')}] `}
        {props.def.uniqueItems && <span className="ml-1">(unique)</span>}
      </span>
    );
  };

  const getArrayDesc = (value?: any): JSX.Element => {
    if (isUndefined(value)) return <span className="ml-1">-</span>;
    const desc = isArray(value) ? value.map((item: any) => item.description) : [value.description];
    return <span>{desc.join('. ') || '-'}</span>;
  };

  const getTypeSpecificKeyword = (item: KeywordProp, className?: string): JSX.Element => {
    const value = (props.def as any)[item.value as string];
    return (
      <div
        className={classnames('d-flex align-items-baseline', className, {
          'flex-column': typeof value === 'object' && item.value !== 'items',
          'flex-row': typeof value !== 'object',
        })}
      >
        <div>
          <small className="text-muted text-uppercase">{item.label}</small>:
          {item.ref && (
            <ExternalLink href={item.ref} className="text-reset d-inline-block ml-2">
              <div className="d-flex flex-arow align-items-center">
                <small className="ml-1">
                  <FiExternalLink />
                </small>
              </div>
            </ExternalLink>
          )}{' '}
        </div>
        {(() => {
          switch (item.value) {
            case 'items':
              return <>{getItemsDef(value)}</>;
            default:
              return <>{formatPropValue(value)}</>;
          }
        })()}
      </div>
    );
  };

  return (
    <div className="position-relative w-100">
      <button
        className={`btn btn-block text-reset text-left p-0 position-relative ${styles.btn}`}
        onClick={() => props.setActivePath(!props.isExpanded ? props.path : undefined)}
      >
        <div className="d-flex flex-column">
          <div className="d-flex flex-row align-items-start">
            <div className={`pr-2 text-secondary ${styles.icon}`}>
              {props.isExpanded ? <BsFillCaretDownFill /> : <BsFillCaretRightFill />}
            </div>
            <div className={`d-flex flex-column flex-grow-1 ${styles.content}`}>
              {props.def.title && <div className="font-weight-bold text-truncate">{props.def.title}</div>}

              <div className="d-flex flex-row align-items-center w-100">
                <div className="text-nowrap">
                  <small className="text-muted text-uppercase">Type</small>:{' '}
                  <span className="ml-1 font-weight-bold">{props.def.type}</span>
                  {props.def.type === 'array' && props.def.items && <>{getItemsDef(props.def.items)}</>}
                </div>

                {!isUndefined(props.def.default) && (
                  <div className="ml-3 text-truncate">
                    <small className="text-muted text-uppercase">Default</small>:{' '}
                    <span className={`text-truncate ${styles.default}`}>{formatDefaultResume()}</span>
                  </div>
                )}

                <div className="ml-auto pl-2">
                  {props.isRequired && (
                    <span
                      className={`badge badge-sm badge-pill badge-success text-uppercase position-relative ${styles.badge}`}
                    >
                      Required
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>

      {props.isExpanded && (
        <div className={`${styles.moreInfo} border-top my-2 pt-2`}>
          <div className="d-flex flex-column">
            <div className="d-flex flex-row align-items-between">
              <div className="font-weight-bold mb-1">Annotations</div>
              <div className="ml-auto">
                <ButtonCopyToClipboard
                  text={props.path}
                  contentBtn="Copy path to clipboard"
                  className={`btn-link text-muted p-0 ${styles.btnClip}`}
                  visibleBtnText
                />
              </div>
            </div>
            <div>
              <small className="text-muted text-uppercase">Description</small>:{' '}
              <span className="ml-1">
                {props.def.description ? (
                  <span className={styles.wordBreak}>{props.def.description}</span>
                ) : (
                  <>
                    {props.def.type === 'array' && props.def.items ? (
                      <span className={styles.desc}>{getArrayDesc(props.def.items)}</span>
                    ) : (
                      <>-</>
                    )}
                  </>
                )}
              </span>
            </div>

            {!isUndefined(props.defaultValue) && typeof props.def.default === 'object' && !isEmpty(props.def.default) && (
              <div>
                <small className="text-muted text-uppercase">Default</small>: {props.defaultValue}
              </div>
            )}

            {!isUndefined(typeDef) && (
              <>
                <div className="font-weight-bold mt-2 mb-1">Constraints</div>
                {typeDef.map((keyword: KeywordProp) => (
                  <React.Fragment key={keyword.label}>
                    {isArray(keyword.value) ? (
                      <>
                        {/* <div>{keyword.label}: </div> */}
                        <div className="d-flex flex-row">
                          {keyword.value.map((subKeyword: KeywordProp) => (
                            <React.Fragment key={subKeyword.label}>
                              {getTypeSpecificKeyword(subKeyword, 'mr-3')}
                            </React.Fragment>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>{getTypeSpecificKeyword(keyword)}</>
                    )}
                  </React.Fragment>
                ))}
                <div>
                  <small className="text-muted text-uppercase">Enum</small>: {formatPropValue(props.def.enum)}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchemaDefinition;
