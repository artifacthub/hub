import classnames from 'classnames';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import { HiClipboardList } from 'react-icons/hi';
import { useLocation, useNavigate } from 'react-router-dom';

import API from '../../../api';
import { FixableVulnerabilitiesInReport, RepositoryKind, SecurityReport, SecurityReportSummary } from '../../../types';
import alertDispatcher from '../../../utils/alertDispatcher';
import isFuture from '../../../utils/isFuture';
import {
  filterFixableVulnerabilities,
  prepareFixableSummary,
  prepareUniqueVulnerabilitiesSummary,
} from '../../../utils/vulnerabilities';
import Modal from '../../common/Modal';
import styles from './Modal.module.css';
import OldVulnerabilitiesWarning from './OldVulnerabilitiesWarning';
import SectionBtn from './SectionBtn';
import SecuritySummary from './Summary';
import SummaryTable from './SummaryTable';
import SecurityTable from './Table';

interface Props {
  repoKind: RepositoryKind;
  summary: SecurityReportSummary;
  totalVulnerabilities: number;
  packageId: string;
  version: string;
  createdAt?: number;
  visibleSecurityReport: boolean;
  visibleImage?: string | null;
  visibleTarget?: string | null;
  visibleSection?: string | null;
  eventId?: string | null;
  hasWhitelistedContainers: boolean;
}

