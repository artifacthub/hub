import classnames from 'classnames';
import { compact, isNull, isUndefined, orderBy } from 'lodash';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { IoIosCheckmark, IoIosClose } from 'react-icons/io';

import { Option, RefInputTypeaheadField } from '../../types';
import styles from './InputTypeahead.module.css';
import InputTypeaheadOptionItem from './InputTypeaheadOptionItem';

interface Props {
  label: string;
  options: Option[];
  selected: { [key: string]: string[] };
  inputWrapperClassName?: string;
  listClassName?: string;
  optClassName?: string;
  searchIcon?: boolean;
  onChange: (name: string, value: string, checked: boolean) => void;
  onClear?: () => void;
  visibleClear: boolean;
  onChangeSelection?: () => void;
  displayItemsInValueLength?: number;
}

const InputTypeahead = forwardRef((props: Props, ref: React.Ref<RefInputTypeaheadField>) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [hightlightedText, setHightlightedText] = useState<RegExp | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      setInputValue('');
    },
    getValue(): string {
      return inputValue;
    },
    updateValue(newValue: string): void {
      setInputValue(newValue);
    },
  }));

  const getVisibleItems = useCallback((): Option[] | null => {
    let filteredItems: Option[] = [];
    let elements: any[] | null = null;

    if (isUndefined(props.displayItemsInValueLength) || inputValue.length >= props.displayItemsInValueLength) {
      filteredItems = props.options.filter((opt: Option) => opt.name.toLowerCase().includes(inputValue.toLowerCase()));
      elements = orderBy(
        filteredItems,
        [
          (item: Option) =>
            props.selected.hasOwnProperty(item.filterKey) && props.selected[item.filterKey].includes(item.id.toString())
              ? -1
              : 1,
          'total',
        ],
        ['asc', 'desc']
      );
    }

    return elements;
  }, [inputValue, props.options, props.selected, props.displayItemsInValueLength]);

  const getSelectedItems = useCallback((): Option[] => {
    let selectedItems: Option[] = [];
    Object.keys(props.selected).forEach((fKey: string) => {
      props.selected[fKey].forEach((item: string) => {
        const selected = props.options.find((opt: Option) => opt.id.toString() === item && opt.filterKey === fKey);
        if (!isUndefined(selected)) {
          selectedItems.push(selected);
        }
      });
    });
    return orderBy(selectedItems, 'total', 'desc');
  }, [props.options, props.selected]);

  const getOptionName = (name: string): JSX.Element => {
    if (!isNull(hightlightedText)) {
      const stringParts: string[] = compact(name.split(hightlightedText));
      if (stringParts.length === 1) {
        return <>{name}</>;
      }

      return (
        <>
          {stringParts.map((str: string, index: number) => (
            <span
              key={`${name}_${index}`}
              className={classnames({
                'font-weight-bold hightlighted': str.toLowerCase() === inputValue.toLowerCase(),
              })}
            >
              {str}
            </span>
          ))}
        </>
      );
    } else {
      return <>{name}</>;
    }
  };

  const [visibleItems, setVisibleItems] = useState<Option[] | null>(getVisibleItems());
  const [selectedItems, setSelectedItems] = useState<Option[]>(getSelectedItems());

  useEffect(() => {
    setVisibleItems(getVisibleItems());
  }, [getVisibleItems, inputValue, props.options]);

  useEffect(() => {
    setSelectedItems(getSelectedItems());
  }, [getSelectedItems, props.selected]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();

    setInputValue(e.target.value);
    setHightlightedText(e.target.value !== '' ? new RegExp(`(${e.target.value.toLowerCase()})`, 'gi') : null);
  };

  if (props.options.length === 0) return null;

  return (
    <>
      <div className={`form-group input-group-sm ${styles.inputWrapper} ${props.inputWrapperClassName}`}>
        <input
          data-testid="typeaheadInput"
          ref={inputEl}
          type="text"
          placeholder={`Search ${props.label}`}
          className={classnames(
            'flex-grow-1 form-control',
            styles.input,
            { 'pl-3 pr-4': props.searchIcon },
            { 'px-3': isUndefined(props.searchIcon) || !props.searchIcon }
          )}
          name={`inputTypeahead_${props.label}`}
          value={inputValue}
          onChange={onChange}
          spellCheck="false"
        />

        {props.searchIcon && <FaSearch className={`text-muted position-absolute ${styles.searchIcon}`} />}
      </div>

      {selectedItems.length > 0 && props.visibleClear && (
        <div className="py-1 border-bottom">
          <button
            data-testid="typeaheadClearBtn"
            className="btn btn-sm btn-block"
            onClick={() => {
              if (props.onClear) {
                props.onClear();
              }
            }}
          >
            <div className="d-flex flex-row align-items-center text-muted">
              <IoIosClose />
              <small className="ml-2">Clear all</small>
            </div>
          </button>
        </div>
      )}

      {visibleItems && (
        <>
          {visibleItems.length === 0 ? (
            <div className={`p-3 text-center ${props.listClassName}`}>
              <small className="text-muted">Sorry, no matches found</small>
            </div>
          ) : (
            <div className={`${styles.itemsList} ${props.listClassName}`}>
              {visibleItems.map((opt: Option) => {
                const isSelected =
                  props.selected.hasOwnProperty(opt.filterKey) &&
                  props.selected[opt.filterKey].includes(opt.id.toString());
                const name = getOptionName(opt.name);

                return (
                  <button
                    key={`opt_${opt.filterKey}_${opt.id}`}
                    data-testid="typeaheadDropdownBtn"
                    className={classnames('dropdown-item', styles.option, props.optClassName, {
                      [styles.selected]: isSelected,
                    })}
                    onClick={() => {
                      props.onChange(opt.filterKey, opt.id.toString(), !isSelected);
                      if (props.onChangeSelection) {
                        props.onChangeSelection();
                      }
                    }}
                  >
                    <div className="d-flex flex-row align-items-center position-relative">
                      {isSelected && (
                        <div className={`position-absolute ${styles.checkMark}`}>
                          <IoIosCheckmark />
                        </div>
                      )}
                      <InputTypeaheadOptionItem opt={opt} name={name} iconClassName={styles.icon} />

                      {isSelected && (
                        <div className={`position-absolute ${styles.close}`}>
                          <IoIosClose />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
});

export default InputTypeahead;
