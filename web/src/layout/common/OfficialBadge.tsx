import React from 'react';
import { HiBadgeCheck } from 'react-icons/hi';

import Label from './Label';
import LabelWithTooltip from './LabelWithTooltip';

interface Props {
  official?: null | boolean;
  className?: string;
}

const OfficialBadge = (props: Props) => (
  <LabelWithTooltip
    active={props.official}
    className={props.className}
    label={<Label text="Official" icon={<HiBadgeCheck />} />}
    tooltipMessage="The publisher owns the software deployed by the packages in this repository"
    visibleTooltip
  />
);

export default OfficialBadge;
