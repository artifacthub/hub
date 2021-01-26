import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useCallback, useEffect, useState } from 'react';
import { GoPackage } from 'react-icons/go';

import { Dependency } from '../../types';
import SeeAllModal from '../common/SeeAllModal';
import SmallTitle from '../common/SmallTitle';
import styles from './Dependencies.module.css';

interface Props {
  dependencies?: Dependency[];
  packageId: string;
}

interface DependenciesList {
  items: JSX.Element[];
  itemsForModal: JSX.Element[] | JSX.Element;
}

const Dependencies = (props: Props) => {
  const getAllDependencies = useCallback((): DependenciesList | null => {
    if (isUndefined(props.dependencies) || props.dependencies.length === 0) return null;

    let items: JSX.Element[] = [];
    let itemsForModal: JSX.Element[] = [];

    props.dependencies.forEach((dependency: Dependency, index: number) => {
      items.push(
        <div
          key={`dependency_${index}`}
          className={`${styles.dependency} text-truncate pb-1`}
          data-testid="dependencyItem"
        >
          <GoPackage className="text-muted mr-2 mb-0" />
          {dependency.name}
          <span className={styles.separator}>@</span>
          {dependency.version}
        </div>
      );

      itemsForModal.push(
        <tr key={`dependency_row_${index}`}>
          <td className={`border-right-0 ${styles.fitCell}`}>
            <GoPackage className={`text-muted ml-1 ${styles.icon}`} />
          </td>
          <td className="border-left-0">
            <div className={`d-table w-100 h-100 px-1 ${styles.textWrapper}`}>
              <div data-testid="containerImage" className="text-truncate">
                {dependency.name}
              </div>
            </div>
          </td>
          <td>
            <div className={`d-table w-100 h-100 px-1 ${styles.textWrapper}`}>
              <div className="text-truncate">{dependency.version}</div>
            </div>
          </td>
        </tr>
      );
    });

    return {
      items,
      itemsForModal: (
        <table className={`table table-striped table-bordered table-sm mb-0 ${styles.table}`}>
          <thead>
            <tr className={`table-primary ${styles.tableTitle}`}>
              <th scope="col" colSpan={2}>
                <span className="px-1">Name</span>
              </th>
              <th scope="col">
                <span className="px-1">Version</span>
              </th>
            </tr>
          </thead>
          <tbody>{itemsForModal}</tbody>
        </table>
      ),
    };
  }, [props.dependencies]);

  const [dependencies, setDependencies] = useState<DependenciesList | null>(getAllDependencies());

  useEffect(() => {
    setDependencies(getAllDependencies());
  }, [props.dependencies, getAllDependencies]);

  if (isNull(dependencies)) return null;

  return (
    <>
      <SmallTitle text="Dependencies" />
      <div className="mb-3">
        <SeeAllModal title="Dependencies" {...dependencies} packageId={props.packageId} />
      </div>
    </>
  );
};

export default Dependencies;
