import classnames from 'classnames';
import { compact, isNull, isUndefined, orderBy } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IoIosCheckmark, IoIosClose } from 'react-icons/io';
import { MdFilterList } from 'react-icons/md';

import useOutsideClick from '../../hooks/useOutsideClick';
import { Option } from '../../types';
import styles from './InputTypeahead.module.css';
import SmallTitle from './SmallTitle';

interface Props {
  label: string;
  options: Option[];
  selected: { [key: string]: string[] };
  className?: string;
  onChange: (name: string, value: string, checked: boolean) => void;
  onResetSomeFilters: (filterKeys: string[]) => void;
}

const OptionItem = (opt: Option, name: string | JSX.Element) => (
  <>
    {!isUndefined(opt.icon) && <div className={styles.icon}>{opt.icon}</div>}
    <div className="ml-2 text-truncate">{name}</div>
    <div>
      {' '}
      <small className="ml-1">({opt.total})</small>
    </div>
  </>
);

const InputTypeahead = (props: Props) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [hightlightedText, setHightlightedText] = useState<RegExp | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(true);

  useOutsideClick([dropdownRef], !collapsed, () => collapseDropdown());

  const getVisibleItems = useCallback((): Option[] => {
    const filteredItems: Option[] = props.options.filter((opt: Option) =>
      opt.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    const elements: any[] = orderBy(
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
    return elements;
  }, [inputValue, props.options, props.selected]);

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

  const collapseDropdown = () => {
    setCollapsed(true);
    setInputValue('');
  };

  const [visibleItems, setVisibleItems] = useState<Option[]>(getVisibleItems());
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
    <div className={`position-relative ${props.className}`}>
      <button
        data-testid="typeaheadBtn"
        className="btn text-left p-0 btn-block"
        onClick={() => {
          if (collapsed) setCollapsed(false);
        }}
      >
        <div className="d-flex flex-row align-items-center justify-content-between">
          <SmallTitle text={props.label} className="text-secondary font-weight-bold pt-2" />

          <MdFilterList className="mt-2 mb-1 text-secondary" />
        </div>

        <div>
          {selectedItems.length === 0 ? (
            <div className={`text-muted ${styles.option}`}>
              <i>No {props.label} selected</i>
            </div>
          ) : (
            <>
              {selectedItems.map((opt: Option) => (
                <div
                  data-testid="typeaheadSelectedItem"
                  className={`d-flex flex-row align-items-center mt-2 ${styles.option}`}
                  key={`selected_${opt.filterKey}_${opt.id}`}
                >
                  {OptionItem(opt, opt.name)}
                </div>
              ))}
            </>
          )}
        </div>
      </button>

      {!collapsed && (
        <div
          ref={dropdownRef}
          data-testid="typeaheadDropdown"
          className={`dropdown-menu p-0 shadow-sm w-100 show ${styles.dropdown}`}
        >
          <div className={`form-group input-group-sm p-1 mb-0 border-bottom ${styles.inputWrapper}`}>
            <input
              data-testid="typeaheadInput"
              ref={inputEl}
              type="text"
              placeholder={`Search ${props.label}`}
              className={`flex-grow-1 px-3 form-control ${styles.input}`}
              name={`inputTypeahead_${props.label}`}
              value={inputValue}
              onChange={onChange}
              spellCheck="false"
            />
          </div>

          {selectedItems.length > 0 && (
            <div className="py-1 border-bottom">
              <button
                data-testid="typeaheadClearBtn"
                className="btn btn-sm btn-block"
                onClick={() => {
                  collapseDropdown();
                  props.onResetSomeFilters(Object.keys(props.selected));
                }}
              >
                <div className="d-flex flex-row align-items-center text-muted">
                  <IoIosClose />
                  <small className="ml-2">Clear all</small>
                </div>
              </button>
            </div>
          )}

          {visibleItems.length === 0 ? (
            <div className="p-3 text-center">
              <small className="text-muted">Sorry, no matches found</small>
            </div>
          ) : (
            <div className={styles.itemsList}>
              {visibleItems.map((opt: Option) => {
                const isSelected =
                  props.selected.hasOwnProperty(opt.filterKey) &&
                  props.selected[opt.filterKey].includes(opt.id.toString());

                return (
                  <button
                    key={`opt_${opt.filterKey}_${opt.id}`}
                    data-testid="typeaheadDropdownBtn"
                    className={classnames('dropdown-item', styles.option, { [styles.selected]: isSelected })}
                    onClick={() => {
                      props.onChange(opt.filterKey, opt.id.toString(), !isSelected);
                      collapseDropdown();
                    }}
                  >
                    <div className="d-flex flex-row align-items-center position-relative">
                      {isSelected && (
                        <div className={`position-absolute ${styles.checkMark}`}>
                          <IoIosCheckmark />
                        </div>
                      )}
                      {OptionItem(opt, getOptionName(opt.name))}
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
        </div>
      )}
    </div>
  );
};

export default InputTypeahead;
