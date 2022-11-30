import { Link } from 'react-router-dom';

import { TopViewsItem } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import prettifyNumber from '../../utils/prettifyNumber';
import RepositoryIcon from '../common/RepositoryIcon';
import styles from './PackagesList.module.css';

interface Props {
  data: TopViewsItem[];
  title: string;
}

const PackagesList = (props: Props) => {
  return (
    <div className={`d-flex flex-column mx-1 ${styles.listWrapper}`}>
      <div className={`fw-bold mb-2 ${styles.title}`}>{props.title}</div>
      <div className={`d-flex flex-column flex-wrap flex-grow-1 my-2 ${styles.list}`}>
        {props.data.map((item: TopViewsItem, index: number) => {
          return (
            <div
              key={`pkg_${item.package.displayName}_${index}`}
              className={`d-flex flex-row align-items-center ${styles.line}`}
            >
              <RepositoryIcon kind={item.package.repository.kind} className={`w-auto ${styles.icon}`} />
              <div className="d-flex flex-grow-1 text-truncate me-1">
                <Link
                  className={`position-relative d-inline-block ms-2 ${styles.link}`}
                  to={{
                    pathname: buildPackageURL(item.package.normalizedName, item.package.repository),
                  }}
                >
                  <div className="d-flex flex-row align-items-center w-100 pe-2">
                    <span className="text-truncate text-dark">{item.package.displayName || item.package.name}</span>
                  </div>
                </Link>
              </div>
              <div className={`ms-auto text-end ${styles.views}`}>{prettifyNumber(item.views, 1)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PackagesList;
