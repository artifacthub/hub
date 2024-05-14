import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useCallback, useEffect, useState } from 'react';
import { FiPackage } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { Dependency, RepositoryKind } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
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

    const items: JSX.Element[] = [];
    const itemsForModal: JSX.Element[] = [];

    props.dependencies.forEach((dependency: Dependency, index: number) => {
      items.push(
        <div
          key={`dependency_${index}`}
          className={`${styles.dependency} text-break pb-1`}
          data-testid="dependencyItem"
          role="listitem"
        >
          <div className="d-flex flex-row align-items-center">
            <FiPackage className={`text-muted me-2 mb-0 ${styles.pkgIcon}`} />
            <div className="text-truncate">
              {!isUndefined(dependency.artifacthubRepositoryName) ? (
                <Link
                  to={{
                    pathname: buildPackageURL(dependency.name, {
                      kind: RepositoryKind.Helm,
                      name: dependency.artifacthubRepositoryName,
                    }),
                  }}
                  className="py-1 py-sm-0 text-primary"
                >
                  {dependency.name}
                </Link>
              ) : (
                <>{dependency.name}</>
              )}
              <span className={styles.separator}>@</span>
              {dependency.version}
            </div>
          </div>
          {dependency.repository && (
            <div className={`d-flex flex-row align-items-center ${styles.repoName}`}>
              <small className="text-muted text-uppercase me-1 text-nowrap">Repo:</small>
              <span className="text-truncate">{dependency.repository}</span>
              <ButtonCopyToClipboard
                text={dependency.repository}
                className={`btn-link text-dark border-0 pb-0 position-relative ${styles.copyBtn}`}
                label="Copy repository url to clipboard"
              />
            </div>
          )}
        </div>
      );

      itemsForModal.push(
        <tr key={`dependency_row_${index}`}>
          <td className={`border-end-0 ${styles.fitCell}`}>
            <FiPackage className={`text-muted ms-1 ${styles.icon}`} />
          </td>
          <td className="border-start-0">
            <div className={`d-table w-100 h-100 px-1 ${styles.textWrapper}`}>
              {!isUndefined(dependency.artifacthubRepositoryName) ? (
                <Link
                  to={{
                    pathname: buildPackageURL(dependency.name, {
                      kind: RepositoryKind.Helm,
                      name: dependency.artifacthubRepositoryName,
                    }),
                  }}
                  className="py-1 py-sm-0 text-primary"
                  aria-label={`Open ${dependency.name} package`}
                >
                  <div className={`text-truncate ${styles.linkText}`}>{dependency.name}</div>
                </Link>
              ) : (
                <div data-testid="containerImage" className="text-truncate">
                  {dependency.name}
                </div>
              )}
            </div>
          </td>
          <td className={styles.versionCol}>
            <div className={`d-table w-100 h-100 px-1 ${styles.textWrapper}`}>
              <div className="text-truncate">{dependency.version}</div>
            </div>
          </td>
          <td>
            <div className={`d-table w-100 h-100 px-1 ${styles.textWrapper}`}>
              {dependency.repository && (
                <div className={`d-flex flex-row align-items-center ${styles.repoNameInTable}`}>
                  <span className="text-truncate">{dependency.repository}</span>
                  <ButtonCopyToClipboard
                    text={dependency.repository}
                    className={`btn-link text-dark border-0 ${styles.copyBtn}`}
                    label="Copy repository url to clipboard"
                  />
                </div>
              )}
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
            <tr className={styles.tableTitle}>
              <th scope="col" colSpan={2}>
                <span className="px-1">Name</span>
              </th>
              <th scope="col">
                <span className="px-1">Version</span>
              </th>
              <th scope="col">
                <span className="px-1">Repository</span>
              </th>
            </tr>
          </thead>
          <tbody className={styles.body}>{itemsForModal}</tbody>
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
        <SeeAllModal title="Dependencies" {...dependencies} packageId={props.packageId} modalClassName={styles.modal} />
      </div>
    </>
  );
};

export default Dependencies;
