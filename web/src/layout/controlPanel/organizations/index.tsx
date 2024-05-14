import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import API from '../../../api';
import { ErrorKind, Organization } from '../../../types';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import Pagination from '../../common/Pagination';
import OrganizationCard from './Card';
import OrganizationModal from './Modal';
import styles from './OrganizationsSection.module.css';

interface ModalStatus {
  open: boolean;
  organization?: Organization;
}

interface Props {
  activePage: string | null;
  onAuthError: () => void;
}

const DEFAULT_LIMIT = 10;

const OrganizationsSection = (props: Props) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>({
    open: false,
  });
  const [organizations, setOrganizations] = useState<Organization[] | undefined>(undefined);
  const [apiError, setApiError] = useState<null | string>(null);

  const [activePage, setActivePage] = useState<number>(props.activePage ? parseInt(props.activePage) : 1);

  const calculateOffset = (pageNumber?: number): number => {
    return DEFAULT_LIMIT * ((pageNumber || activePage) - 1);
  };

  const [offset, setOffset] = useState<number>(calculateOffset());
  const [total, setTotal] = useState<number | undefined>(undefined);

  const onPageNumberChange = (pageNumber: number): void => {
    setOffset(calculateOffset(pageNumber));
    setActivePage(pageNumber);
  };

  const updatePageNumber = () => {
    navigate(`?page=${activePage}`, { replace: true });
  };

  async function fetchOrganizations() {
    try {
      setIsLoading(true);
      const data = await API.getUserOrganizations({
        limit: DEFAULT_LIMIT,
        offset: offset,
      });
      const total = parseInt(data.paginationTotalCount);
      if (total > 0 && data.items.length === 0) {
        onPageNumberChange(1);
      } else {
        setOrganizations(data.items);
        setTotal(total);
      }
      updatePageNumber();
      setApiError(null);
      setIsLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setOrganizations([]);
        setApiError('An error occurred getting your organizations, please try again later.');
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (props.activePage && activePage !== parseInt(props.activePage)) {
      fetchOrganizations();
    }
  }, [activePage]);

  return (
    <main
      role="main"
      className="px-xs-0 px-sm-3 px-lg-0 d-flex flex-column flex-md-row justify-content-between my-md-4"
    >
      <div className="flex-grow-1 w-100">
        <div>
          <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom border-1">
            <div className={`h3 pb-0 ${styles.title}`}>Organizations</div>

            <div>
              <button
                className={`btn btn-outline-secondary btn-sm text-uppercase ${styles.btnAction}`}
                onClick={() => setModalStatus({ open: true })}
                aria-label="Open modal"
              >
                <div className="d-flex flex-row align-items-center justify-content-center">
                  <MdAdd className="d-inline d-md-none" />
                  <MdAddCircle className="d-none d-md-inline me-2" />
                  <span className="d-none d-md-inline">Add</span>
                </div>
              </button>
            </div>
          </div>

          {(isLoading || isUndefined(organizations)) && <Loading />}

          {!isUndefined(organizations) && (
            <>
              {organizations.length === 0 ? (
                <NoData issuesLinkVisible={!isNull(apiError)}>
                  {isNull(apiError) ? (
                    <>
                      <p className="h6 my-4 lh-base">Do you need to create a organization?</p>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setModalStatus({ open: true })}
                        aria-label="Open modal for adding first organization"
                      >
                        <div className="d-flex flex-row align-items-center text-uppercase">
                          <MdAddCircle className="me-2" />
                          <span>Add new organization</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>{apiError}</>
                  )}
                </NoData>
              ) : (
                <>
                  <div className="row mt-4 mt-md-5 gx-0 gx-xxl-4">
                    {organizations.map((org: Organization, index: number) => (
                      <OrganizationCard
                        key={`org_${org.name}_${index}`}
                        organization={org}
                        onAuthError={props.onAuthError}
                        onSuccess={fetchOrganizations}
                      />
                    ))}
                  </div>
                  {!isUndefined(total) && (
                    <div className="mx-auto">
                      <Pagination
                        limit={DEFAULT_LIMIT}
                        offset={offset}
                        total={total}
                        active={activePage}
                        className="my-5"
                        onChange={onPageNumberChange}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <OrganizationModal
        {...modalStatus}
        onSuccess={fetchOrganizations}
        onAuthError={props.onAuthError}
        onClose={() => setModalStatus({ open: false })}
      />
    </main>
  );
};

export default OrganizationsSection;