const SecurityModal = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentWrapper = useRef<HTMLDivElement>(null);
  const [currentPkgId, setCurrentPkgId] = useState<string | undefined>(undefined);
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [report, setReport] = useState<SecurityReport | null | undefined>();
  const [fixableReport, setFixableReport] = useState<SecurityReport | null | undefined>();
  const [visibleImage, setVisibleImage] = useState<string | null>(props.visibleImage || null);
  const [visibleTarget, setVisibleTarget] = useState<string | null>(props.visibleTarget || null);
  const [visibleSection, setVisibleSection] = useState<string | null>(props.visibleSection || null);
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);
  const [hasOnlyOneTarget, setHasOnlyOneTarget] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const [fixableReportSummary, setFixableReportSummary] = useState<FixableVulnerabilitiesInReport | undefined>();
  const [uniqueSummary, setUniqueSummary] = useState<SecurityReportSummary | null>(null);
  const [totalUniqueVulnerabilities, setTotalUniqueVulnerabilities] = useState<number>(0);
  const [showOnlyFixableVulnerabilities, setShowOnlyFixableVulnerabilities] = useState<boolean>(false);
  const allVulnerabilitiesAreFixable =
    !isUndefined(fixableReportSummary) && fixableReportSummary.total === props.totalVulnerabilities;

  const activateTargetWhenIsOnlyOne = (currentReport?: SecurityReport | null) => {
    if (currentReport) {
      const images = Object.keys(currentReport);
      if (images.length === 1) {
        const results = currentReport[images[0]].Results;
        if (
          results.length === 1 &&
          currentReport[images[0]].Results[0].Vulnerabilities &&
          currentReport[images[0]].Results[0].Vulnerabilities!.length > 0
        ) {
          setExpandedTarget(`${images[0]}_${currentReport[images[0]].Results[0].Target}`);
          setHasOnlyOneTarget(true);
        }
      }
    }
  };

  async function getSecurityReports(eventId?: string | null) {
    try {
      setIsLoading(true);
      const currentReport = await API.getSnapshotSecurityReport(props.packageId, props.version, eventId);
      setCurrentPkgId(props.packageId);
      setReport(currentReport);
      const fixableVulnerabilities = filterFixableVulnerabilities(currentReport);
      setFixableReport(fixableVulnerabilities);
      setFixableReportSummary(prepareFixableSummary(fixableVulnerabilities));
      const uniqueVulnerabilities = prepareUniqueVulnerabilitiesSummary(currentReport);
      if (!isNull(uniqueVulnerabilities)) {
        setUniqueSummary(uniqueVulnerabilities.summary);
        setTotalUniqueVulnerabilities(uniqueVulnerabilities.total);
      }
      activateTargetWhenIsOnlyOne(currentReport);
      setIsLoading(false);
      setOpenStatus(true);
      updateUrl();
    } catch {
      setReport(null);
      setFixableReport(null);
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
    setFixableReport(undefined);
    setVisibleImage(null);
    setVisibleTarget(null);
    setVisibleSection(null);
    setExpandedTarget(null);
    setShowOnlyFixableVulnerabilities(false);
    navigate('', {
      state: location.state,
      replace: true,
    });
  };

  const updateUrl = () => {
    navigate(
      {
        search: `?modal=security-report${
          !isNull(visibleSection) ? `&section=${encodeURIComponent(visibleSection)}` : ''
        }${!isNull(visibleImage) ? `&image=${encodeURIComponent(visibleImage)}` : ''}${
          !isNull(visibleTarget) ? `&target=${encodeURIComponent(visibleTarget)}` : ''
        }`,
      },
      {
        state: location.state,
        replace: true,
      }
    );
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
  }, [visibleTarget, visibleImage, visibleSection]);

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
  }, [props.packageId]);

  useEffect(() => {
    if (props.visibleSecurityReport && !openStatus && isUndefined(currentPkgId)) {
      onOpenModal();
    }
  }, []);

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
                <span className="ms-2">Getting report...</span>
              </>
            ) : (
              <>
                <HiClipboardList className="me-2" />
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
          footerClassName={styles.modalFooter}
        >
          <div ref={contentWrapper} className="m-3 h-100">
            <SectionBtn
              title="Summary"
              name="summary"
              className="mt-0 pb-2"
              visibleSection={props.visibleSection}
              onClick={() => onClickSection('summary')}
            />

            {/* Warning */}
            <OldVulnerabilitiesWarning fixableReport={fixableReport} />

            {props.totalVulnerabilities > 0 && !isUndefined(fixableReportSummary) && (
              <>
                <SummaryTable
                  report={report}
                  fixableVulnerabilities={fixableReportSummary}
                  hasWhitelistedContainers={props.hasWhitelistedContainers}
                  allVulnerabilitiesAreFixable={allVulnerabilitiesAreFixable}
                />
              </>
            )}

            {!isUndefined(fixableReportSummary) && (
              <SecuritySummary
                repoKind={props.repoKind}
                summary={props.summary}
                totalVulnerabilities={props.totalVulnerabilities}
                fixableSummary={fixableReportSummary.summary}
                totalFixableVulnerabilities={fixableReportSummary.total}
                allVulnerabilitiesAreFixable={allVulnerabilitiesAreFixable}
                uniqueSummary={uniqueSummary}
                totalUniqueVulnerabilities={totalUniqueVulnerabilities}
              />
            )}

            {/* We wait until contentHeight is defined to be sure the scroll goes to the correct position */}
            {!isEmpty(report) && !isUndefined(contentHeight) && (
              <>
                <SectionBtn
                  title="Vulnerabilities details"
                  name="vulnerabilities"
                  className="mt-3"
                  visibleSection={props.visibleSection}
                  onClick={() => onClickSection('vulnerabilities')}
                  rightElement={
                    !allVulnerabilitiesAreFixable ? (
                      <div className={`form-check form-switch ${styles.clickable}`}>
                        <input
                          id="fixable-vulnerabilities"
                          type="checkbox"
                          role="switch"
                          className={`form-check-input ${styles.checkbox}`}
                          onChange={() => {
                            setShowOnlyFixableVulnerabilities(!showOnlyFixableVulnerabilities);
                          }}
                          checked={showOnlyFixableVulnerabilities}
                        />
                        <label className="form-check-label" htmlFor="fixable-vulnerabilities">
                          Only display fixable vulnerabilities
                        </label>
                      </div>
                    ) : undefined
                  }
                />

                {report && (
                  <div className="py-3">
                    {Object.keys(report).map((image: string, index: number) => {
                      return (
                        <div key={`image_${image}`} className={classnames({ 'mt-2': index !== 0 })}>
                          <SecurityTable
                            image={image}
                            reports={report[image].Results}
                            fixableReports={fixableReport ? fixableReport[image].Results : []}
                            visibleImage={visibleImage}
                            setVisibleImage={setVisibleImage}
                            visibleTarget={visibleTarget}
                            setVisibleTarget={setVisibleTarget}
                            expandedTarget={expandedTarget}
                            setExpandedTarget={setExpandedTarget}
                            hasOnlyOneTarget={hasOnlyOneTarget}
                            lastReport={index === Object.keys(report).length - 1}
                            contentHeight={contentHeight}
                            showOnlyFixableVulnerabilities={showOnlyFixableVulnerabilities}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default SecurityModal;
