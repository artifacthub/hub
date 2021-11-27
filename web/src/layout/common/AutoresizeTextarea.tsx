import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';

import styles from './AutoresizeTextarea.module.css';

interface Props {
  value?: string;
  name: string;
  disabled?: boolean;
  required?: boolean;
  invalidText?: string;
  minRows?: number;
  maxRows?: number;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

const DEFAULT_MIN_ROWS = 3;

const AutoresizeTextarea = (props: Props) => {
  const [rows, setRows] = useState<number>(6);
  const [textValue, setTextValue] = useState<string>(props.value || '');

  const calculateHeight = useCallback(
    (value?: string) => {
      const txtValue = value || props.value || '';
      const textLength = txtValue.split('\n').length;
      const minRows = props.minRows || DEFAULT_MIN_ROWS;
      const newRowsNumber = textLength < minRows ? minRows : textLength;
      setRows(props.maxRows ? (newRowsNumber > props.maxRows ? props.maxRows : newRowsNumber) : newRowsNumber);
    },
    [props.maxRows, props.minRows, props.value]
  );

  useEffect(() => {
    setTextValue(props.value || '');
    calculateHeight();
  }, [calculateHeight, props.value]);

  return (
    <>
      <textarea
        className={`form-control ${styles.textarea}`}
        rows={rows}
        id={props.name}
        name={props.name}
        value={textValue}
        disabled={props.disabled}
        required={props.required}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
          calculateHeight(e.target.value);
          setTextValue(e.target.value);
          if (!isUndefined(props.onChange)) {
            props.onChange(e);
          }
        }}
        wrap="off"
        spellCheck="false"
      />
      {!isUndefined(props.invalidText) && <div className="invalid-feedback mt-0">{props.invalidText}</div>}
    </>
  );
};

export default AutoresizeTextarea;
