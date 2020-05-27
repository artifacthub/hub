import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { IoMdRefresh, IoMdRefreshCircle } from 'react-icons/io';
import { MdAdd, MdAddCircle } from 'react-icons/md';

import { API } from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ChartRepository as ChartRepo } from '../../../../types';
import Loading from '../../../common/Loading';
import NoData from '../../../common/NoData';
import ChartRepositoryCard from './Card';
import styles from './ChartRepository.module.css';
import ChartRepositoryModal from './Modal';

interface ModalStatus {
  open: boolean;
  chartRepository?: ChartRepo;
}

interface Props {
  onAuthError: () => void;
}

const ChartRepository = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isLoading, setIsLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>({
    open: false,
  });
  const [chartRepositories, setChartRepositories] = useState<ChartRepo[] | undefined>(undefined);
  const [activeOrg, setActiveOrg] = useState<undefined | string>(ctx.prefs.controlPanel.selectedOrg);
  const [apiError, setApiError] = useState<null | string>(null);

  async function fetchCharts() {
    try {
      setIsLoading(true);
      setChartRepositories(await API.getChartRepositories(activeOrg));
      setApiError(null);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      if (err.statusText !== 'ErrLoginRedirect') {
        setApiError('An error occurred getting the chart repositories, please try again later');
        setChartRepositories([]);
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    fetchCharts();
  }, [activeOrg]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    setActiveOrg(ctx.prefs.controlPanel.selectedOrg);
  }, [ctx.prefs.controlPanel.selectedOrg]);

  return (
    <>
      <div>
        <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom">
          <div className={`h3 pb-0 ${styles.title}`}>Chart repositories</div>

          <div>
            <button
              data-testid="refreshRepoBtn"
              className={`btn btn-secondary btn-sm text-uppercase mr-0 mr-md-2 ${styles.btnAction}`}
              onClick={fetchCharts}
            >
              <div className="d-flex flex-row align-items-center justify-content-center">
                <IoMdRefresh className="d-inline d-md-none" />
                <IoMdRefreshCircle className="d-none d-md-inline mr-2" />
                <span className="d-none d-md-inline">Refresh</span>
              </div>
            </button>

            <button
              className={`btn btn-secondary btn-sm text-uppercase ${styles.btnAction}`}
              onClick={() => setModalStatus({ open: true })}
            >
              <div className="d-flex flex-row align-items-center justify-content-center">
                <MdAdd className="d-inline d-md-none" />
                <MdAddCircle className="d-none d-md-inline mr-2" />
                <span className="d-none d-md-inline">Add</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {modalStatus.open && (
        <ChartRepositoryModal
          open={modalStatus.open}
          chartRepository={modalStatus.chartRepository}
          onSuccess={fetchCharts}
          onAuthError={props.onAuthError}
          onClose={() => setModalStatus({ open: false })}
        />
      )}

      {(isLoading || isUndefined(chartRepositories)) && <Loading />}

      {!isUndefined(chartRepositories) && (
        <>
          {chartRepositories.length === 0 ? (
            <NoData issuesLinkVisible={!isNull(apiError)}>
              {isNull(apiError) ? (
                <>
                  <p className="h6 my-4">Add your first chart repository!</p>

                  <button
                    data-testid="addFirstRepoBtn"
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalStatus({ open: true })}
                  >
                    <div className="d-flex flex-row align-items-center">
                      <MdAddCircle className="mr-2" />
                      <span>Add chart repository</span>
                    </div>
                  </button>
                </>
              ) : (
                <>{apiError}</>
              )}
            </NoData>
          ) : (
            <div className="list-group mt-4 mt-md-5" data-testid="chartRepoList">
              {chartRepositories.map((repo: ChartRepo) => (
                <ChartRepositoryCard
                  key={repo.name}
                  chartRepository={repo}
                  setModalStatus={setModalStatus}
                  onSuccess={fetchCharts}
                  onAuthError={props.onAuthError}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ChartRepository;
