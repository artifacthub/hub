import classnames from 'classnames';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FaBuilding, FaUser } from 'react-icons/fa';
import { GoPackage } from 'react-icons/go';
import { IoMdCloseCircleOutline } from 'react-icons/io';

import { FacetOption, Facets, Option } from '../../types';
import CheckBox from '../common/Checkbox';
import InputTypeahead from '../common/InputTypeahead';
import SmallTitle from '../common/SmallTitle';
import Facet from './Facet';
import styles from './Filters.module.css';
import TsQuery from './TsQuery';

interface SelectedFilters {
  [key: string]: string[];
}

interface Props {
  activeFilters: {
    [key: string]: string[];
  };
  activeTsQuery?: string[];
  facets: Facets[] | null;
  visibleTitle: boolean;
  onChange: (name: string, value: string, checked: boolean) => void;
  onResetSomeFilters: (filterKeys: string[]) => void;
  onTsQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeprecatedChange: () => void;
  onOperatorsChange: () => void;
  onResetFilters: () => void;
  deprecated?: boolean | null;
  operators?: boolean | null;
}

const Filters = (props: Props) => {
  const getFacetsByFilterKey = (filterKey: string): Facets | undefined => {
    return find(props.facets, (facets: Facets) => filterKey === facets.filterKey);
  };

  const getPublishers = (): JSX.Element | null => {
    let publishersList = null;
    let selectedPublishers: SelectedFilters = {
      user: [],
      org: [],
    };
    if (!isNull(props.facets)) {
      const user = getFacetsByFilterKey('user');
      let usersList: Option[] = [];
      if (!isUndefined(user)) {
        usersList = user.options.map((facet: FacetOption) => ({ ...facet, icon: <FaUser />, filterKey: 'user' }));
        if (!isUndefined(props.activeFilters.user)) {
          selectedPublishers.user = props.activeFilters.user;
        }
      }

      const org = getFacetsByFilterKey('org');
      let orgsList: Option[] = [];
      if (!isUndefined(org)) {
        orgsList = org.options.map((facet: FacetOption) => ({ ...facet, icon: <FaBuilding />, filterKey: 'org' }));
        if (!isUndefined(props.activeFilters.org)) {
          selectedPublishers.org = props.activeFilters.org;
        }
      }

      const options = [...usersList, ...orgsList];
      if (options.length > 0) {
        publishersList = (
          <div className="mt-3 mt-sm-4 pt-1">
            <InputTypeahead
              label="publisher"
              options={options}
              selected={selectedPublishers}
              onChange={props.onChange}
              onResetSomeFilters={props.onResetSomeFilters}
            />
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

  const getRepositoryFacets = (): JSX.Element | null => {
    let crElement = null;
    const repo = getFacetsByFilterKey('repo');
    if (!isUndefined(repo)) {
      const options = repo.options.map((facet: FacetOption) => ({ ...facet, icon: <GoPackage />, filterKey: 'repo' }));

      crElement = (
        <div className="mt-3 mt-sm-4 pt-1">
          <InputTypeahead
            label="repository"
            options={options}
            selected={{
              repo: props.activeFilters.repo || [],
            }}
            onChange={props.onChange}
            onResetSomeFilters={props.onResetSomeFilters}
          />
        </div>
      );
    }

    return crElement;
  };

  return (
    <div className={classnames(styles.filters, { 'pt-2 mt-3 mb-5': props.visibleTitle })}>
      {props.visibleTitle && (
        <div className="d-flex flex-row align-items-center justify-content-between pb-2 mb-4 border-bottom">
          <div className={`h6 text-uppercase mb-0 ${styles.title}`}>Filters</div>
          {(!isEmpty(props.activeFilters) || props.deprecated || props.operators || !isEmpty(props.activeTsQuery)) && (
            <div className={`d-flex align-items-center ${styles.resetBtnWrapper}`}>
              <IoMdCloseCircleOutline className={`text-secondary ${styles.resetBtnDecorator}`} />
              <button
                data-testid="resetFiltersBtn"
                className={`btn btn-link btn-sm p-0 pl-1 text-secondary ${styles.resetBtn}`}
                onClick={props.onResetFilters}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      )}

      <TsQuery active={props.activeTsQuery || []} onChange={props.onTsQueryChange} />
      {getKindFacets()}
      {getPublishers()}
      {getRepositoryFacets()}

      <div role="menuitem" className={`mt-3 mt-sm-4 pt-1 ${styles.facet}`}>
        <SmallTitle text="Others" className="text-secondary font-weight-bold" />

        <div className="mt-3">
          <CheckBox
            name="operators"
            value="operators"
            className={styles.checkbox}
            label="Only operators"
            checked={!isUndefined(props.operators) && !isNull(props.operators) && props.operators}
            onChange={props.onOperatorsChange}
          />

          <CheckBox
            name="deprecated"
            value="deprecated"
            className={styles.checkbox}
            label="Include deprecated"
            checked={!isUndefined(props.deprecated) && !isNull(props.deprecated) && props.deprecated}
            onChange={props.onDeprecatedChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Filters;
