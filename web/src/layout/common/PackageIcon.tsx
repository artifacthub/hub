import React from 'react';
import chartIcon from '../../images/helm.svg';
import falcoIcon from '../../images/falco.svg';
import opaIcon from '../../images/opa.svg';
import chartWhiteIcon from '../../images/helm-white.svg';
import falcoWhiteIcon from '../../images/falco-white.svg';
import opaWhiteIcon from '../../images/opa-white.svg';
import { PackageKind } from '../../types';
import isUndefined from 'lodash/isUndefined';

interface Props {
  kind: PackageKind;
  className?: string;
  type?: 'default' | 'white';
}

const ICONS = {
  [PackageKind.Chart]: {
    default: chartIcon,
    white: chartWhiteIcon,
  },
  [PackageKind.Falco]: {
    default: falcoIcon,
    white: falcoWhiteIcon,
  },
  [PackageKind.Opa]: {
    default: opaIcon,
    white: opaWhiteIcon,
  },
};

const PackageIcon = (props: Props) => {
  let src = ICONS[props.kind].default;
  if (!isUndefined(props.type)) {
    src = ICONS[props.kind][props.type];
  }

  return (
    <img
      alt="Icon"
      src={src}
      className={props.className}
    />
  );
};

export default PackageIcon;
