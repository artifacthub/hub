import React from 'react';
import { MdVerifiedUser } from 'react-icons/md';

import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';

interface Props {
  verifiedPublisher?: null | boolean;
  className?: string;
}

const VerifiedPublisherBadge = (props: Props) => (
  <ElementWithTooltip
    active={props.verifiedPublisher}
    className={props.className}
    element={<Label text="Verified Publisher" icon={<MdVerifiedUser />} />}
    tooltipMessage="The publisher owns the repository"
    visibleTooltip
  />
);

export default React.memo(VerifiedPublisherBadge);
