import React from 'react';
import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { Facets } from '../../types';
import Facet from './Facet';
import SmallTitle from '../common/SmallTitle';
import styles from './Filters.module.css';

interface Props {
  activeFilters: {
    [key: string]: string[];
  };
  facets: Facets[] | null;
  visibleTitle: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeprecatedChange: () => void;
  deprecated: boolean;
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

    <div role="menuitem" className={`mt-4 pt-2 ${styles.facet}`}>
      <SmallTitle text="Others" />

      <div className="mt-3">
        <div className="custom-control custom-checkbox">
          <input
            data-testid="deprecatedCheckbox"
            type="checkbox"
            className="custom-control-input"
            name="deprecated"
            id="deprecated"
            onChange={() => props.onDeprecatedChange()}
            checked={props.deprecated}
          />
          <label className="custom-control-label w-100" htmlFor="deprecated">Include deprecated</label>
        </div>
      </div>
    </div>
  </div>
);

export default Filters;
