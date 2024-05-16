import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { FiSearch } from 'react-icons/fi';

import API from '../../api';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Package } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import Image from './Image';
import Loading from './Loading';
import RepositoryIcon from './RepositoryIcon';
import styles from './SearchPackages.module.css';

interface Props {
  label: string;
  disabledPackages: string[];
  onSelection: (packageItem: Package) => void;
}

const DEFAULT_LIMIT = 20;
const SEARCH_DELAY = 3 * 100; // 300ms
const MIN_CHARACTERS_SEARCH = 2;
const ITEM_HEIGHT = 41;

const SearchPackages = (props: Props) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef(null);
  const itemsWrapper = useRef<HTMLDivElement | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<number | null>(null);

  useOutsideClick([dropdownRef], !isNull(packages), () => setPackages(null));

  async function searchPackages(tsQueryWeb: string) {
    try {
      setIsSearching(true);
      const searchResults = await API.searchPackages(
        {
          tsQueryWeb: tsQueryWeb,
          filters: {},
          limit: DEFAULT_LIMIT,
          offset: 0,
        },
        false
      );
      setPackages(searchResults.packages);
      setIsSearching(false);
    } catch {
      setPackages(null);
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'An error occurred searching packages, please try again later.',
      });
      setIsSearching(false);
    }
  }

  const handleOnKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
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
          const selectedPkg = packages[highlightedItem];
          if (selectedPkg && !props.disabledPackages.includes(selectedPkg.packageId)) {
            saveSelectedPackage(selectedPkg);
          }
        }
        return;
      default:
        return;
    }
  };

  const updateHighlightedItem = (arrow: 'up' | 'down') => {
    if (!isNull(packages) && packages.length > 0) {
      if (!isNull(highlightedItem)) {
        let newIndex: number = arrow === 'up' ? highlightedItem - 1 : highlightedItem + 1;
        if (newIndex > packages.length - 1) {
          newIndex = 0;
        }
        if (newIndex < 0) {
          newIndex = packages.length - 1;
        }
        scrollDropdown(newIndex);
        setHighlightedItem(newIndex);
      } else {
        const newIndex = arrow === 'up' ? packages.length - 1 : 0;
        scrollDropdown(newIndex);
        setHighlightedItem(newIndex);
      }
    }
  };

  const saveSelectedPackage = (item: Package): void => {
    setPackages(null);
    setSearchQuery('');
    inputEl.current!.value = '';
    props.onSelection(item);
    setHighlightedItem(null);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (packages) {
      setPackages(null);
      setHighlightedItem(null);
    }
  };

  const cleanTimeout = () => {
    if (!isNull(dropdownTimeout)) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
  };

  const cleanSearch = () => {
    setPackages(null);
    setSearchQuery('');
  };

  const scrollDropdown = (index: number) => {
    if (itemsWrapper && itemsWrapper.current) {
      const itemsOnScreen = Math.floor(itemsWrapper.current.clientHeight / ITEM_HEIGHT) - 1;
      if (index + 1 > itemsOnScreen) {
        itemsWrapper.current.scroll(0, (index - itemsOnScreen) * ITEM_HEIGHT);
      } else {
        itemsWrapper.current.scroll(0, 0);
      }
    }
  };

  const forceFocus = (): void => {
    if (!isNull(inputEl) && !isNull(inputEl.current)) {
      inputEl.current.focus();
    }
  };

  useEffect(() => {
    const isInputFocused = inputEl.current === document.activeElement;
    if (searchQuery.length >= MIN_CHARACTERS_SEARCH && isInputFocused) {
      cleanTimeout();
      setDropdownTimeout(
        setTimeout(() => {
          searchPackages(searchQuery);
        }, SEARCH_DELAY)
      );
    } else {
      cleanSearch();
    }

    return () => {
      if (!isNull(dropdownTimeout)) {
        clearTimeout(dropdownTimeout);
      }
    };
  }, [searchQuery]);

  return (
    <div className="position-relative">
      <div className="d-flex flex-row">
        <div
          className={`flex-grow-1 d-flex align-items-stretch overflow-hidden position-relative lh-base bg-white searchBar ${styles.inputWrapper}`}
        >
          <div
            data-testid="searchPkgIcon"
            className={`d-flex align-items-center ${styles.iconWrapper}`}
            onClick={forceFocus}
          >
            <FiSearch />
          </div>

          <input
            ref={inputEl}
            type="text"
            className={`flex-grow-1 pe-4 ps-2 ps-md-0 border-0 shadow-none bg-transparent ${styles.input}`}
            name="searchInput"
            autoComplete="new-input"
            onKeyDown={handleOnKeyDown}
            onChange={onChange}
            spellCheck="false"
            aria-label="Search packages"
          />

          {isSearching && (
            <div className={`position-absolute ${styles.loading}`}>
              <Loading data-testid="searchBarSpinning" noWrapper smallSize />
            </div>
          )}
        </div>
      </div>

      {!isNull(packages) && (
        <div ref={dropdownRef} className={`dropdown-menu w-100 p-0 shadow-sm show overflow-hidden ${styles.dropdown}`}>
          {packages.length === 0 ? (
            <p className="m-3 text-center">
              We can't seem to find any packages that match your search for{' '}
              <span className="fw-bold">{searchQuery}</span>
            </p>
          ) : (
            <div className={`overflow-scroll ${styles.tableWrapper}`} ref={itemsWrapper}>
              <table
                className={`table table-hover table-sm mb-0 tex-break ${styles.table}`}
                role="grid"
                aria-labelledby={props.label}
              >
                <thead>
                  <tr>
                    <th scope="col" className={`${styles.fitCell} d-none d-sm-table-cell`}></th>
                    <th scope="col" className="w-50">
                      Package
                    </th>
                    <th scope="col" className="w-50">
                      Publisher
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((item: Package, index: number) => {
                    const isDisabled = props.disabledPackages.includes(item.packageId);

                    return (
                      <tr
                        data-testid="packageItem"
                        role="button"
                        className={classnames(
                          { [styles.clickableCell]: !isDisabled },
                          { [styles.disabledCell]: isDisabled },
                          { [styles.activeCell]: index === highlightedItem }
                        )}
                        onClick={() => {
                          if (!isDisabled) {
                            saveSelectedPackage(item);
                          }
                        }}
                        key={`search_${item.packageId}`}
                        onMouseOver={() => setHighlightedItem(index)}
                        onMouseOut={() => setHighlightedItem(null)}
                      >
                        <td className="align-middle text-center d-none d-sm-table-cell">
                          <RepositoryIcon kind={item.repository.kind} className={`mx-2 w-auto ${styles.icon}`} />
                        </td>
                        <td className="align-middle">
                          <div className="d-flex flex-row align-items-center">
                            <div
                              className={`d-none d-sm-flex align-items-center justify-content-center overflow-hidden ${styles.imageWrapper}`}
                            >
                              <Image
                                imageId={item.logoImageId}
                                alt={`Logo ${item.displayName || item.name}`}
                                className={`fs-4 ${styles.image}`}
                                kind={item.repository.kind}
                              />
                            </div>

                            <div className="text-dark ms-2">{item.displayName || item.name}</div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="text-dark">
                            {item.repository.userAlias ||
                              item.repository.organizationDisplayName ||
                              item.repository.organizationName}
                            <small className="ms-2 d-none d-sm-inline">
                              (
                              <small className={`text-uppercase d-none d-md-inline text-muted ${styles.legend}`}>
                                Repo:{' '}
                              </small>
                              {item.repository.displayName || item.repository.name})
                            </small>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPackages;
