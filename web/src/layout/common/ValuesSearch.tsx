import isUndefined from 'lodash/isUndefined';
import { useEffect, useRef, useState } from 'react';

import useOutsideClick from '../../hooks/useOutsideClick';
import { Option, RefInputTypeaheadField } from '../../types';
import InputTypeahead from './InputTypeahead';
import styles from './ValuesSearch.module.css';

interface Props {
  paths?: string[];
  pathsObj?: { [key: number]: string };
  activePath?: string | null;
  wrapperClassName?: string;
  onSearch: (selectedPath?: string) => void;
}

const ValuesSearch = (props: Props) => {
  const prepareOptions = (): undefined | Option[] => {
    if (!isUndefined(props.pathsObj)) {
      return Object.keys(props.pathsObj).map((line: string) => {
        return {
          id: line,
          name: props.pathsObj![parseInt(line)],
          filterKey: 'path',
        };
      });
    } else if (!isUndefined(props.paths)) {
      return props.paths.map((path: string) => ({ id: path, name: path, filterKey: 'path' }));
    }

    return;
  };

  const inputWrapper = useRef<HTMLDivElement | null>(null);
  const input = useRef<RefInputTypeaheadField>(null);
  const isEmptyInput: boolean = input && input.current ? input.current!.getValue() === '' : false;
  const [opts, setOpts] = useState<Option[] | undefined>(prepareOptions());

  useOutsideClick([inputWrapper], !isEmptyInput, () => input.current!.reset());

  useEffect(() => {
    if (isUndefined(opts) && !isUndefined(props.paths)) {
      setOpts(props.paths.map((path: string) => ({ id: path, name: path, filterKey: 'path' })));
    }
  }, [props.paths]);

  if (isUndefined(opts)) return null;

  return (
    <div className="d-flex flex-row">
      <div className={`position-relative ${styles.wrapper} ${props.wrapperClassName}`} ref={inputWrapper}>
        <InputTypeahead
          ref={input}
          label="path"
          listClassName={`position-absolute w-100 border border-1 border-top-0 bg-white end-0 ${styles.list}`}
          optClassName="px-3 py-2"
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

export default ValuesSearch;
