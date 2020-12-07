import React, { useRef } from 'react';

import useOutsideClick from '../../../hooks/useOutsideClick';
import { Option, RefInputTypeaheadField } from '../../../types';
import InputTypeahead from '../../common/InputTypeahead';
import styles from './SchemaValuesSearch.module.css';

interface Props {
  paths: string[];
  activePath?: string;
  onSearch: (selectedPath?: string) => void;
}

const SchemaValuesSearch = (props: Props) => {
  const inputWrapper = useRef<HTMLDivElement | null>(null);
  const input = useRef<RefInputTypeaheadField>(null);
  const isEmptyInput: boolean = input && input.current ? input.current!.getValue() === '' : false;

  useOutsideClick([inputWrapper], !isEmptyInput, () => input.current!.reset());

  const opts: Option[] = props.paths.map((path: string) => ({ id: path, name: path, filterKey: 'path' }));

  return (
    <div className="d-flex flex-row">
      <div className={`position-relative ${styles.wrapper}`} ref={inputWrapper}>
        <InputTypeahead
          ref={input}
          label="path"
          listClassName={`position-absolute w-100 ${styles.list}`}
          optClassName={styles.option}
          options={opts}
          selected={{ path: [] }}
          onChange={(name: string, value: string) => {
            input.current!.reset();

            if (props.activePath && value === props.activePath) {
              props.onSearch(undefined);
              setTimeout(() => {
                props.onSearch(value);
              }, 10);
            } else {
              props.onSearch(value);
            }
          }}
          visibleClear={false}
          displayItemsInValueLength={1}
          searchIcon
        />
      </div>
    </div>
  );
};

export default SchemaValuesSearch;
