import classnames from 'classnames';
import { isEmpty, isNull, isUndefined } from 'lodash';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import { HiClipboardList } from 'react-icons/hi';
import { useHistory } from 'react-router-dom';

import API from '../../../api';
import { SearchFiltersURL, SecurityReport, SecurityReportSummary } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import isFuture from '../../../utils/isFuture';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';
import SectionBtn from './SectionBtn';
import SecuritySummary from './Summary';
import SummaryTable from './SummaryTable';
import SecurityTable from './Table';

interface Props {
  summary: SecurityReportSummary;
  totalVulnerabilities: number;
  packageId: string;
  version: string;
  createdAt?: number;
  visibleSecurityReport: boolean;
  visibleImage?: string;
  visibleTarget?: string;
  visibleSection?: string;
  eventId?: string;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  hasWhitelistedContainers: boolean;
}

const SecurityModal = (props: Props) => {
  const history = useHistory();
  const contentWrapper = useRef<HTMLDivElement>(null);
  const [currentPkgId, setCurrentPkgId] = useState<string | undefined>(undefined);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [report, setReport] = useState<SecurityReport | null | undefined>();
  const [visibleImage, setVisibleImage] = useState<string | null>(props.visibleImage || null);
  const [visibleTarget, setVisibleTarget] = useState<string | null>(props.visibleTarget || null);
  const [visibleSection, setVisibleSection] = useState<string | null>(props.visibleSection || null);
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);
  const [hasOnlyOneTarget, setHasOnlyOneTarget] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  const activateTargetWhenIsOnlyOne = (report: SecurityReport) => {
    const images = Object.keys(report);
    if (images.length === 1) {
      const results = report[images[0]].Results;
      if (
        results.length === 1 &&
        report[images[0]].Results[0].Vulnerabilities &&
        report[images[0]].Results[0].Vulnerabilities!.length > 0
      ) {
        setExpandedTarget(`${images[0]}_${report[images[0]].Results[0].Target}`);
        setHasOnlyOneTarget(true);
      }
    }
  };

  async function getSecurityReports(eventId?: string) {
    try {
      setIsLoading(true);
      const report = await API.getSnapshotSecurityReport(props.packageId, props.version, eventId);
      setCurrentPkgId(props.packageId);
      setReport(report);
      activateTargetWhenIsOnlyOne(report);
      setIsLoading(false);
      setOpenStatus(true);
      updateUrl();
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
    getSecurityReports(props.eventId);
  };

  const onCloseModal = () => {
    setOpenStatus(false);
    setReport(undefined);
    setVisibleImage(null);
    setVisibleTarget(null);
    setVisibleSection(null);
    setExpandedTarget(null);
    history.replace({
      search: '',
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const updateUrl = () => {
    history.replace({
      search: `?modal=security-report${
        !isNull(visibleSection) ? `&section=${encodeURIComponent(visibleSection)}` : ''
      }${!isNull(visibleImage) ? `&image=${encodeURIComponent(visibleImage)}` : ''}${
        !isNull(visibleTarget) ? `&target=${encodeURIComponent(visibleTarget)}` : ''
      }`,
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const onClickSection = (name: string) => {
    setVisibleSection(name);
    setVisibleImage(null);
    setVisibleTarget(null);
    setExpandedTarget(null);
  };

  useEffect(() => {
    if (openStatus) {
      updateUrl();
    }
  }, [visibleTarget, visibleImage, visibleSection]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (openStatus && report && contentWrapper && contentWrapper.current && isUndefined(contentHeight)) {
      // Use modal-body height as padding to help scrolling to corrent position (targets and images)
      setContentHeight(contentWrapper.current.offsetHeight);
    }
  }, [contentHeight, contentWrapper, openStatus, report]);

  useEffect(() => {
    if ((openStatus || props.visibleSecurityReport) && !isUndefined(currentPkgId)) {
      onCloseModal();
    }
  }, [props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (props.visibleSecurityReport && !openStatus && isUndefined(currentPkgId)) {
      onOpenModal();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <div>
        {props.createdAt && !isFuture(props.createdAt) && (
          <div className={`my-2 ${styles.created}`}>
            <small className="text-uppercase text-muted">Last scan: </small> {moment.unix(props.createdAt).fromNow()}
          </div>
        )}

        <button className="btn btn-outline-secondary btn-sm" onClick={onOpenModal} aria-label="Open full report modal">
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
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Security report</div>}
          onClose={onCloseModal}
          open={openStatus}
          breakPoint="md"
        >
          <div ref={contentWrapper} className="m-3 h-100">
            <SectionBtn
              title="Summary"
              name="summary"
              className="mt-0 pb-2"
              visibleSection={props.visibleSection}
              onClick={() => onClickSection('summary')}
            />

            {props.totalVulnerabilities > 0 && (
              <>
                <SummaryTable report={report} hasWhitelistedContainers={props.hasWhitelistedContainers} />
              </>
            )}

            <SecuritySummary summary={props.summary} totalVulnerabilities={props.totalVulnerabilities} />

            {/* We wait until contentHeight is defined to be sure the scroll goes to the correct position */}
            {!isEmpty(report) && !isUndefined(contentHeight) && (
              <>
                <SectionBtn
                  title="Vulnerabilities details"
                  name="vulnerabilities"
                  className="mt-3"
                  visibleSection={props.visibleSection}
                  onClick={() => onClickSection('vulnerabilities')}
                />
                <div className="py-3">
                  {Object.keys(report).map((image: string, index: number) => {
                    return (
                      <div key={`image_${image}`} className={classnames({ 'mt-2': index !== 0 })}>
                        <SecurityTable
                          image={image}
                          reports={report[image].Results}
                          visibleImage={visibleImage}
                          setVisibleImage={setVisibleImage}
                          visibleTarget={visibleTarget}
                          setVisibleTarget={setVisibleTarget}
                          expandedTarget={expandedTarget}
                          setExpandedTarget={setExpandedTarget}
                          hasOnlyOneTarget={hasOnlyOneTarget}
                          lastReport={index === Object.keys(report).length - 1}
                          contentHeight={contentHeight}
                        />
                      </div>
                    );
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
