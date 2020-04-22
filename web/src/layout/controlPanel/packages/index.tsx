import classnames from 'classnames';
import React, { useState } from 'react';

import { PackageKind } from '../../../types';
import PackageIcon from '../../common/PackageIcon';
import ChartRepository from './chartRepository';
import styles from './PackagesSection.module.css';

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
  onAuthError: () => void;
}

const DEFAULT_PACKAGE_KIND = PackageKind.Chart;

const PackagesSection = (props: Props) => {
  const [activePackageKind, setActivePackageKind] = useState<PackageKind>(DEFAULT_PACKAGE_KIND);

  const onMenuItemClick = (kind: PackageKind) => {
    setActivePackageKind(kind);
  };

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-4 p-0">
      <nav className={styles.sidebar}>
        <div className={`list-group my-4 my-md-0 mr-md-5 ${styles.listGroup}`}>
          {packages.map((packageItem: PackageItem) => {
            return (
              <button
                key={`package_${packageItem.kind}`}
                type="button"
                className={classnames(
                  'list-group-item list-group-item-action overflow-hidden',
                  styles.listItem,
                  { [styles.isActive]: packageItem.kind === activePackageKind },
                  { disabled: packageItem.disabled }
                )}
                onClick={() => onMenuItemClick(packageItem.kind)}
              >
                <div className="d-flex flex-row align-items-center">
                  <PackageIcon className={`mr-md-2 ${styles.icon}`} kind={packageItem.kind} />
                  <span className="d-none d-md-block">{packageItem.name}</span>
                  <span className="d-inline d-md-none ml-2">{packageItem.shortName}</span>
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
              return <ChartRepository {...props} />;
            default:
              return null;
          }
        })()}
      </div>
    </main>
  );
};

export default PackagesSection;
