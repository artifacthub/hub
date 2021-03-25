import { isUndefined } from 'lodash';
import React from 'react';
import { MdVerifiedUser } from 'react-icons/md';

import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';

interface Props {
  verifiedPublisher?: null | boolean;
  className?: string;
  withoutTooltip?: boolean;
  onlyIcon?: boolean;
}

const VerifiedPublisherBadge = (props: Props) => (
  <ElementWithTooltip
    active={props.verifiedPublisher}
    className={props.className}
    element={<Label text="Verified Publisher" icon={<MdVerifiedUser />} onlyIcon={props.onlyIcon} />}
    tooltipMessage="The publisher owns the repository"
    visibleTooltip={isUndefined(props.withoutTooltip) || !props.withoutTooltip}
  />
);

export default VerifiedPublisherBadge;
