import classnames from 'classnames';
import { compact, isNull, orderBy } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import { MdBusiness } from 'react-icons/md';

import useOutsideClick from '../../hooks/useOutsideClick';
import { Repository } from '../../types';
import RepositoryIcon from './RepositoryIcon';
import styles from './SearchTypeaheadRepository.module.css';

interface Props {
  isLoading: boolean;
  repositories: Repository[];
  disabledList: string[];
  onSelect: (repo: Repository) => void;
  placeholder?: string;
}

const SearchTypeaheadRepository = (props: Props) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [hightlightedText, setHightlightedText] = useState<RegExp | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(true);

  useOutsideClick([dropdownRef, inputEl], !collapsed, () => collapseDropdown());

  const getVisibleItems = useCallback((): Repository[] => {
    if (inputValue === '') {
      return props.repositories;
    }

    const filteredItems: Repository[] = props.repositories.filter((repo: Repository) => {
      return repo.name.toLowerCase().includes(inputValue.toLowerCase());
    });

    const elements: any[] = orderBy(filteredItems, ['displayName', 'name'], ['asc', 'asc']);
    return elements;
  }, [inputValue, props.repositories]);

  const getOptionName = (name: string): JSX.Element => {
    if (!isNull(hightlightedText)) {
      const stringParts: string[] = compact(name.split(hightlightedText));

      return (
        <>
          {stringParts.map((str: string, index: number) => {
            if (str.toLowerCase() === inputValue.toLowerCase()) {
              return (
                <span key={`${name}_${index}`} className={`font-weight-bold ${styles.hightlighted}`}>
                  {str}
                </span>
              );
            } else {
              return <span key={`${name}_${index}`}>{str}</span>;
            }
          })}
        </>
      );
    } else {
      return <>{name}</>;
    }
  };

  const collapseDropdown = () => {
    setCollapsed(true);
    setInputValue('');
  };

  const [visibleItems, setVisibleItems] = useState<Repository[]>(getVisibleItems());

  useEffect(() => {
    setVisibleItems(getVisibleItems());
  }, [getVisibleItems, inputValue, props.repositories]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    e.preventDefault();

    setHightlightedText(e.target.value !== '' ? new RegExp(`(${e.target.value.toLowerCase()})`, 'gi') : null);
    setInputValue(e.target.value);
    setCollapsed(false);
  };

  const onSelect = (repo: Repository) => {
    setInputValue('');
    props.onSelect(repo);
  };

  return (
    <div className="position-relative">
      <div className={`flex-grow-1 d-flex align-items-strecht position-relative ${styles.inputWrapper}`}>
        <input
          data-testid="searchTypeaheadRepositoryInput"
          ref={inputEl}
          type="text"
          className={`flex-grow-1 px-3 ${styles.input}`}
          name="searchRepo"
          autoComplete="new-input"
          onFocus={() => setCollapsed(false)}
          value={inputValue}
          onChange={onChange}
          spellCheck="false"
          placeholder={
            !props.isLoading && props.repositories.length === 0 && props.placeholder ? props.placeholder : ''
          }
          disabled={props.isLoading || (!props.isLoading && props.repositories.length === 0)}
          required
        />

        {props.isLoading && (
          <div className={`position-absolute text-secondary ${styles.loading}`}>
            <span data-testid="searchBarSpinning" className="spinner-border spinner-border-sm" />
          </div>
        )}
        <div className={`position-absolute invalid-feedback ${styles.fieldFeedback}`}>This field is required</div>
      </div>

      {!collapsed && (
        <div
          ref={dropdownRef}
          data-testid="searchTypeaheadRepositoryDropdown"
          className={`dropdown-menu p-0 w-100 shadow-sm show ${styles.dropdown}`}
        >
          {visibleItems.length === 0 ? (
            <p className="m-3 text-center">Sorry, not matches found</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={`table table-hover table-sm mb-0 ${styles.table}`}>
                <thead>
                  <tr>
                    <th scope="col" className={`${styles.fitCell} d-none d-sm-table-cell border-top-0`}></th>
                    <th scope="col" className={`border-top-0 ${styles.repoCell}`}>
                      Repository
                    </th>
                    <th scope="col" className="border-top-0">
                      Publisher
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((repo: Repository) => {
                    const isDisabled = props.disabledList.includes(repo.repositoryId!);
                    return (
                      <tr
                        data-testid="repoItem"
                        role="button"
                        className={classnames(
                          { [styles.clickableCell]: !isDisabled },
                          { [styles.disabledCell]: isDisabled }
                        )}
                        onClick={() => {
                          if (!isDisabled) {
                            onSelect(repo);
                          }
                        }}
                        key={`repo_${repo.name!}`}
                      >
                        <td className="align-middle text-center d-none d-sm-table-cell">
                          <RepositoryIcon kind={repo.kind} className={`mx-2 ${styles.icon}`} />
                        </td>
                        <td className="align-middle">
                          <div className="text-dark text-capitalize ml-2">{getOptionName(repo.name)}</div>
                        </td>
                        <td className="align-middle">
                          <div className="text-dark d-flex flex-row align-items-center">
                            <span className={`mx-1 ${styles.tinyIcon}`}>
                              {repo.userAlias ? <FaUser /> : <MdBusiness />}
                            </span>
                            {repo.userAlias || repo.organizationDisplayName || repo.organizationName}
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

export default SearchTypeaheadRepository;
