import React from 'react';
import { FaEyeSlash } from 'react-icons/fa';

import Label from './Label';

interface Props {
  disabled: boolean;
  className?: string;
}

const DisabledRepositoryBadge = (props: Props) => {
  if (!props.disabled) return null;
  return <Label text="Disabled" labelStyle="warning" className={props.className} icon={<FaEyeSlash />} />;
};

export default DisabledRepositoryBadge;
