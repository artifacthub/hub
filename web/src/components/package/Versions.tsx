import React from 'react';
import { Link } from 'react-router-dom';
import compareVersions from 'compare-versions';
import { GoCheck } from 'react-icons/go';
import ExpandableList from '../common/ExpandableList';
import styles from './Versions.module.css';

interface Props {
  package_id: string;
  version: string
  available_versions: string[];
}

const Versions = (props: Props) => {
  const sortedVersions = props.available_versions.sort(compareVersions).reverse();
  const allVersions = sortedVersions.map((av_version: string) => (
    <div key={av_version}>
      {av_version === props.version ? (
        <div className="d-flex align-items-center">
          <GoCheck className="mr-1" />
          {av_version}
        </div>
      ) : (
        <Link
          className={`ml-1 ${styles.link}`}
          to={`/package/${props.package_id}/${av_version}`}
        >
          {av_version}
        </Link>
      )}
    </div>
  ));

  return <ExpandableList items={allVersions} />;
};

export default Versions;
