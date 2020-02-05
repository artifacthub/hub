import React from 'react';
import isNull from 'lodash/isNull';
import { Facets, Filters as FiltersProp } from '../../types';
import Facet from './Facet';
import styles from './Filters.module.css';

interface Props {
  activeFilters: FiltersProp;
  facets: Facets[] | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Filters = (props: Props) => {
  return (
    <div className={`pt-2 mt-3 ${styles.filters}`}>
      <h6 className="text-uppercase pb-2 mb-4 border-bottom">Filters</h6>

      {!isNull(props.facets) && props.facets.map((facets: Facets) => {
        return (
          <Facet
            key={facets.filter_key}
            {...facets}
            onChange={props.onChange}
            active={props.activeFilters.hasOwnProperty(facets.filter_key) ? props.activeFilters[facets.filter_key] : []}
          />
        );
      })}
    </div>
  );
}

export default Filters;
