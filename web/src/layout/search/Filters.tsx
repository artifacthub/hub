import classnames from 'classnames';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { IoMdCloseCircleOutline } from 'react-icons/io';

import { Facets, PackageKind } from '../../types';
import SmallTitle from '../common/SmallTitle';
import Facet from './Facet';
import styles from './Filters.module.css';

interface Props {
  activeFilters: {
    [key: string]: string[];
  };
  facets: Facets[] | null;
  visibleTitle: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeprecatedChange: () => void;
  onResetFilters: () => void;
  deprecated: boolean;
}

const Filters = (props: Props) => {
  const getFacetsByFilterKey = (filterKey: string): Facets | undefined => {
    return find(props.facets, (facets: Facets) => filterKey === facets.filterKey);
  };

  const getPublishers = (): JSX.Element | null => {
    let publishersList = null;
    if (!isNull(props.facets)) {
      const user = getFacetsByFilterKey('user');
      let userElement = null;
      if (!isUndefined(user)) {
        userElement = (
          <Facet
            {...user}
            onChange={props.onChange}
            active={props.activeFilters.hasOwnProperty(user.filterKey) ? props.activeFilters[user.filterKey] : []}
            displaySubtitle
          />
        );
      }

      const org = getFacetsByFilterKey('org');
      let orgElement = null;
      if (!isUndefined(org)) {
        orgElement = (
          <Facet
            {...org}
            onChange={props.onChange}
            active={props.activeFilters.hasOwnProperty(org.filterKey) ? props.activeFilters[org.filterKey] : []}
            displaySubtitle
          />
        );
      }

      if (!isNull(userElement) || !isNull(orgElement)) {
        publishersList = (
          <div className="mt-4">
            <SmallTitle text="Publisher" />
            {orgElement}
            {userElement}
          </div>
        );
      }
    }

    return publishersList;
  };

  const getKindFacets = (): JSX.Element | null => {
    let kindElement = null;
    const kind = getFacetsByFilterKey('kind');
    if (!isUndefined(kind)) {
      kindElement = (
        <Facet
          {...kind}
          onChange={props.onChange}
          active={props.activeFilters.hasOwnProperty(kind.filterKey) ? props.activeFilters[kind.filterKey] : []}
        />
      );
    }

    return kindElement;
  };

  const getChartRepositoryFacets = (): JSX.Element | null => {
    let crElement = null;
    const chartRepo = getFacetsByFilterKey('repo');
    const selectedKinds: string[] = props.activeFilters.hasOwnProperty('kind') ? props.activeFilters.kind : [];
    if (
      !isUndefined(chartRepo) &&
      (!props.activeFilters.hasOwnProperty('kind') || selectedKinds.includes(PackageKind.Chart.toString()))
    ) {
      crElement = (
        <Facet
          {...chartRepo}
          onChange={props.onChange}
          active={
            props.activeFilters.hasOwnProperty(chartRepo.filterKey) ? props.activeFilters[chartRepo.filterKey] : []
          }
        />
      );
    }

    return crElement;
  };

  return (
    <div className={classnames(styles.filters, { 'pt-2 mt-3': props.visibleTitle })}>
      {props.visibleTitle && (
        <div className="d-flex flex-row align-items-center justify-content-between pb-2 mb-4 border-bottom">
          <div className={`h6 text-uppercase mb-0 ${styles.title}`}>Filters</div>
          {(!isEmpty(props.activeFilters) || props.deprecated) && (
            <div className={`d-flex align-items-center ${styles.resetBtnWrapper}`}>
              <IoMdCloseCircleOutline className={`text-secondary ${styles.resetBtnDecorator}`} />
              <button
                className={`btn btn-link btn-sm p-0 pl-1 text-secondary ${styles.resetBtn}`}
                onClick={props.onResetFilters}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      {getPublishers()}
      {getKindFacets()}
      {getChartRepositoryFacets()}

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
            <label className="custom-control-label w-100" htmlFor="deprecated">
              Include deprecated
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filters;
