import classnames from 'classnames';
import isNull from 'lodash/isNull';
import React, { useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';

import { API } from '../../api';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Package } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import Image from './Image';
import RepositoryIcon from './RepositoryIcon';
import styles from './SearchPackages.module.css';

interface Props {
  disabledPackages: string[];
  onSelection: (packageItem: Package) => void;
}

const SearchPackages = (props: Props) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  useOutsideClick([dropdownRef], !isNull(packages), () => setPackages(null));

  async function searchPackages(tsQueryWeb: string) {
    try {
      setIsSearching(true);
      const searchResults = await API.searchPackages(
        {
          tsQueryWeb: tsQueryWeb,
          filters: {},
          limit: 20,
          offset: 0,
        },
        false
      );
      setPackages(searchResults.data.packages);
      setIsSearching(false);
    } catch (err) {
      setPackages(null);
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'An error occurred searching packages, please try again later.',
      });
      setIsSearching(false);
    }
  }

  const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && searchQuery !== '') {
      event.preventDefault();
      event.stopPropagation();
      searchPackages(searchQuery);
      inputEl.current!.blur();
    }
  };

  const saveSelectedPackage = (item: Package): void => {
    setPackages(null);
    setSearchQuery('');
    inputEl.current!.value = '';
    props.onSelection(item);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (packages) {
      setPackages(null);
    }
  };

  return (
    <div className="position-relative">
      <div className="d-flex flex-row">
        <div
          className={`flex-grow-1 d-flex align-items-strecht overflow-hidden position-relative ${styles.inputWrapper}`}
        >
          <input
            data-testid="searchPackagesInput"
            ref={inputEl}
            type="text"
            className={`flex-grow-1 px-3 ${styles.input}`}
            name="searchInput"
            autoComplete="new-input"
            onKeyDown={handleOnKeyDown}
            onChange={onChange}
            spellCheck="false"
          />

          {isSearching && (
            <div className={`position-absolute text-secondary ${styles.loading}`}>
              <span data-testid="searchBarSpinning" className="spinner-border spinner-border-sm" />
            </div>
          )}
        </div>

        <button
          data-testid="searchIconBtn"
          type="button"
          className={`btn btn-secondary ml-3 text-center p-0 ${styles.searchBtn}`}
          disabled={searchQuery === '' || isSearching}
          onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            if (searchQuery !== '') {
              searchPackages(searchQuery);
            }
          }}
        >
          <FaSearch />
        </button>
      </div>

      {!isNull(packages) && (
        <div ref={dropdownRef} className={`dropdown-menu w-100 p-0 shadow-sm show ${styles.dropdown}`}>
          {packages.length === 0 ? (
            <p className="m-3 text-center">
              We can't seem to find any packages that match your search for{' '}
              <span className="font-weight-bold">{searchQuery}</span>
            </p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={`table table-hover table-sm mb-0 ${styles.table}`}>
                <thead>
                  <tr>
                    <th scope="col" className={`${styles.fitCell} d-none d-sm-table-cell border-top-0`}></th>
                    <th scope="col" className="w-50 border-top-0">
                      Package
                    </th>
                    <th scope="col" className="w-50 border-top-0">
                      Publisher
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((item: Package) => {
                    const isDisabled = props.disabledPackages.includes(item.packageId);

                    return (
                      <tr
                        data-testid="packageItem"
                        role="button"
                        className={classnames(
                          { [styles.clickableCell]: !isDisabled },
                          { [styles.disabledCell]: isDisabled }
                        )}
                        onClick={() => {
                          if (!isDisabled) {
                            saveSelectedPackage(item);
                          }
                        }}
                        key={`search_${item.packageId}`}
                      >
                        <td className="align-middle text-center d-none d-sm-table-cell">
                          <RepositoryIcon kind={item.repository.kind} className={`mx-2 ${styles.icon}`} />
                        </td>
                        <td className="align-middle">
                          <div className="d-flex flex-row align-items-center">
                            <div
                              className={`d-none d-sm-flex align-items-center justify-content-center overflow-hidden ${styles.imageWrapper} imageWrapper`}
                            >
                              <Image
                                imageId={item.logoImageId}
                                alt={`Logo ${item.displayName || item.name}`}
                                className={styles.image}
                                kind={item.repository.kind}
                              />
                            </div>

                            <div className="text-dark ml-2">{item.displayName || item.name}</div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="text-dark">
                            {item.repository.userAlias ||
                              item.repository.organizationDisplayName ||
                              item.repository.organizationName}
                            <small className="ml-2 d-none d-sm-inline">
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
