import { isUndefined } from 'lodash';

import Badge from './Badge';

interface Props {
  className?: string;
  dropdownAlignment?: 'start' | 'end';
  inRepo?: boolean;
}

const CNCF = (props: Props) => {
  return (
    <Badge
      title="CNCF"
      icon={<img src="/static/media/cncf-icon.svg" alt="CNCF icon" className="h-100 w-100" />}
      active
      className={props.className}
      dropdownAlignment={props.dropdownAlignment}
      popoverContent={
        <>
          <div className="fs-6 fw-semibold border-bottom mb-3 pb-1">CNCF</div>

          <p className="mb-0">
            This {!isUndefined(props.inRepo) && props.inRepo ? 'repository' : 'package'} has been published by a{' '}
            <span className="fw-bold">CNCF project</span>.
          </p>
        </>
      }
    />
  );
};

export default CNCF;
