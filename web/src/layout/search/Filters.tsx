import classnames from 'classnames';
import { sortBy } from 'lodash';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { FaBuilding, FaUser } from 'react-icons/fa';
import { GoLaw, GoPackage } from 'react-icons/go';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { MdInfoOutline } from 'react-icons/md';

import { FacetOption, Facets, Option } from '../../types';
import { OPERATOR_CAPABILITIES } from '../../utils/data';
import CheckBox from '../common/Checkbox';
import ElementWithTooltip from '../common/ElementWithTooltip';
import InputTypeaheadWithDropdown from '../common/InputTypeaheadWithDropdown';
import SmallTitle from '../common/SmallTitle';
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
  facets?: Facets[] | null;
  visibleTitle: boolean;
  onChange: (name: string, value: string, checked: boolean) => void;
  onResetSomeFilters: (filterKeys: string[]) => void;
  onTsQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeprecatedChange: () => void;
  onOperatorsChange: () => void;
  onVerifiedPublisherChange: () => void;
  onOfficialChange: () => void;
  onResetFilters: () => void;
  deprecated?: boolean | null;
  operators?: boolean | null;
  verifiedPublisher?: boolean | null;
  official?: boolean | null;
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
    if (props.facets) {
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
      publishersList = (
        <InputTypeaheadWithDropdown
          label="publisher"
          options={options}
          selected={selectedPublishers}
          className="mt-2 mt-sm-3 pt-1"
          onChange={props.onChange}
          onResetSomeFilters={props.onResetSomeFilters}
        />
      );
    }

    return publishersList;
  };

  const getKindFacets = (): JSX.Element | null => {
    let kindElement = null;
    const kind = getFacetsByFilterKey('kind');
    if (!isUndefined(kind) && kind.options.length > 0) {
      const active = props.activeFilters.hasOwnProperty(kind.filterKey) ? props.activeFilters[kind.filterKey] : [];
      const isChecked = (facetOptionId: string) => {
        return active.includes(facetOptionId.toString());
      };

      kindElement = (
        <div role="menuitem" className={`mt-1 mt-sm-2 pt-1 ${styles.facet}`}>
          <SmallTitle text={kind.title} className="text-secondary font-weight-bold" />
          <div className="mt-3">
            {kind.options.map((option: FacetOption) => (
              <CheckBox
                key={`kind_${option.id.toString()}`}
                name={kind.filterKey}
                value={option.id.toString()}
                className={styles.checkbox}
                legend={option.total}
                label={option.name}
                checked={isChecked(option.id.toString())}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  props.onChange(e.target.name, e.target.value, e.target.checked)
                }
              />
            ))}
          </div>
        </div>
      );
    }

    return kindElement;
  };

  const getCapabilitiesFacets = (): JSX.Element | null => {
    let element = null;
    const capabilities = getFacetsByFilterKey('capabilities');
    if (!isUndefined(capabilities) && capabilities.options.length > 0) {
      const active = props.activeFilters.hasOwnProperty(capabilities.filterKey)
        ? props.activeFilters[capabilities.filterKey]
        : [];
      const isChecked = (facetOptionId: string) => {
        return active.includes(facetOptionId.toString());
      };

      const sortedCapabililties = sortBy(capabilities.options, [
        (facet: FacetOption) => {
          return OPERATOR_CAPABILITIES.findIndex((level: string) => level === facet.id);
        },
      ]);

      element = (
        <div role="menuitem" className={`mt-2 mt-sm-3 pt-1 ${styles.facet}`}>
          <SmallTitle text={capabilities.title} className="text-secondary font-weight-bold" />
          <div className="mt-3">
            {sortedCapabililties.map((option: FacetOption) => (
              <CheckBox
                key={`capabilities_${option.id.toString()}`}
                name={capabilities.filterKey}
                value={option.id.toString()}
                className={`text-capitalize ${styles.checkbox}`}
                legend={option.total}
                label={option.name}
                checked={isChecked(option.id.toString())}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  props.onChange(e.target.name, e.target.value, e.target.checked)
                }
              />
            ))}
          </div>
        </div>
      );
    }

    return element;
  };

  const getRepositoryFacets = (): JSX.Element | null => {
    let crElement = null;
    const repo = getFacetsByFilterKey('repo');
    if (!isUndefined(repo)) {
      const options = repo.options.map((facet: FacetOption) => ({ ...facet, icon: <GoPackage />, filterKey: 'repo' }));

      crElement = (
        <InputTypeaheadWithDropdown
          label="repository"
          options={options}
          selected={{
            repo: props.activeFilters.repo || [],
          }}
          className="mt-2 mt-sm-3 pt-1"
          onChange={props.onChange}
          onResetSomeFilters={props.onResetSomeFilters}
        />
      );
    }

    return crElement;
  };

  const getLicenseFacets = (): JSX.Element | null => {
    let crElement = null;
    const repo = getFacetsByFilterKey('license');
    if (!isUndefined(repo)) {
      const options = repo.options.map((facet: FacetOption) => ({ ...facet, icon: <GoLaw />, filterKey: 'license' }));

      crElement = (
        <InputTypeaheadWithDropdown
          label="license"
          options={options}
          selected={{
            license: props.activeFilters.license || [],
          }}
          className="mt-2 mt-sm-3 pt-1"
          onChange={props.onChange}
          onResetSomeFilters={props.onResetSomeFilters}
        />
      );
    }

    return crElement;
  };

  return (
    <div className={classnames(styles.filters, { 'pt-2 mt-3 mb-5': props.visibleTitle })}>
      {props.visibleTitle && (
        <div className="d-flex flex-row align-items-center justify-content-between pb-2 mb-4 border-bottom">
          <div className={`h6 text-uppercase mb-0 ${styles.title}`}>Filters</div>
          {(!isEmpty(props.activeFilters) ||
            props.deprecated ||
            props.operators ||
            props.verifiedPublisher ||
            props.official ||
            !isEmpty(props.activeTsQuery)) && (
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

      <div className="d-flex flex-row align-items-baseline">
        <CheckBox
          name="official"
          value="official"
          className={styles.checkbox}
          label="Official"
          checked={props.official || false}
          onChange={props.onOfficialChange}
        />

        <div className="d-none d-md-block">
          <ElementWithTooltip
            className={styles.tooltipIcon}
            tooltipClassName={styles.tooltipMessage}
            tooltipArrowClassName={styles.arrowTooltipMessage}
            element={<MdInfoOutline />}
            tooltipMessage="The publisher owns the software deployed by the packages"
            visibleTooltip
            active
          />
        </div>
      </div>

      <div className="d-flex flex-row align-items-baseline">
        <CheckBox
          name="verifiedPublisher"
          value="verifiedPublisher"
          className={styles.checkbox}
          label="Verified publishers"
          checked={props.verifiedPublisher || false}
          onChange={props.onVerifiedPublisherChange}
        />

        <div className="d-none d-md-block">
          <ElementWithTooltip
            className={styles.tooltipIcon}
            tooltipClassName={styles.tooltipMessage}
            tooltipArrowClassName={styles.arrowTooltipMessage}
            element={<MdInfoOutline />}
            tooltipMessage="The publisher owns the repository"
            visibleTooltip
            active
          />
        </div>
      </div>

      {getKindFacets()}
      <TsQuery active={props.activeTsQuery || []} onChange={props.onTsQueryChange} />
      {getPublishers()}
      {getRepositoryFacets()}
      {getLicenseFacets()}
      {getCapabilitiesFacets()}

      <div role="menuitem" className={`mt-2 mt-sm-3 pt-1 ${styles.facet}`}>
        <SmallTitle text="Others" className="text-secondary font-weight-bold" />

        <div className="mt-3">
          <CheckBox
            name="operators"
            value="operators"
            className={styles.checkbox}
            label="Only operators"
            checked={props.operators || false}
            onChange={props.onOperatorsChange}
          />

          <CheckBox
            name="deprecated"
            value="deprecated"
            className={styles.checkbox}
            label="Include deprecated"
            checked={props.deprecated || false}
            onChange={props.onDeprecatedChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Filters;
