import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { HiClipboardList } from 'react-icons/hi';

import { API } from '../../../api';
import { SecurityReport, SecurityReportSummary } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';
import SecuritySummary from './Summary';
import SecurityTable from './Table';

interface Props {
  summary: SecurityReportSummary;
  packageId: string;
  version: string;
}

const SecurityModal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [report, setReport] = useState<SecurityReport | null | undefined>();

  async function getSecurityReports() {
    try {
      setIsLoading(true);
      setReport(await API.getSnapshotSecurityReport(props.packageId, props.version));
      setIsLoading(false);
      setOpenStatus(true);
    } catch {
      setReport(null);
      alertDispatcher.postAlert({
        type: 'danger',
        message: 'An error occurred getting the vulnerability reports, please try again later.',
      });
      setIsLoading(false);
    }
  }

  const onOpenModal = () => {
    if (report) {
      setOpenStatus(true);
    } else {
      getSecurityReports();
    }
  };

  return (
    <>
      <div className="text-center">
        <button className="btn btn-secondary btn-sm" onClick={onOpenModal}>
          <small className="d-flex flex-row align-items-center text-uppercase">
            {isLoading ? (
              <>
                <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                <span className="ml-2">Getting report...</span>
              </>
            ) : (
              <>
                <HiClipboardList className="mr-2" />
                <span>Open full report</span>
              </>
            )}
          </small>
        </button>
      </div>

      {openStatus && report && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 ${styles.title}`}>Security report</div>}
          onClose={() => setOpenStatus(false)}
          open={openStatus}
        >
          <div className="m-3">
            <div className="h5 mt-0 text-secondary text-uppercase font-weight-bold mb-2">Summary</div>
            <SecuritySummary summary={props.summary} />

            {!isEmpty(report) && (
              <>
                <div className="h5 pt-3 text-secondary text-uppercase font-weight-bold mb-2">Vulnerabilities</div>
                <div className="mt-3">
                  {Object.keys(report).map((image: string) => {
                    return <SecurityTable image={image} reports={report[image]} key={`image_${image}`} />;
                  })}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default SecurityModal;
