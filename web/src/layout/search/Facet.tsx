import classnames from 'classnames';
import filter from 'lodash/filter';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
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
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFacetExpandableChange: (filterKey: string, open: boolean) => void;
  displaySubtitle?: boolean;
  isExpanded: boolean;
}

const SPECIAL_REPOS = ['incubator', 'stable'];
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
    const specialRepos = filter(props.options, (o: FacetOption) => {
      if (props.filterKey === 'repo') {
        return SPECIAL_REPOS.includes(o.id.toString() as string);
      }
    });

    const activeOptions = filter(props.options, (o: FacetOption) => {
      if (props.filterKey === 'repo') {
        return isChecked(o.id.toString()) && !SPECIAL_REPOS.includes(o.id.toString() as string);
      } else {
        return isChecked(o.id.toString());
      }
    });
    const active = props.filterKey === 'repo' ? activeOptions.length + specialRepos.length : activeOptions.length;
    setVisibleOptions(Math.max(DEFAULT_VISIBLE_ITEMS, active));
  }, [props.active.length, isChecked, props.options, props.filterKey]);

  const getSortedOptions = () => {
    switch (props.filterKey) {
      case 'repo':
        let options = filter(props.options, (option: FacetOption) => {
          return !SPECIAL_REPOS.includes(option.id.toString());
        });

        SPECIAL_REPOS.forEach((repoName: string) => {
          const repo = props.options.find((option: FacetOption) => {
            return option.id.toString() === repoName;
          });

          if (!isUndefined(repo)) {
            options.unshift(repo);
          }
        });

        return sortBy(options, [(o: FacetOption) => !isChecked(o.id.toString())]);

      case 'kind':
        return props.options;

      default:
        return sortBy(props.options, [(o: FacetOption) => !isChecked(o.id.toString())]);
    }
  };

  const onExpandableChange = (open: boolean) => {
    props.onFacetExpandableChange(props.filterKey, open);
  };

  const allOptions = getSortedOptions().map((option: FacetOption) => (
    <Checkbox
      key={`fo_${option.id}`}
      name={props.filterKey}
      value={option.id.toString()}
      className={styles.checkbox}
      legend={option.total}
      label={option.name}
      checked={isChecked(option.id.toString())}
      onChange={props.onChange}
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
        <ExpandableList
          items={allOptions}
          visibleItems={visibleOptions}
          open={props.isExpanded}
          onBtnClick={onExpandableChange}
        />
      </div>
    </div>
  );
};

export default Facet;
