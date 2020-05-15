import classnames from 'classnames';
import isNull from 'lodash/isNull';
import React, { useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';

import { API } from '../../api';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Package } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import Image from './Image';
import PackageIcon from './PackageIcon';
import styles from './SearchTypeahead.module.css';

interface Props {
  disabledPackages: string[];
  onSelection: (packageItem: Package) => void;
}

const SearchTypeahead = (props: Props) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  useOutsideClick([dropdownRef], !isNull(packages), () => setPackages(null));

  async function searchPackages(text: string) {
    try {
      setIsSearching(true);
      const searchResults = await API.searchPackages({
        text: text,
        filters: {},
        deprecated: false,
        limit: 15,
        offset: 0,
      });
      setPackages(searchResults.data.packages);
      setIsSearching(false);
    } catch (err) {
      setPackages(null);
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'An error occurred searching packages, please try again later',
      });
      setIsSearching(false);
    }
  }

  const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && searchQuery !== '') {
      searchPackages(searchQuery);
    }
  };

  const saveSelectedPackage = (item: Package): void => {
    setPackages(null);
    inputEl.current!.value = '';
    props.onSelection(item);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!isNull(packages)) {
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
            data-testid="searchTypeaheadInput"
            ref={inputEl}
            type="text"
            className={`flex-grow-1 px-3 ${styles.input}`}
            name="name"
            autoComplete="off"
            onKeyDown={handleOnKeyDown}
            onChange={onChange}
          />

          {isSearching && (
            <div className={`position-absolute text-secondary ${styles.loading}`}>
              <span data-testid="searchBarSpinning" className="spinner-border spinner-border-sm" />
            </div>
          )}
        </div>

        <button
          data-testid="searchIconBtn"
          className={`btn btn-secondary ml-3 text-center p-0 ${styles.searchBtn}`}
          disabled={searchQuery === '' || isSearching}
          onClick={() => {
            if (searchQuery !== '') {
              searchPackages(searchQuery);
            }
          }}
        >
          <FaSearch />
        </button>
      </div>

      {!isNull(packages) && (
        <div ref={dropdownRef} className={`dropdown-menu w-100 p-0 show ${styles.dropdown}`}>
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
                    <th scope="col" className={`${styles.fitCell} border-top-0`}></th>
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
                        <td className="align-middle text-center">
                          <PackageIcon kind={item.kind} className={`mx-2 ${styles.icon}`} />
                        </td>
                        <td className="align-middle">
                          <div className="d-flex flex-row align-items-center">
                            <div
                              className={`d-flex align-items-center justify-content-center overflow-hidden ${styles.imageWrapper}`}
                            >
                              <Image
                                imageId={item.logoImageId}
                                alt={`Logo ${item.displayName || item.name}`}
                                className={styles.image}
                              />
                            </div>

                            <div className="text-dark ml-2">{item.displayName || item.name}</div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="text-dark">
                            {item.userAlias || item.organizationDisplayName || item.organizationName}
                            {!isNull(item.chartRepository) && (
                              <small className="ml-2">
                                (<small className={`text-uppercase text-muted ${styles.legend}`}>Repo: </small>
                                {item.chartRepository!.displayName || item.chartRepository!.name})
                              </small>
                            )}
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

export default SearchTypeahead;
