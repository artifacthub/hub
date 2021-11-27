import { isUndefined } from 'lodash';
import { MdBusiness } from 'react-icons/md';

import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';

interface Props {
  productionOrganizationsCount?: number;
  className?: string;
}

const ProductionBadge = (props: Props) => {
  if (isUndefined(props.productionOrganizationsCount) || props.productionOrganizationsCount === 0) return null;
  return (
    <ElementWithTooltip
      className={props.className}
      element={<Label text="In Production" icon={<MdBusiness />} iconLegend={props.productionOrganizationsCount} />}
      tooltipMessage={`${props.productionOrganizationsCount} ${
        props.productionOrganizationsCount === 1 ? 'organization is' : 'organizations are'
      } using this package in production`}
      active
      visibleTooltip
    />
  );
};

export default ProductionBadge;
