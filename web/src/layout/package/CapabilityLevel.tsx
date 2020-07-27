import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import React from 'react';
import { FaCheck } from 'react-icons/fa';
import { MdInfo } from 'react-icons/md';

import Modal from '../common/Modal';
import SmallTitle from '../common/SmallTitle';
import styles from './CapabilityLevel.module.css';

interface Props {
  capabilityLevel?: string;
}

const LEVELS = ['Basic Install', 'Seamless Upgrades', 'Full Lifecycle', 'Deep Insights', 'Auto Pilot'];

const CapabilityLevel = (props: Props) => {
  if (isUndefined(props.capabilityLevel) || isNull(props.capabilityLevel)) return null;

  const activeLevel = LEVELS.findIndex((level: string) => level === props.capabilityLevel);

  return (
    <div>
      <div className="d-flex flex-row align-items-center">
        <SmallTitle text="Capability Level" />
        <Modal
          buttonType="btn-link btn-sm px-0 pb-0 text-secondary"
          buttonContent={<MdInfo />}
          className="d-none d-lg-inline-block mt-1 ml-2"
          header={<div className="h5 m-0">Capability level</div>}
        >
          <div className="my-3 mw-100">
            <img
              src="/static/media/capability-level-diagram.svg"
              alt="Capability Level Diagram"
              className="capability-level-diagram mw-100"
            />
          </div>
        </Modal>
      </div>

      <div className="mb-3 position-relative">
        {LEVELS.map((level: string, index: number) => (
          <div
            key={`capabilityLevel-${index}`}
            className={`d-flex flex-row align-items-center my-2 position-relative stepWrapper ${styles.stepWrapper}`}
          >
            <div
              className={classnames('rounded-circle text-center mr-2 textLight step', styles.step, {
                [`activeStep ${styles.activeStep}`]: activeLevel >= index,
              })}
            >
              {activeLevel >= index && <FaCheck />}
            </div>
            <small
              className={classnames({
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
