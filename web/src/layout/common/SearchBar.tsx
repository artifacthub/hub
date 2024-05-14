import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { FaRegQuestionCircle } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import API from '../../api';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import isPackageOfficial from '../../utils/isPackageOfficial';
import { prepareQueryString } from '../../utils/prepareQueryString';
import Official from './badges/Official';
import Signed from './badges/Signed';
import VerifiedPublisher from './badges/VerifiedPublisher';
import HoverableItem from './HoverableItem';
import Image from './Image';
import Loading from './Loading';
import RepositoryIconLabel from './RepositoryIconLabel';
import styles from './SearchBar.module.css';
import StarBadge from './StarBadge';

interface Props {
  formClassName?: string;
  tsQueryWeb?: string;
  size: 'big' | 'normal';
  isSearching: boolean;
  openTips: boolean;
  setOpenTips: (status: boolean) => void;
  autoFocus?: boolean;
}

const SEARCH_DELAY = 3 * 100; // 300ms
const MIN_CHARACTERS_SEARCH = 2;

const SearchBar = (props: Props) => {
  const navigate = useNavigate();
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

  const onChange = (e: ChangeEvent<HTMLInputElement>): void => {
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

    navigate({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        tsQueryWeb: value || undefined,
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

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
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
    navigate({
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
      const total = parseInt(searchResults.paginationTotalCount);
      if (total > 0) {
        const isInputFocused = inputEl.current === document.activeElement;
        // We have to be sure that input has focus to display results
        if (isInputFocused) {
          setPackages(searchResults.packages);
          setTotalPackagesNumber(total);
          setVisibleDropdown(true);
        } else {
          cleanSearch();
        }
      } else {
        cleanSearch();
      }
    } catch {
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
  }, [value]);

  return (
    <>
      <div className={`position-relative ${props.formClassName}`}>
        <div
          className={`d-flex align-items-center overflow-hidden searchBar lh-base bg-white ${styles.searchBar} ${
            styles[props.size]
          }`}
          role="combobox"
          aria-haspopup="listbox"
          aria-owns="search-list"
          aria-expanded={visibleDropdown && !isNull(packages)}
          aria-controls="search-list"
        >
          <div
            data-testid="searchBarIcon"
            className={`d-flex align-items-center ${styles.iconWrapper}`}
            onClick={forceFocus}
          >
            <FiSearch />
          </div>

          <input
            ref={inputEl}
            className={`flex-grow-1 ps-2 ps-md-0 border-0 shadow-none bg-transparent ${styles.input}`}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            placeholder="Search packages"
            aria-label="Search packages"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            disabled={props.isSearching}
            autoFocus={point && !['xs', 'sm'].includes(point) ? props.autoFocus : false} // Disable autofoucs for small devices
          />

          <div className="d-none" tabIndex={0}>
            <div aria-live="polite">{!isNull(packages) ? `${packages.length} results found` : ''}</div>
          </div>

          {props.isSearching && (
            <div
              data-testid="searchBarSpinning"
              className={classnames('position-absolute text-secondary', styles.loading, {
                [styles.bigLoading]: props.size === 'big',
              })}
            >
              <Loading noWrapper smallSize />
            </div>
          )}

          <button
            type="button"
            className={classnames('btn-close lh-lg ps-2 pe-3', styles.inputClean, {
              invisible: value === '' || props.isSearching,
            })}
            onClick={cleanSearchBox}
            aria-label="Close"
          ></button>

          <div
            className={classnames('d-none d-sm-block position-absolute text-dark', styles.tipIcon, {
              [styles.bigTipIcon]: props.size === 'big',
            })}
          >
            <button
              onClick={() => props.setOpenTips(true)}
              className={classnames('btn btn-link p-2 text-light', {
                'btn-lg': props.size === 'big',
              })}
              aria-label="Open search tips modal"
            >
              <FaRegQuestionCircle />
            </button>
          </div>
        </div>

        {visibleDropdown && !isNull(packages) && (
          <div
            ref={dropdownRef}
            className={`dropdown-menu dropdown-menu-left p-0 shadow-sm w-100 show noFocus ${styles.dropdown}`}
            role="listbox"
            id="search-list"
            aria-activedescendant={highlightedItem ? `sl-opt${highlightedItem}` : ''}
            tabIndex={0}
            aria-roledescription="Packages list"
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
                          'btn btn-link w-100 border-bottom border-1 rounded-0 d-flex flex-row align-items-stretch text-decoration-none text-dark p-3',
                          { [styles.activeDropdownItem]: index === highlightedItem }
                        )}
                        onClick={() => {
                          goToPackage(pkg);
                        }}
                        aria-label={`Open package ${pkg.displayName || pkg.name} detail`}
                        role="option"
                        aria-selected={index === highlightedItem}
                        id={`sl-opt${index}`}
                      >
                        <div
                          className={`d-none d-md-flex align-items-center justify-content-center overflow-hidden position-relative ${styles.imageWrapper}`}
                        >
                          <Image
                            imageId={pkg.logoImageId}
                            alt={`Logo ${pkg.displayName || pkg.name}`}
                            className={styles.image}
                            kind={pkg.repository.kind}
                          />
                        </div>

                        <div className={`ms-0 ms-md-3 flex-grow-1 ${styles.truncateWrapper}`}>
                          <div className="d-flex flex-row align-items-center">
                            <div className={`text-truncate fw-bold mt-1 ${styles.title}`}>
                              {pkg.displayName || pkg.name}
                            </div>

                            <div
                              className={`align-self-start d-flex align-items-center text-uppercase ms-auto ps-2 ${styles.midText}`}
                            >
                              <StarBadge className="me-1" starsNumber={pkg.stars} />
                              <RepositoryIconLabel kind={pkg.repository.kind} iconClassName={styles.kindIcon} />
                            </div>
                          </div>

                          <div className="d-flex flex-row align-items-center mt-2">
                            <div className={`text-truncate text-start ${styles.smallText}`}>
                              <small className="text-muted text-uppercase">
                                {pkg.repository.userAlias ? 'User' : 'Org'}:
                              </small>
                              <span className="ms-1 me-2">
                                {pkg.repository.userAlias ||
                                  pkg.repository.organizationDisplayName ||
                                  pkg.repository.organizationName}
                              </span>

                              <small className="text-muted text-uppercase">Repo:</small>
                              <span className="text-truncate ms-1">{pkg.repository.name}</span>
                            </div>

                            <div className="ms-auto d-flex flex-nowrap ps-2">
                              <Signed
                                signed={pkg.signed}
                                repoKind={pkg.repository.kind}
                                className="d-inline ms-1"
                                noDropdown
                                smallSize
                              />
                              <VerifiedPublisher
                                verifiedPublisher={pkg.repository.verifiedPublisher}
                                className="d-inline ms-1"
                                noDropdown
                                smallSize
                              />
                              <Official
                                official={isPackageOfficial(pkg)}
                                className="d-inline ms-1"
                                noDropdown
                                smallSize
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
                    className={classnames('btn btn-link w-100 text-dark p-2', styles.dropdownItem, {
                      [styles.activeDropdownItem]: packages.length === highlightedItem,
                    })}
                    onClick={goToSearch}
                    aria-label="See all results"
                    role="option"
                    aria-selected={packages.length === highlightedItem}
                    id={`sl-opt${packages.length}`}
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
