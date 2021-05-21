import { isUndefined } from 'lodash';
import React from 'react';
import { FaEyeSlash } from 'react-icons/fa';

import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';

interface Props {
  scannerDisabled: boolean;
  className?: string;
  withTooltip?: boolean;
}

const ScannerDisabledRepositoryBadge = (props: Props) => {
  if (!props.scannerDisabled) return null;
  return (
    <ElementWithTooltip
      active
      className={props.className}
      element={<Label text="Security scanner disabled" labelStyle="warning" icon={<FaEyeSlash />} />}
      tooltipMessage="Security scanning of this package has been disabled by the publisher."
      visibleTooltip={!isUndefined(props.withTooltip) && props.withTooltip}
    />
  );
};

export default ScannerDisabledRepositoryBadge;
