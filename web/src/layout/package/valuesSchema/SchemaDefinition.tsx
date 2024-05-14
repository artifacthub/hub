import classnames from 'classnames';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, Fragment, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react';
import { BsFillCaretDownFill, BsFillCaretRightFill } from 'react-icons/bs';
import { FaCheck } from 'react-icons/fa';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { JSONSchema } from '../../../jsonschema';
import { ActiveJSONSchemaValue } from '../../../types';
import checkIfPropIsRequiredInSchema from '../../../utils/checkIfPropIsRequiredInSchema';
import detectLinksInText from '../../../utils/detectLinksInText';
import ButtonCopyToClipboard from '../../common/ButtonCopyToClipboard';
import styles from './SchemaDefinition.module.css';

interface Props {
  def: ActiveJSONSchemaValue;
  setValue: (newValue: ActiveJSONSchemaValue) => void;
  isRequired: boolean;
  defaultValue: JSX.Element | null;
  isExpanded: boolean;
  path: string;
  onActivePathChange: (path?: string) => void;
}

interface KeywordPropsByType {
  [key: string]: KeywordProp[];
}

interface KeywordProp {
  label: string;
  legend?: string;
  value: KeywordProp[] | string;
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
          value: 'maxLength',
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
          label: 'Exclusive max',
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

const SchemaDefinition = (props: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const def = props.def.options[props.def.active];

  const getInitialType = (): string | undefined => {
    let currentType: string | undefined;
    if (def.type) {
      if (isArray(def.type)) {
        currentType = def.type[0] as string;
      } else {
        currentType = def.type;
      }
    } else {
      if (def.properties) {
        currentType = 'object';
      }
    }
    return currentType;
  };

  const [activeType, setActiveType] = useState<string | undefined>(getInitialType());

  useEffect(() => {
    // Scrolls content into view when a definition is expanded
    if (props.isExpanded && ref && ref.current) {
      ref.current!.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
    }
  }, [props.isExpanded, ref]);

  useEffect(() => {
    setActiveType(getInitialType());
  }, [props.def.active, props.def.combinationType]);

  const typeDef = activeType ? SCHEMA_PROPS_PER_TYPE[activeType] : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatPropValue = (value?: any, required?: string[]): JSX.Element => {
    if (isUndefined(value) || isNull(value)) {
      return <span className="ms-1">-</span>;
    }

    switch (typeof value) {
      case 'object':
        if (isArray(value)) {
          return (
            <div className="d-flex flex-column ms-3" role="list">
              {value.map((el: string) => (
                <div key={`it_${el}`} className={`${styles.listItem} position-relative`} role="listitem">
                  {el}
                </div>
              ))}
            </div>
          );
        } else {
          return (
            <div className="ms-3" role="list">
              {Object.keys(value).map((el: string) => (
                <div key={`it_${el}`} className={`${styles.listItem} position-relative`} role="listitem">
                  {el}:{' '}
                  <span className="text-muted">
                    {value[el] && value[el].type
                      ? isArray(value[el].type)
                        ? value[el].type.join(' | ')
                        : value[el].type
                      : '-'}
                  </span>{' '}
                  {(checkIfPropIsRequiredInSchema(el, def.required) || checkIfPropIsRequiredInSchema(el, required)) && (
                    <span className={`text-success text-uppercase position-relative ms-2 fw-bold ${styles.xsBadge}`}>
                      Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        }
      case 'boolean':
        return <span className="ms-1">{value.toString()}</span>;
      default:
        return <span className="ms-1">{value}</span>;
    }
  };

  const formatDefaultResume = () => {
    if (isNull(def.default)) return 'null';
    switch (typeof def.default) {
      case 'object':
        if (isEmpty(def.default)) {
          return <span className="ms-1">{props.defaultValue}</span>;
        } else {
          return (
            <>
              <FaCheck className="me-1 text-success" />
              <small>(please expand for more details)</small>
            </>
          );
        }
      default:
        return <span className="ms-1">{props.defaultValue}</span>;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getItemsDef = (value?: any): JSX.Element => {
    if (isUndefined(value) || isNull(value)) return <span className="ms-1">-</span>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const types = isArray(value) ? value.map((item: any) => item.type) : [value.type];
    return (
      <>
        <span className="ms-1">
          {`[${types.join(',')}] `}
          {def.uniqueItems && <span className="ms-1">(unique)</span>}
        </span>
      </>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getArrayDesc = (value?: any): JSX.Element => {
    if (isUndefined(value)) return <span className="ms-1">-</span>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const desc = isArray(value) ? value.map((item: any) => item.description) : [value.description];
    return <span>{detectLinksInText(desc.join('. '), 'text-break') || '-'}</span>;
  };

  const getTypeSpecificKeyword = (item: KeywordProp, className?: string): JSX.Element | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (def as any)[item.value as string];
    return (
      <div
        className={classnames('d-flex align-items-baseline', className, {
          'flex-column': typeof value === 'object' && item.value !== 'items',
          'flex-row': typeof value !== 'object',
          'flex-wrap':
            item.value === 'items' && !isUndefined(value) && !isNull(value) && !isUndefined(value.properties),
        })}
      >
        <div>
          <small className="text-muted text-uppercase">{item.label}</small>:
        </div>
        {(() => {
          switch (item.value) {
            case 'items':
              return (
                <>
                  {getItemsDef(value)}
                  {!isUndefined(value) &&
                    !isNull(value) &&
                    value.type === 'object' &&
                    !isUndefined(value.properties) && (
                      <div className="w-100">
                        <div>
                          <small className="text-muted text-uppercase">Properties</small>:
                        </div>
                        {formatPropValue(value.properties, value.required)}
                      </div>
                    )}
                </>
              );
            default:
              return <>{formatPropValue(value)}</>;
          }
        })()}
      </div>
    );
  };

  const changeActivePath = () => {
    props.onActivePathChange(!props.isExpanded ? props.path : undefined);
  };

  return (
    <div className="position-relative w-100" ref={ref}>
      <div className={styles.contentWrapper}>
        <button
          className={`btn text-reset text-start p-0 position-relative w-100 ${styles.btn}`}
          onClick={changeActivePath}
          aria-label={`${props.isExpanded ? 'Hide' : 'Show'} detail`}
        >
          <div className="d-flex flex-column">
            <div className="d-flex flex-row align-items-start">
              <div className={`pe-2 text-secondary ${styles.icon}`}>
                {props.isExpanded ? <BsFillCaretDownFill /> : <BsFillCaretRightFill />}
              </div>
              <div className={`d-flex flex-column flex-grow-1 ${styles.content}`}>
                {props.def.error || isUndefined(activeType) ? (
                  <small className={`text-muted text-uppercase ${styles.errorMsg}`}>Raw</small>
                ) : (
                  <>
                    {def.title && (
                      <div
                        className={classnames('fw-bold text-truncate', {
                          [styles.titleWithRequiredLabel]: props.isRequired,
                        })}
                      >
                        {def.title}
                      </div>
                    )}

                    {!isNull(props.def.combinationType) && (
                      <>
                        <select
                          className={classnames(
                            'w-50 form-select',
                            styles.select,
                            { 'my-2': def.title },
                            { 'mb-2': isUndefined(def.title) }
                          )}
                          value={props.def.active}
                          onClick={(e: ReactMouseEvent<HTMLSelectElement, MouseEvent>) => e.stopPropagation()}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                            props.setValue({
                              ...props.def,
                              active: parseInt(e.target.value),
                            });
                            if (!props.isExpanded) {
                              changeActivePath();
                            }
                          }}
                        >
                          {props.def.options.map((sch: JSONSchema, index: number) => (
                            <option value={index} key={`opt_${index}`}>
                              Option {index + 1}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    <div className="d-flex flex-row align-items-start w-100">
                      <div className="text-nowrap">
                        <small className="text-muted text-uppercase">Type</small>:{' '}
                        {def.type && isArray(def.type) ? (
                          <select
                            aria-label="Type selection"
                            className={`ms-1 d-inline form-select position-relative ${styles.select} ${styles.selectInLine} ${styles.selectType}`}
                            value={activeType}
                            onClick={(e: ReactMouseEvent<HTMLSelectElement, MouseEvent>) => e.stopPropagation()}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                              setActiveType(e.target.value as string);
                              if (!props.isExpanded) {
                                changeActivePath();
                              }
                            }}
                          >
                            {(def.type as string[]).map((type: string, index: number) => (
                              <option value={type} key={`opt_${index}`}>
                                {type}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="ms-1 fw-bold">{activeType}</span>
                        )}
                        {activeType === 'array' && def.items && <>{getItemsDef(def.items)}</>}
                      </div>

                      {!isUndefined(def.default) && (
                        <div className="ms-3 text-truncate">
                          <small className="text-muted text-uppercase">Default</small>:{' '}
                          <span className={`text-truncate ${styles.default}`}>{formatDefaultResume()}</span>
                        </div>
                      )}

                      <div className="ms-auto ps-2">
                        {props.isRequired && (
                          <span
                            className={`badge badge-sm bg-success text-uppercase position-relative ${styles.badge}`}
                          >
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </button>

        {props.isExpanded && (
          <div className={`${styles.moreInfo} border-top border-1 my-2 pt-2`}>
            <div className="d-flex flex-column">
              {isNull(typeDef) ? (
                <div className="mt-2">
                  <SyntaxHighlighter language="json" style={tomorrowNight}>
                    {JSON.stringify(def, null, 2)}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <>
                  <div className="d-flex flex-row align-items-between">
                    <div className="fw-bold mb-1">Annotations</div>
                    <div className="ms-auto">
                      <ButtonCopyToClipboard
                        text={props.path}
                        contentBtn="Copy path to clipboard"
                        className={`btn-link text-muted p-0 ${styles.btnClip}`}
                        visibleBtnText
                        label="Copy path to clipboard"
                      />
                    </div>
                  </div>

                  <div>
                    <small className="text-muted text-uppercase">Description</small>:{' '}
                    <span className="ms-1">
                      {def.description ? (
                        <span className="text-break">{detectLinksInText(def.description, styles.descriptionLink)}</span>
                      ) : (
                        <>
                          {def.type === 'array' && def.items ? (
                            <span className={styles.desc}>{getArrayDesc(def.items)}</span>
                          ) : (
                            <>-</>
                          )}
                        </>
                      )}
                    </span>
                  </div>

                  {!isUndefined(props.defaultValue) && typeof def.default === 'object' && !isEmpty(def.default) && (
                    <div>
                      <small className="text-muted text-uppercase">Default</small>: {props.defaultValue}
                    </div>
                  )}

                  {!isUndefined(typeDef) && (
                    <>
                      <div className="fw-bold mt-2 mb-1">Constraints</div>
                      {typeDef.map((keyword: KeywordProp) => (
                        <Fragment key={keyword.label}>
                          {isArray(keyword.value) ? (
                            <>
                              <div className="d-flex flex-row">
                                {keyword.value.map((subKeyword: KeywordProp) => (
                                  <Fragment key={subKeyword.label}>
                                    {getTypeSpecificKeyword(subKeyword, 'me-3')}
                                  </Fragment>
                                ))}
                              </div>
                            </>
                          ) : (
                            <>{getTypeSpecificKeyword(keyword)}</>
                          )}
                        </Fragment>
                      ))}
                      <div>
                        <small className="text-muted text-uppercase">Enum</small>: {formatPropValue(def.enum)}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemaDefinition;
