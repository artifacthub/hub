import classnames from 'classnames';
import { sortBy } from 'lodash';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent } from 'react';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { MdInfoOutline } from 'react-icons/md';

import { FacetOption, Facets, Option } from '../../types';
import { OPERATOR_CAPABILITIES } from '../../utils/data';
import CheckBox from '../common/Checkbox';
import ElementWithTooltip from '../common/ElementWithTooltip';
import ExpandableList from '../common/ExpandableList';
import SmallTitle from '../common/SmallTitle';
import styles from './Filters.module.css';
import TsQuery from './TsQuery';

interface Props {
  forceCollapseList: boolean;
  activeFilters: {
    [key: string]: string[];
  };
  activeTsQuery?: string[];
  facets?: Facets[] | null;
  visibleTitle: boolean;
  onChange: (name: string, value: string, checked: boolean) => void;
  onResetSomeFilters: (filterKeys: string[]) => void;
  onTsQueryChange: (value: string, checked: boolean) => void;
  onDeprecatedChange: () => void;
  onOperatorsChange: () => void;
  onVerifiedPublisherChange: () => void;
  onOfficialChange: () => void;
  onResetFilters: () => void;
  deprecated?: boolean | null;
  operators?: boolean | null;
  verifiedPublisher?: boolean | null;
  official?: boolean | null;
  device: string;
}

