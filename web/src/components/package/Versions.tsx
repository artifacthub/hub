import React from 'react';
import * as semver from 'semver';
import { useLocation } from 'react-router-dom';
import ExpandableList from '../common/ExpandableList';
import Version from './Version';

interface Props {
  package_id: string;
  version: string
  available_versions: string[];
}

const Versions = (props: Props) => {
  const location = useLocation();
  const searchText = location.state ? location.state.searchText : undefined;
  const filtersQuery = location.state ? location.state.filtersQuery : '';

  const getSortedVersions = () => {
    try {
      return semver.rsort(props.available_versions);
    } catch {
      return props.available_versions;
    }
  }

  const allVersions = getSortedVersions().map((av_version: string) => (
    <Version
      key={av_version}
      isActive={av_version === props.version}
      version={av_version}
      packageId={props.package_id}
      searchText={searchText}
      filtersQuery={filtersQuery}
    />
  ));

  return <div className="mb-3"><ExpandableList items={allVersions} /></div>;
};

export default Versions;
