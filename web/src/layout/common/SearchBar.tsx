import classnames from 'classnames';
import isNull from 'lodash/isNull';
import React, { useEffect, useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useHistory } from 'react-router-dom';

import { API } from '../../api';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import isPackageOfficial from '../../utils/isPackageOfficial';
import prepareQueryString from '../../utils/prepareQueryString';
import HoverableItem from './HoverableItem';
import Image from './Image';
import OfficialBadge from './OfficialBadge';
import RepositoryIconLabel from './RepositoryIconLabel';
import styles from './SearchBar.module.css';
import SearchTipsModal from './SearchTipsModal';
import SecurityRating from './SecutityRating';
import StarBadge from './StarBadge';
import VerifiedPublisherBadge from './VerifiedPublisherBadge';

interface Props {
  formClassName?: string;
  tsQueryWeb?: string;
  size: 'big' | 'normal';
  isSearching: boolean;
}

const SEARCH_DELAY = 5 * 100; // 500ms
const MIN_CHARACTERS_SEARCH = 3;

const SearchBar = (props: Props) => {
  const history = useHistory();
  const dropdownRef = useRef(null);
  const [value, setValue] = useState(props.tsQueryWeb || '');
  const inputEl = useRef<HTMLInputElement>(null);
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [totalPackagesNumber, setTotalPackagesNumber] = useState<number | null>(null);
  const [visibleDropdown, setVisibleDropdown] = useState<boolean>(false);
  const point = useBreakpointDetect();
  const [highlightedItem, setHighlightedItem] = useState<number | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);

  useOutsideClick([dropdownRef], visibleDropdown, () => {
    cleanSearch();
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setValue(e.target.value);
  };

  const cleanSearchBox = (): void => {
    setValue('');
    forceFocus();
  };

  const forceFocus = (): void => {
    if (!isNull(inputEl) && !isNull(inputEl.current)) {
      inputEl.current.focus();
    }
  };

  const forceBlur = (): void => {
    if (!isNull(inputEl) && !isNull(inputEl.current)) {
      inputEl.current.blur();
    }
  };

  const goToSearch = () => {
    cleanTimeout();
    forceBlur();
    cleanSearch();

    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        tsQueryWeb: value || undefined,
        filters: {},
      }),
    });
  };

  const cleanTimeout = () => {
    if (!isNull(dropdownTimeout)) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
  };

  const cleanSearch = () => {
    setPackages(null);
    setTotalPackagesNumber(null);
    setVisibleDropdown(false);
    setHighlightedItem(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    switch (e.key) {
      case 'Escape':
        cleanSearch();
        return;
      case 'ArrowDown':
        updateHighlightedItem('down');
        return;
      case 'ArrowUp':
        updateHighlightedItem('up');
        return;
      case 'Enter':
        e.preventDefault();
        if (!isNull(packages) && !isNull(highlightedItem)) {
          if (highlightedItem === packages.length) {
            goToSearch();
          } else {
            const selectedPackage = packages[highlightedItem];
            if (selectedPackage) {
              goToPackage(selectedPackage);
            }
          }
        } else {
          goToSearch();
        }
        return;
      default:
        return;
    }
  };

  const updateHighlightedItem = (arrow: 'up' | 'down') => {
    if (!isNull(packages) && visibleDropdown) {
      if (!isNull(highlightedItem)) {
        let newIndex: number = arrow === 'up' ? highlightedItem - 1 : highlightedItem + 1;
        if (newIndex > packages.length) {
          newIndex = 0;
        }
        if (newIndex < 0) {
          newIndex = packages.length;
        }
        setHighlightedItem(newIndex);
      } else {
        if (packages && packages.length > 0) {
          const newIndex = arrow === 'up' ? packages.length : 0; // We don't subtract 1 because See all results (x) has to be count
          setHighlightedItem(newIndex);
        }
      }
    }
  };
  const goToPackage = (selectedPackage: Package) => {
    forceBlur();
    setValue('');
    cleanSearch();
    history.push({
      pathname: buildPackageURL(selectedPackage.normalizedName, selectedPackage.repository, selectedPackage.version!),
    });
  };

  useEffect(() => {
    setValue(props.tsQueryWeb || '');
  }, [props.tsQueryWeb]);

  async function searchPackages() {
    try {
      const searchResults = await API.searchPackages(
        {
          tsQueryWeb: value,
          filters: {},
          limit: 5,
          offset: 0,
        },
        false
      );
      if (searchResults.metadata.total > 0) {
        setPackages(searchResults.data.packages);
        setTotalPackagesNumber(searchResults.metadata.total);
        setVisibleDropdown(true);
      } else {
        cleanSearch();
      }
    } catch (err) {
      cleanSearch();
    }
  }

  useEffect(() => {
    // Don't display search options for mobile devices
    if (point !== 'xs') {
      const isInputFocused = inputEl.current === document.activeElement;
      if (value.length >= MIN_CHARACTERS_SEARCH && isInputFocused) {
        cleanTimeout();
        setDropdownTimeout(
          setTimeout(() => {
            setHighlightedItem(null);
            searchPackages();
          }, SEARCH_DELAY)
        );
      } else {
        cleanSearch();
      }
    }

    return () => {
      if (!isNull(dropdownTimeout)) {
        clearTimeout(dropdownTimeout);
      }
    };
  }, [value]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <div className={`position-relative ${props.formClassName}`}>
        <div
          className={`d-flex align-items-strecht overflow-hidden searchBar ${styles.searchBar} ${styles[props.size]}`}
        >
          <div
            data-testid="searchBarIcon"
            className={`d-none d-sm-flex align-items-center ${styles.iconWrapper}`}
            onClick={forceFocus}
          >
            <FiSearch />
          </div>

          <input
            ref={inputEl}
            className={`flex-grow-1 pl-sm-0 pl-3 ${styles.input}`}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            placeholder="Search packages"
            aria-label="Search"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            disabled={props.isSearching}
          />

          {props.isSearching && (
            <div
              className={classnames('position-absolute text-secondary', styles.loading, {
                [styles.bigLoading]: props.size === 'big',
              })}
            >
              <span data-testid="searchBarSpinning" className="spinner-border spinner-border-sm" />
            </div>
          )}

          <button
            data-testid="cleanBtn"
            type="button"
            className={classnames('close', styles.inputClean, { invisible: value === '' || props.isSearching })}
            aria-label="Close"
            onClick={cleanSearchBox}
          >
            <span aria-hidden="true">&times;</span>
          </button>

          <SearchTipsModal size={props.size} />
        </div>

        {visibleDropdown && !isNull(packages) && (
          <div
            ref={dropdownRef}
            className={`dropdown-menu dropdown-menu-left p-0 shadow-sm w-100 show ${styles.dropdown}`}
          >
            <HoverableItem onLeave={() => setHighlightedItem(null)}>
              <>
                {packages.map((pkg: Package, index: number) => {
                  return (
                    <HoverableItem
                      key={`pkg_${pkg.packageId}`}
                      onHover={() => setHighlightedItem(index)}
                      onLeave={() => setHighlightedItem(null)}
                    >
                      <button
                        type="button"
                        className={classnames(
                          'btn btn-link btn-block border-bottom d-flex flex-row align-items-stretch text-decoration-none text-dark',
                          styles.dropdownItem,
                          { [styles.activeDropdownItem]: index === highlightedItem }
                        )}
                        onClick={() => {
                          goToPackage(pkg);
                        }}
                      >
                        <div
                          className={`d-none d-md-flex align-items-center justify-content-center overflow-hidden rounded-circle p-1 ${styles.imageWrapper} imageWrapper`}
                        >
                          <Image
                            imageId={pkg.logoImageId}
                            alt={`Logo ${pkg.displayName || pkg.name}`}
                            className={styles.image}
                            kind={pkg.repository.kind}
                          />
                        </div>

                        <div className={`ml-0 ml-md-3 flex-grow-1 ${styles.truncateWrapper}`}>
                          <div className="d-flex flex-row align-items-center">
                            <div className={`text-truncate font-weight-bold ${styles.title}`}>
                              {pkg.displayName || pkg.name}
                            </div>

                            <div
                              className={`align-self-start d-flex align-items-center text-uppercase ml-auto pl-2 ${styles.midText}`}
                            >
                              <StarBadge className="mr-1" starsNumber={pkg.stars} />
                              <RepositoryIconLabel kind={pkg.repository.kind} />
                            </div>
                          </div>

                          <div className="d-flex flex-row align-items-center mt-2">
                            <div className={`text-truncate ${styles.smallText}`}>
                              <small className="text-muted text-uppercase">
                                {pkg.repository.userAlias ? 'User' : 'Org'}:
                              </small>
                              <span className="ml-1 mr-2">
                                {pkg.repository.userAlias ||
                                  pkg.repository.organizationDisplayName ||
                                  pkg.repository.organizationName}
                              </span>

                              <small className="text-muted text-uppercase">Repo:</small>
                              <span className="text-truncate ml-1">{pkg.repository.name}</span>
                            </div>

                            <div className={`ml-auto d-flex flex-nowrap pl-2 ${styles.labelsWrapper}`}>
                              <OfficialBadge
                                official={isPackageOfficial(pkg)}
                                className="d-inline"
                                type="package"
                                withoutTooltip
                                onlyIcon
                              />
                              <VerifiedPublisherBadge
                                verifiedPublisher={pkg.repository.verifiedPublisher}
                                className="d-inline"
                                withoutTooltip
                                onlyIcon
                              />
                              <SecurityRating
                                summary={pkg.securityReportSummary}
                                className="d-inline"
                                onlyBadge={false}
                                withoutTooltip
                                onlyIcon
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    </HoverableItem>
                  );
                })}

                <HoverableItem
                  onHover={() => setHighlightedItem(packages.length)}
                  onLeave={() => setHighlightedItem(null)}
                >
                  <button
                    type="button"
                    className={classnames('btn btn-lint btn-block text-dark p-2', styles.dropdownItem, {
                      [styles.activeDropdownItem]: packages.length === highlightedItem,
                    })}
                    onClick={goToSearch}
                  >
                    See all results ({totalPackagesNumber})
                  </button>
                </HoverableItem>
              </>
            </HoverableItem>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchBar;
