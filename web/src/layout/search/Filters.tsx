import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { ChangeEvent } from 'react';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { MdInfoOutline } from 'react-icons/md';

import { FacetOption, Facets } from '../../types';
import { OPERATOR_CAPABILITIES } from '../../utils/data';
import CheckBox from '../common/Checkbox';
import ElementWithTooltip from '../common/ElementWithTooltip';
import ExpandableList from '../common/ExpandableList';
import SmallTitle from '../common/SmallTitle';
import styles from './Filters.module.css';

interface Props {
  forceCollapseList: boolean;
  activeFilters: {
    [key: string]: string[];
  };
  facets?: Facets[] | null;
  visibleTitle: boolean;
  onChange: (name: string, value: string, checked: boolean) => void;
  onResetSomeFilters: (filterKeys: string[]) => void;
  onDeprecatedChange: () => void;
  onOperatorsChange: () => void;
  onVerifiedPublisherChange: () => void;
  onCNCFChange: () => void;
  onOfficialChange: () => void;
  onResetFilters: () => void;
  deprecated?: boolean | null;
  operators?: boolean | null;
  verifiedPublisher?: boolean | null;
  cncf?: boolean | null;
  official?: boolean | null;
  device: string;
}

const Filters = (props: Props) => {
  const getFacetsByFilterKey = (filterKey: string): Facets | undefined => {
    return find(props.facets, (facets: Facets) => filterKey === facets.filterKey);
  };

  const getKindFacets = (): JSX.Element | null => {
    let kindElement = null;
    const kind = getFacetsByFilterKey('kind');
    if (!isUndefined(kind) && kind.options.length > 0 && kind.filterKey) {
      const active = !isUndefined(props.activeFilters[kind.filterKey]) ? props.activeFilters[kind.filterKey] : [];
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
                labelClassName="mw-100 text-muted"
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

  const getCategoriesFacets = (): JSX.Element | null => {
    let categoryElement = null;
    const categories = getFacetsByFilterKey('category');
    if (!isUndefined(categories) && categories.options.length > 0 && categories.filterKey) {
      const active = !isUndefined(props.activeFilters[categories.filterKey])
        ? props.activeFilters[categories.filterKey]
        : [];
      const isChecked = (facetOptionId: string) => {
        return active.includes(facetOptionId.toString());
      };

      categoryElement = (
        <div role="menuitem" className={`mt-1 mt-sm-2 pt-1 ${styles.facet}`}>
          <SmallTitle
            text={categories.title}
            className="text-dark fw-bold"
            id={`repo-${categories.filterKey}-${props.device}`}
          />
          <div className="mt-3" role="group" aria-labelledby={`repo-${categories.filterKey}-${props.device}`}>
            {categories.options.map((option: FacetOption) => (
              <CheckBox
                key={`kind_${option.id.toString()}`}
                name={categories.filterKey!}
                device={props.device}
                value={option.id.toString()}
                labelClassName="mw-100 text-muted"
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

    return categoryElement;
  };

  const getCapabilitiesFacets = (): JSX.Element | null => {
    let element = null;
    const capabilities = getFacetsByFilterKey('capabilities');
    if (!isUndefined(capabilities) && capabilities.options.length > 0 && capabilities.filterKey) {
      const active = !isUndefined(props.activeFilters[capabilities.filterKey])
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
                labelClassName="mw-100 text-muted"
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
          labelClassName="mw-100 text-muted"
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
    <div className={styles.filters}>
      {props.visibleTitle && (
        <div className="d-flex flex-row align-items-center justify-content-between pb-2 mb-4 border-bottom border-1">
          <div className="h6 text-uppercase mb-0 lh-base">Filters</div>
          {(!isEmpty(props.activeFilters) ||
            props.deprecated ||
            props.operators ||
            props.verifiedPublisher ||
            props.cncf ||
            props.official) && (
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
          labelClassName="mw-100 text-muted"
          label="Official"
          checked={props.official || false}
          onChange={props.onOfficialChange}
        />

        <div className="d-none d-md-block">
          <ElementWithTooltip
            tooltipClassName={styles.tooltipMessage}
            className={`position-relative ${styles.tooltipIcon}`}
            element={<MdInfoOutline />}
            tooltipMessage="The publisher owns the software a package primarily focuses on"
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
          labelClassName="mw-100 text-muted"
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

      <div className="d-flex flex-row align-items-baseline">
        <CheckBox
          name="cncf"
          value="cncf"
          device={props.device}
          className={styles.checkbox}
          labelClassName="mw-100 text-muted"
          label="CNCF"
          checked={props.cncf || false}
          onChange={props.onCNCFChange}
        />

        <div className="d-none d-md-block">
          <ElementWithTooltip
            tooltipClassName={styles.tooltipMessage}
            className={styles.tooltipIcon}
            element={<MdInfoOutline />}
            tooltipMessage="The package has been published by a CNCF project"
            visibleTooltip
            active
          />
        </div>
      </div>

      {getKindFacets()}
      {getCategoriesFacets()}
      {getLicenseFacets()}
      {getCapabilitiesFacets()}

      <div role="menuitem" className={`mt-2 mt-sm-3 pt-1 ${styles.facet}`}>
        <SmallTitle text="Others" className="text-dark fw-bold" />

        <div className="mt-3">
          <CheckBox
            name="operators"
            value="operators"
            device={props.device}
            labelClassName="mw-100 text-muted"
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
            labelClassName="mw-100 text-muted"
            checked={props.deprecated || false}
            onChange={props.onDeprecatedChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Filters;
