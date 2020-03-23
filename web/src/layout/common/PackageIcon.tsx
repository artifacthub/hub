import isUndefined from 'lodash/isUndefined';
import React from 'react';

import falcoWhiteIcon from '../../images/falco-white.svg';
import falcoIcon from '../../images/falco.svg';
import chartWhiteIcon from '../../images/helm-white.svg';
import chartIcon from '../../images/helm.svg';
import opaWhiteIcon from '../../images/opa-white.svg';
import opaIcon from '../../images/opa.svg';
import { PackageKind } from '../../types';

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

  return <img alt="Icon" src={src} className={props.className} />;
};

export default PackageIcon;
