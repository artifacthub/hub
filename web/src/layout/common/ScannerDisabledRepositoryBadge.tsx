import React from 'react';
import { FaEyeSlash } from 'react-icons/fa';

import Label from './Label';

interface Props {
  scannerDisabled: boolean;
  className?: string;
}

const ScannerDisabledRepositoryBadge = (props: Props) => {
  if (!props.scannerDisabled) return null;
  return (
    <Label text="Security scanner disabled" labelStyle="warning" className={props.className} icon={<FaEyeSlash />} />
  );
};

export default ScannerDisabledRepositoryBadge;
