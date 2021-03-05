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
  autofocus?: boolean;
  placeholder?: string;
  additionalInfo?: string | JSX.Element;
}

const ITEM_HEIGHT = 37;

const InputTypeahead = forwardRef((props: Props, ref: React.Ref<RefInputTypeaheadField>) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const itemsWrapper = useRef<HTMLDivElement | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [hightlightedText, setHightlightedText] = useState<RegExp | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<number | null>(null);

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

    if (!isNull(highlightedItem)) {
      setHighlightedItem(null);
    }

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
  }, [highlightedItem, props.displayItemsInValueLength, props.options, props.selected, inputValue]);

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
        return (
          <span
            className={classnames({
              'font-weight-bold hightlighted': name.toLowerCase() === inputValue.toLowerCase(),
            })}
          >
            {name}
          </span>
        );
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

  const [visibleItems, setVisibleItems] = useState<Option[] | null>(null);
  const [selectedItems, setSelectedItems] = useState<Option[]>(getSelectedItems());

  useEffect(() => {
    setVisibleItems(getVisibleItems());
  }, [inputValue, props.options]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    setSelectedItems(getSelectedItems());
  }, [getSelectedItems, props.selected]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();

    setHighlightedItem(null);
    setInputValue(e.target.value);
    setHightlightedText(e.target.value !== '' ? new RegExp(`(${e.target.value.toLowerCase()})`, 'gi') : null);
  };

  const onSelect = (filterKey: string, id: string, isSelected: boolean) => {
    setHighlightedItem(null);
    props.onChange(filterKey, id, !isSelected);
    if (props.onChangeSelection) {
      props.onChangeSelection();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    switch (e.key) {
      case 'ArrowDown':
        updateHighlightedItem('down');
        return;
      case 'ArrowUp':
        updateHighlightedItem('up');
        return;
      case 'Enter':
        if (!isNull(highlightedItem) && visibleItems) {
          const item = visibleItems[highlightedItem];
          const isSelected =
            props.selected.hasOwnProperty(item.filterKey) &&
            props.selected[item.filterKey].includes(item.id.toString());
          onSelect(item.filterKey, item.id.toString(), isSelected);
        }
        return;
      default:
        return;
    }
  };

  const scrollDropdown = (index: number) => {
    if (itemsWrapper && itemsWrapper.current) {
      const itemsOnScreen = Math.floor(itemsWrapper.current.clientHeight / ITEM_HEIGHT);
      if (index + 1 > itemsOnScreen) {
        itemsWrapper.current.scroll(0, (index + 1 - itemsOnScreen) * ITEM_HEIGHT);
      } else {
        itemsWrapper.current.scroll(0, 0);
      }
    }
  };

  const updateHighlightedItem = (arrow: 'up' | 'down') => {
    if (!isNull(highlightedItem)) {
      let newIndex: number = arrow === 'up' ? highlightedItem - 1 : highlightedItem + 1;
      if (newIndex > visibleItems!.length - 1) {
        newIndex = 0;
      }
      if (newIndex < 0) {
        newIndex = visibleItems!.length - 1;
      }
      scrollDropdown(newIndex);
      setHighlightedItem(newIndex);
    } else {
      if (visibleItems && visibleItems.length > 0) {
        const newIndex = arrow === 'up' ? visibleItems.length - 1 : 0;
        scrollDropdown(newIndex);
        setHighlightedItem(newIndex);
      }
    }
  };

  if (props.options.length === 0) return null;

  return (
    <>
      <div className={`form-group input-group-sm ${styles.inputWrapper} ${props.inputWrapperClassName}`}>
        <input
          data-testid="typeaheadInput"
          ref={inputEl}
          type="text"
          placeholder={props.placeholder || `Search ${props.label}`}
          className={classnames(
            'flex-grow-1 form-control',
            styles.input,
            { 'pl-3 pr-4': props.searchIcon },
            { 'px-3': isUndefined(props.searchIcon) || !props.searchIcon }
          )}
          name={`inputTypeahead_${props.label}`}
          value={inputValue}
          onChange={onChange}
          onKeyDown={onKeyDown}
          spellCheck="false"
          autoFocus={!isUndefined(props.autofocus) && props.autofocus}
        />

        {props.searchIcon && <FaSearch className={`text-muted position-absolute ${styles.searchIcon}`} />}

        {!isUndefined(props.additionalInfo) && <div className="alert p-0 mt-3">{props.additionalInfo}</div>}
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
            <div className={`${styles.itemsList} ${props.listClassName}`} ref={itemsWrapper}>
              {visibleItems.map((opt: Option, index: number) => {
                const isSelected =
                  props.selected.hasOwnProperty(opt.filterKey) &&
                  props.selected[opt.filterKey].includes(opt.id.toString());
                const name = getOptionName(opt.name);

                return (
                  <button
                    key={`opt_${opt.filterKey}_${opt.id}`}
                    data-testid="typeaheadDropdownBtn"
                    className={classnames(
                      'dropdown-item',
                      styles.option,
                      props.optClassName,
                      {
                        [styles.selected]: isSelected,
                      },
                      {
                        [styles.hightlighted]: index === highlightedItem,
                      }
                    )}
                    onClick={() => {
                      onSelect(opt.filterKey, opt.id.toString(), isSelected);
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
