import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { FaCheck } from 'react-icons/fa';

import { OPERATOR_CAPABILITIES } from '../../utils/data';
import SmallTitle from '../common/SmallTitle';
import styles from './CapabilityLevel.module.css';
import CapabilityLevelInfoModal from './CapabilityLevelInfoModal';

interface Props {
  capabilityLevel?: string | null;
}

const CapabilityLevel = (props: Props) => {
  const activeLevel = OPERATOR_CAPABILITIES.findIndex(
    (level: string) => level === (props.capabilityLevel || '').toLowerCase()
  );
  if (isUndefined(props.capabilityLevel) || isNull(props.capabilityLevel) || activeLevel < 0) return null;

  return (
    <div>
      <div className="d-inline">
        <SmallTitle text="Capability Level" wrapperClassName="d-inline" />
        <CapabilityLevelInfoModal />
      </div>

      <div className="mb-3 position-relative">
        {OPERATOR_CAPABILITIES.map((level: string, index: number) => (
          <div
            key={`capabilityLevel-${index}`}
            className={`d-flex flex-row align-items-center my-2 position-relative stepWrapper ${styles.stepWrapper}`}
          >
            <div
              data-testid="capabilityLevelStep"
              className={classnames(
                'rounded-circle text-center me-2 textLight step border border-1 bg-white',
                styles.step,
                {
                  [`activeStep ${styles.activeStep}`]: activeLevel >= index,
                }
              )}
            >
              {activeLevel >= index && <FaCheck />}
            </div>
            <small
              className={classnames('text-capitalize', {
                'text-muted': activeLevel < index,
              })}
            >
              {level}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CapabilityLevel;
