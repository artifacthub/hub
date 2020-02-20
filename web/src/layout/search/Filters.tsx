import React from 'react';
import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { Facets } from '../../types';
import Facet from './Facet';
import styles from './Filters.module.css';

interface Props {
  activeFilters: {
    [key: string]: string[];
  };
  facets: Facets[] | null;
  visibleTitle: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Filters = (props: Props) => (
  <div className={classnames(
    styles.filters,
    {'pt-2 mt-3': props.visibleTitle},
  )}>
    {props.visibleTitle && (
      <div className="h6 text-uppercase pb-2 mb-4 border-bottom">Filters</div>
    )}

    {!isNull(props.facets) && props.facets.map((facets: Facets) => {
      return (
        <Facet
          key={facets.filterKey}
          {...facets}
          onChange={props.onChange}
          active={props.activeFilters.hasOwnProperty(facets.filterKey) ? props.activeFilters[facets.filterKey] : []}
        />
      );
    })}
  </div>
);

export default Filters;
