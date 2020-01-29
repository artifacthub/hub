import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import compareVersions from 'compare-versions';
import ExpandableList from '../common/ExpandableList';

interface Props {
  package_id: string;
  version: string
  available_versions: string[];
}

const Versions = (props: Props) => {
  const location = useLocation();
  const searchText = location.state ? location.state.searchText : undefined;

  const sortedVersions = props.available_versions.sort(compareVersions).reverse();
  const allVersions = sortedVersions.map((av_version: string) => (
    <div key={av_version}>
      {av_version === props.version ? (
        <div className="d-flex align-items-center text-truncate">
          {av_version}
        </div>
      ) : (
        <Link
          to={{
            pathname: `/package/${props.package_id}/${av_version}`,
            state: { searchText: searchText },
          }}
          className="text-truncate d-block"
        >
          {av_version}
        </Link>
      )}
    </div>
  ));

  return <div className="mb-3"><ExpandableList items={allVersions} /></div>;
};

export default Versions;
