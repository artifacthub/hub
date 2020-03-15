import React from 'react';
import chartIcon from '../../images/helm.svg';
import operatorIcon from '../../images/operator.svg';
import falcoIcon from '../../images/falco.svg';
import opaIcon from '../../images/opa.svg';
import { PackageKind } from '../../types';

interface Props {
  kind: PackageKind;
  className?: string;
}

const ICONS = {
  [PackageKind.Chart]: chartIcon,
  [PackageKind.Falco]: falcoIcon,
  [PackageKind.Opa]: opaIcon,
  [PackageKind.Operator]: operatorIcon,
};

const PackageIcon = (props: Props) => (
  <img
    alt="Icon"
    src={ICONS[props.kind]}
    className={props.className}
  />
);

export default PackageIcon;
