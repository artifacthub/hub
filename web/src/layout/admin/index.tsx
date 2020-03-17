import React, { useState } from 'react';
import classnames from 'classnames';
import { PackageKind, UserAuth } from '../../types';
import ChartRepository from './chartRepository';
import styles from './AdminView.module.css';
import PackageIcon from '../common/PackageIcon';
import isNull from 'lodash/isNull';

interface PackageItem {
  kind: PackageKind;
  name: string;
  shortName: string;
  disabled: boolean;
}

const packages: PackageItem[] = [
  {
    kind: PackageKind.Chart,
    name: 'Chart repositories',
    shortName: 'Chart',
    disabled: false,
  },
  {
    kind: PackageKind.Falco,
    name: 'Falco rules',
    shortName: 'Falco',
    disabled: true,
  },
  {
    kind: PackageKind.Opa,
    name: 'OPA policies',
    shortName: 'OPA',
    disabled: true,
  },
];

interface Props {
  isAuth: null | UserAuth;
  setIsAuth: React.Dispatch<React.SetStateAction<UserAuth | null>>;
}

const DEFAULT_PACKAGE_KIND = PackageKind.Chart;

const AdminView = (props: Props) => {
  const [activePackageKind, setActivePackageKind] = useState<PackageKind>(DEFAULT_PACKAGE_KIND);

  const onMenuItemClick = (kind: PackageKind) => {
    setActivePackageKind(kind);
  }

  if (!isNull(props.isAuth) && !props.isAuth.status) {
    return null;
  }

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-5">
      <nav className={styles.sidebar}>
        <div className={`list-group my-4 my-md-0 mr-md-5 ${styles.listGroup}`}>
          <li className={`list-group-item d-none d-md-block ${styles.listTitle}`}>My packages</li>
          {packages.map((packageItem: PackageItem) => {
            return (
              <button
                key={`package_${packageItem.kind}`}
                type="button"
                className={classnames(
                  'list-group-item list-group-item-action',
                  styles.listItem,
                  {[styles.isActive]: packageItem.kind === activePackageKind},
                  {'disabled': packageItem.disabled},
                )}
                onClick={() => onMenuItemClick(packageItem.kind)}
              >
                <div className="d-flex flex-row align-items-center">
                  <PackageIcon className={`mr-md-2 ${styles.icon}`} kind={packageItem.kind} />
                  <span className="d-none d-md-block">
                    {packageItem.name}
                  </span>
                  <span className="d-inline d-md-none ml-2">
                    {packageItem.shortName}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      <div className={`flex-grow-1 ${styles.packagesList}`}>
        {(() => {
          switch (activePackageKind) {
            case PackageKind.Chart:
              return (
                <ChartRepository {...props} />
              );
            default:
              return null;
          }
        })()}
      </div>
    </main>
  );
}

export default AdminView;
