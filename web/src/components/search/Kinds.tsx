import React from 'react';
import Title from './Title';
import Checkbox from '../common/Checkbox';

interface Props {
  activePackageKinds: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface PackageKind {
  name: string;
  label: string;
}

const kinds: PackageKind[] = [
  {name: "chart", label: "Chart"},
  {name: "operator", label: "Operator"},
];

const Kinds = (props: Props) => {
  return (
    <div className="mt-4 pt-2">
      <Title text="Kind" />

      <div>
        {kinds.map((packageKind: PackageKind) => (
          <Checkbox
            key={`kind_${packageKind.name}`}
            name={packageKind.name}
            label={packageKind.label}
            checked={props.activePackageKinds.includes(packageKind.name)}
            onChange={props.onChange}
          />
        ))}
      </div>
    </div>
  );
};

export default Kinds;
