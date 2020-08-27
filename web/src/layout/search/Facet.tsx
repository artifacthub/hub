import classnames from 'classnames';
import filter from 'lodash/filter';
import isUndefined from 'lodash/isUndefined';
import React, { useCallback, useEffect, useState } from 'react';

import { FacetOption } from '../../types';
import Checkbox from '../common/Checkbox';
import ExpandableList from '../common/ExpandableList';
import SmallTitle from '../common/SmallTitle';
import styles from './Facet.module.css';

interface Props {
  filterKey: string;
  active: string[];
  title: string;
  options: FacetOption[];
  onChange: (name: string, value: string, checked: boolean) => void;
  displaySubtitle?: boolean;
  notExpandable?: boolean;
}

const DEFAULT_VISIBLE_ITEMS = 3;

const Facet = (props: Props) => {
  const [visibleOptions, setVisibleOptions] = useState(DEFAULT_VISIBLE_ITEMS);

  const isChecked = useCallback(
    (facetOptionId: string) => {
      return props.active.includes(facetOptionId.toString());
    },
    [props.active]
  );

  useEffect(() => {
    const activeOptions = filter(props.options, (o: FacetOption) => {
      return isChecked(o.id.toString());
    });
    setVisibleOptions(Math.max(DEFAULT_VISIBLE_ITEMS, activeOptions.length));
  }, [props.active.length, isChecked, props.options, props.filterKey]);

  const allOptions = props.options.map((option: FacetOption) => (
    <Checkbox
      key={`fo_${option.id}`}
      name={props.filterKey}
      value={option.id.toString()}
      className={styles.checkbox}
      legend={option.total}
      label={option.name}
      checked={isChecked(option.id.toString())}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        props.onChange(e.target.name, e.target.value, e.target.checked)
      }
    />
  ));

  if (allOptions.length === 0) return null;

  return (
    <div
      role="menuitem"
      className={classnames(
        styles.facet,
        { 'mt-3 mt-sm-4 pt-1': isUndefined(props.displaySubtitle) },
        { 'mt-0 pt-0': !isUndefined(props.displaySubtitle) }
      )}
    >
      {!isUndefined(props.displaySubtitle) && props.displaySubtitle ? (
        <small className={`text-muted ${styles.subtitle}`}>{props.title}</small>
      ) : (
        <SmallTitle text={props.title} className="text-secondary font-weight-bold" />
      )}

      <div className={classnames({ 'mt-3': isUndefined(props.displaySubtitle) })}>
        {!isUndefined(props.notExpandable) && props.notExpandable ? (
          <>{allOptions}</>
        ) : (
          <ExpandableList items={allOptions} visibleItems={visibleOptions} />
        )}
      </div>
    </div>
  );
};

export default Facet;
