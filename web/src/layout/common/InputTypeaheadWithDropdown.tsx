import { isUndefined, orderBy } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MdFilterList } from 'react-icons/md';

import useOutsideClick from '../../hooks/useOutsideClick';
import { Option } from '../../types';
import InputTypeahead from './InputTypeahead';
import InputTypeaheadOptionItem from './InputTypeaheadOptionItem';
import styles from './InputTypeaheadWithDropdown.module.css';
import SmallTitle from './SmallTitle';

interface Props {
  label: string;
  options: Option[];
  selected: { [key: string]: string[] };
  className?: string;
  onChange: (name: string, value: string, checked: boolean) => void;
  onResetSomeFilters: (filterKeys: string[]) => void;
}

const InputTypeaheadWithDropdown = (props: Props) => {
  const dropdownRef = useRef(null);
  const [collapsed, setCollapsed] = useState<boolean>(true);

  useOutsideClick([dropdownRef], !collapsed, () => collapseDropdown());

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

  const collapseDropdown = () => {
    setCollapsed(true);
  };

  const [selectedItems, setSelectedItems] = useState<Option[]>(getSelectedItems());

  useEffect(() => {
    setSelectedItems(getSelectedItems());
  }, [getSelectedItems, props.selected]);

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
                  <InputTypeaheadOptionItem opt={opt} name={opt.name} iconClassName={styles.icon} />
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
          <InputTypeahead
            {...props}
            inputWrapperClassName="border-bottom p-1 mb-0"
            visibleClear
            autofocus
            onClear={() => {
              collapseDropdown();
              props.onResetSomeFilters(Object.keys(props.selected));
            }}
            onChangeSelection={() => {
              collapseDropdown();
            }}
          />
        </div>
      )}
    </div>
  );
};

export default InputTypeaheadWithDropdown;
