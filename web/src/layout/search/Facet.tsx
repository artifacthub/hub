import React, { useEffect, useState, useCallback } from 'react';
import filter from 'lodash/filter';
import sortBy from 'lodash/sortBy';
import { FacetOption } from '../../types';
import SmallTitle from '../common/SmallTitle';
import Checkbox from '../common/Checkbox';
import ExpandableList from '../common/ExpandableList';
import isUndefined from 'lodash/isUndefined';
import styles from './Facet.module.css';

interface Props {
  filterKey: string;
  active: string[];
  title: string;
  options: FacetOption[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SPECIAL_REPOS = ['Incubator', 'Stable'];
const DEFAULT_VISIBLE_ITEMS = 10;

const Facet = (props: Props) => {
  const [visibleOptions, setVisibleOptions] = useState(DEFAULT_VISIBLE_ITEMS);

  const isChecked = useCallback(
    (facetOptionId: string) => {
      return props.active.includes(facetOptionId.toString());
    },
    [props.active],
  );

  useEffect(() => {
    if (props.filterKey === 'repo') {
      const activeOptions = filter(props.options, (o: FacetOption) => {
        return isChecked(o.id.toString()) && !SPECIAL_REPOS.includes(o.name);
      });
      setVisibleOptions(Math.max(DEFAULT_VISIBLE_ITEMS, activeOptions.length + SPECIAL_REPOS.length));
    }
  }, [props.active.length, isChecked, props.options, props.filterKey]);


  const getSortedOptions = () => {
    switch(props.filterKey) {
      case 'repo':
        let options = filter(props.options, (option: FacetOption) => {
          return !SPECIAL_REPOS.includes(option.name);
        });

        SPECIAL_REPOS.forEach((repoName: string) => {
          const repo = props.options.find((option: FacetOption) => {
            return option.name === repoName;
          });

          if (!isUndefined(repo)) {
            options.unshift(repo);
          }
        });

        return sortBy(options, [(o: FacetOption) => !isChecked(o.id.toString())]);

      default:
        return props.options;
    }
  };

  const allOptions = getSortedOptions().map((option: FacetOption) => (
    <Checkbox
      key={`fo_${option.id}`}
      name={props.filterKey}
      value={option.id.toString()}
      legend={option.total}
      label={option.name}
      checked={isChecked(option.id.toString())}
      onChange={props.onChange}
    />
  ));

  if (allOptions.length === 0) return null;

  return (
    <div role="menuitem" className={`mt-4 pt-2 ${styles.facet}`}>
      <SmallTitle text={props.title} />

      <div className="mt-3">
        <ExpandableList items={allOptions} visibleItems={visibleOptions} />
      </div>
    </div>
  );
};

export default Facet;
