import React from 'react';
import { HiBadgeCheck } from 'react-icons/hi';

import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';

interface Props {
  official?: null | boolean;
  className?: string;
  type: 'package' | 'repo';
}

const OfficialBadge = (props: Props) => (
  <ElementWithTooltip
    active={props.official}
    className={props.className}
    element={<Label text="Official" icon={<HiBadgeCheck />} labelStyle="success" />}
    tooltipMessage={
      props.type === 'repo'
        ? 'The publisher owns the software deployed by the packages in this repository'
        : 'The publisher owns the software deployed by this package'
    }
    visibleTooltip
  />
);

export default OfficialBadge;
