import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { CgListTree } from 'react-icons/cg';

import Badge from './Badge';

interface Props {
  hasValuesSchema: boolean;
  className?: string;
  dropdownAlignment?: 'start' | 'end';
  noDropdown?: boolean;
  smallSize?: boolean;
}

const ValuesSchemaBadge = (props: Props) => {
  const hasValuesSchema =
    !isNull(props.hasValuesSchema) && !isUndefined(props.hasValuesSchema) && props.hasValuesSchema;

  return (
    <Badge
      title="Values Schema"
      bgColor="#FCA311"
      icon={<CgListTree />}
      active={hasValuesSchema}
      className={props.className}
      dropdownAlignment={props.dropdownAlignment}
      noDropdown={props.noDropdown}
      smallSize={props.smallSize}
      popoverContent={
        <>
          <div className="fs-6 fw-semibold border-bottom border-1 mb-3 pb-1">Values schema</div>

          <p>
            This chart {hasValuesSchema ? 'provides' : 'does not provide'} a{' '}
            <span className="fw-bold">values schema</span>.
          </p>
        </>
      }
    />
  );
};

export default ValuesSchemaBadge;
