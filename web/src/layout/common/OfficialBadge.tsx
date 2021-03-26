import { isUndefined } from 'lodash';
import React from 'react';
import { HiBadgeCheck } from 'react-icons/hi';

import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';

interface Props {
  official?: null | boolean;
  className?: string;
  type: 'package' | 'repo';
  withoutTooltip?: boolean;
  onlyIcon?: boolean;
}

const OfficialBadge = (props: Props) => (
  <ElementWithTooltip
    active={props.official}
    className={props.className}
    element={<Label text="Official" icon={<HiBadgeCheck />} labelStyle="success" onlyIcon={props.onlyIcon} />}
    tooltipMessage={
      props.type === 'repo'
        ? 'The publisher owns the software deployed by the packages in this repository'
        : 'The publisher owns the software deployed by this package'
    }
    visibleTooltip={isUndefined(props.withoutTooltip) || !props.withoutTooltip}
  />
);

export default OfficialBadge;