const Filters = (props: Props) => {
  const getFacetsByFilterKey = (filterKey: string): Facets | undefined => {
    return find(props.facets, (facets: Facets) => filterKey === facets.filterKey);
  };

  const getPublishers = (): JSX.Element | null => {
    let crElement = null;
    const publisherList = getFacetsByFilterKey('publisher');
    if (!isUndefined(publisherList) && publisherList.options.length > 0) {
      const isChecked = (facetOptionId: string, filterKey: string) => {
        return (props.activeFilters[filterKey] || []).includes(facetOptionId.toString());
      };

      const options = publisherList.options.map((facet: FacetOption) => ({
        ...facet,
        filterKey: facet.filterKey!,
      }));

      const publisherOptions = options.map((option: Option) => (
        <CheckBox
          key={`${option.filterKey}_${option.id.toString()}`}
          name={option.filterKey}
          device={props.device}
          value={option.id.toString()}
          labelClassName="mw-100"
          className={styles.checkbox}
          legend={option.total}
          label={option.name}
          checked={isChecked(option.id.toString(), option.filterKey)}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            props.onChange(e.target.name, e.target.value, e.target.checked)
          }
        />
      ));

      crElement = (
        <div role="menuitem" className={`mt-2 mt-sm-3 pt-1 ${styles.facet}`}>
          <SmallTitle text="Publisher" className="text-dark fw-bold" />
          <div className="mt-3" role="group">
            <ExpandableList visibleItems={5} items={publisherOptions} forceCollapseList={props.forceCollapseList} />
          </div>
        </div>
      );
    }

    return crElement;
  };

  const getKindFacets = (): JSX.Element | null => {
    let kindElement = null;
    const kind = getFacetsByFilterKey('kind');
    if (!isUndefined(kind) && kind.options.length > 0 && kind.filterKey) {
      const active = props.activeFilters.hasOwnProperty(kind.filterKey) ? props.activeFilters[kind.filterKey] : [];
      const isChecked = (facetOptionId: string) => {
        return active.includes(facetOptionId.toString());
      };

      kindElement = (
        <div role="menuitem" className={`mt-1 mt-sm-2 pt-1 ${styles.facet}`}>
          <SmallTitle text={kind.title} className="text-dark fw-bold" id={`repo-${kind.filterKey}-${props.device}`} />
          <div className="mt-3" role="group" aria-labelledby={`repo-${kind.filterKey}-${props.device}`}>
            {kind.options.map((option: FacetOption) => (
              <CheckBox
                key={`kind_${option.id.toString()}`}
                name={kind.filterKey!}
                device={props.device}
                value={option.id.toString()}
                labelClassName="mw-100"
                className={styles.checkbox}
                legend={option.total}
                label={option.name}
                checked={isChecked(option.id.toString())}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
    if (!isUndefined(capabilities) && capabilities.options.length > 0 && capabilities.filterKey) {
      const active = props.activeFilters.hasOwnProperty(capabilities.filterKey)
        ? props.activeFilters[capabilities.filterKey]
        : [];
      const isChecked = (facetOptionId: string) => {
        return active.includes(facetOptionId.toString());
      };

      const sortedCapabilities = sortBy(capabilities.options, [
        (facet: FacetOption) => {
          return OPERATOR_CAPABILITIES.findIndex((level: string) => level === facet.id);
        },
      ]);

      element = (
        <div role="menuitem" className={`mt-2 mt-sm-3 pt-1 ${styles.facet}`}>
          <SmallTitle
            text={capabilities.title}
            className="text-dark fw-bold"
            id={`pkg-${capabilities.filterKey}-${props.device}`}
          />
          <div className="mt-3" role="group" aria-labelledby={`pkg-${capabilities.filterKey}-${props.device}`}>
            {sortedCapabilities.map((option: FacetOption) => (
              <CheckBox
                key={`capabilities_${option.id.toString()}`}
                name={capabilities.filterKey!}
                device={props.device}
                value={option.id.toString()}
                labelClassName="mw-100"
                className={`text-capitalize ${styles.checkbox}`}
                legend={option.total}
                label={option.name}
                checked={isChecked(option.id.toString())}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
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
    if (!isUndefined(repo) && repo.options.length > 0 && repo.filterKey) {
      const options = repo.options.map((facet: FacetOption) => ({
        ...facet,
        filterKey: repo.filterKey,
      }));

      const isChecked = (facetOptionId: string) => {
        return (props.activeFilters.repo || []).includes(facetOptionId.toString());
      };

      const repoOptions = options.map((option: FacetOption) => (
        <CheckBox
          key={`repo_${option.id.toString()}`}
          name={repo.filterKey!}
          device={props.device}
          value={option.id.toString()}
          labelClassName="mw-100"
          className={styles.checkbox}
          legend={option.total}
          label={option.name}
          checked={isChecked(option.id.toString())}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            props.onChange(e.target.name, e.target.value, e.target.checked)
          }
        />
      ));

      crElement = (
        <div role="menuitem" className={`mt-2 mt-sm-3 pt-1 ${styles.facet}`}>
          <SmallTitle text={repo.title} className="text-dark fw-bold" id={`pkg-${repo.filterKey}-${props.device}`} />
          <div className="mt-3" role="group" aria-labelledby={`pkg-${repo.filterKey}-${props.device}`}>
            <ExpandableList visibleItems={5} items={repoOptions} forceCollapseList={props.forceCollapseList} />
          </div>
        </div>
      );
    }

    return crElement;
  };

  const getLicenseFacets = (): JSX.Element | null => {
    let crElement = null;
    const license = getFacetsByFilterKey('license');
    if (!isUndefined(license) && license.options.length > 0 && license.filterKey) {
      const options = license.options.map((facet: FacetOption) => ({
        ...facet,
        filterKey: license.filterKey,
      }));

      const isChecked = (facetOptionId: string) => {
        return (props.activeFilters.license || []).includes(facetOptionId.toString());
      };

      const licenseOptions = options.map((option: FacetOption) => (
        <CheckBox
          key={`license_${option.id.toString()}`}
          name={license.filterKey!}
          device={props.device}
          value={option.id.toString()}
          labelClassName="mw-100"
          className={`text-capitalize ${styles.checkbox}`}
          legend={option.total}
          label={option.name}
          checked={isChecked(option.id.toString())}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            props.onChange(e.target.name, e.target.value, e.target.checked)
          }
        />
      ));

      crElement = (
        <div role="menuitem" className={`mt-2 mt-sm-3 pt-1 ${styles.facet}`}>
          <SmallTitle
            text={license.title}
            className="text-dark fw-bold"
            id={`pkg-${license.filterKey}-${props.device}`}
          />
          <div className="mt-3" role="group" aria-labelledby={`pkg-${license.filterKey}-${props.device}`}>
            <ExpandableList visibleItems={5} items={licenseOptions} forceCollapseList={props.forceCollapseList} />
          </div>
        </div>
      );
    }

    return crElement;
  };

  return (
    <div className={classnames(styles.filters, { 'pt-2 mt-3 mb-5': props.visibleTitle })}>
      {props.visibleTitle && (
        <div className="d-flex flex-row align-items-center justify-content-between pb-2 mb-4 border-bottom">
          <div className="h6 text-uppercase mb-0 lh-base">Filters</div>
          {(!isEmpty(props.activeFilters) ||
            props.deprecated ||
            props.operators ||
            props.verifiedPublisher ||
            props.official ||
            !isEmpty(props.activeTsQuery)) && (
            <div className={`d-flex align-items-center ${styles.resetBtnWrapper}`}>
              <IoMdCloseCircleOutline className={`text-dark ${styles.resetBtnDecorator}`} />
              <button
                className={`btn btn-link btn-sm p-0 ps-1 text-dark ${styles.resetBtn}`}
                onClick={props.onResetFilters}
                aria-label="Reset filters"
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
          device={props.device}
          className={styles.checkbox}
          labelClassName="mw-100"
          label="Official"
          checked={props.official || false}
          onChange={props.onOfficialChange}
        />

        <div className="d-none d-md-block">
          <ElementWithTooltip
            tooltipClassName={styles.tooltipMessage}
            className={`position-relative ${styles.tooltipIcon}`}
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
          device={props.device}
          className={styles.checkbox}
          labelClassName="mw-100"
          label="Verified publishers"
          checked={props.verifiedPublisher || false}
          onChange={props.onVerifiedPublisherChange}
        />

        <div className="d-none d-md-block">
          <ElementWithTooltip
            tooltipClassName={styles.tooltipMessage}
            className={styles.tooltipIcon}
            element={<MdInfoOutline />}
            tooltipMessage="The publisher owns the repository"
            visibleTooltip
            active
          />
        </div>
      </div>

      {getKindFacets()}
      <TsQuery device={props.device} active={props.activeTsQuery || []} onChange={props.onTsQueryChange} />
      {getPublishers()}
      {getRepositoryFacets()}
      {getLicenseFacets()}
      {getCapabilitiesFacets()}

      <div role="menuitem" className={`mt-2 mt-sm-3 pt-1 ${styles.facet}`}>
        <SmallTitle text="Others" className="text-dark fw-bold" />

        <div className="mt-3">
          <CheckBox
            name="operators"
            value="operators"
            device={props.device}
            labelClassName="mw-100"
            className={styles.checkbox}
            label="Only operators"
            checked={props.operators || false}
            onChange={props.onOperatorsChange}
          />

          <CheckBox
            name="deprecated"
            value="deprecated"
            device={props.device}
            className={styles.checkbox}
            label="Include deprecated"
            labelClassName="mw-100"
            checked={props.deprecated || false}
            onChange={props.onDeprecatedChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Filters;
