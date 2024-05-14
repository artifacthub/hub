import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { MouseEvent as ReactMouseEvent, useContext, useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { AuthorizerAction, ErrorKind, Member } from '../../../types';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import Pagination from '../../common/Pagination';
import ActionBtn from '../ActionBtn';
import MemberCard from './Card';
import styles from './MembersSection.module.css';
import MemberModal from './Modal';

interface Props {
  activePage: string | null;
  onAuthError: () => void;
}

const DEFAULT_LIMIT = 10;

const MembersSection = (props: Props) => {
  const navigate = useNavigate();
  const { ctx } = useContext(AppCtx);
  const [isGettingMembers, setIsGettingMembers] = useState(false);
  const [members, setMembers] = useState<Member[] | undefined>(undefined);
  const [modalMemberOpen, setModalMemberOpen] = useState(false);
  const [confirmedMembersNumber, setConfirmedMembersNumber] = useState<number>(0);
  const [activeOrg, setActiveOrg] = useState<undefined | string>(ctx.prefs.controlPanel.selectedOrg);
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
    navigate(
      {
        search: `?page=${activePage}`,
      },
      { replace: true }
    );
  };

  const getConfirmedMembersNumber = (members: Member[]): number => {
    const confirmedMembers = members.filter((member: Member) => member.confirmed);
    return confirmedMembers.length;
  };

  async function fetchMembers() {
    try {
      setIsGettingMembers(true);
      const data = await API.getOrganizationMembers(
        {
          limit: DEFAULT_LIMIT,
          offset: offset,
        },
        activeOrg!
      );
      const total = parseInt(data.paginationTotalCount);
      if (total > 0 && data.items.length === 0) {
        onPageNumberChange(1);
      } else {
        setMembers(data.items);
        setTotal(total);
        setConfirmedMembersNumber(getConfirmedMembersNumber(data.items));
      }
      updatePageNumber();
      setApiError(null);
      setIsGettingMembers(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsGettingMembers(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setMembers([]);
        setApiError('An error occurred getting the organization members, please try again later.');
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    if (props.activePage && activePage !== parseInt(props.activePage)) {
      fetchMembers();
    }
  }, [activePage]);

  useEffect(() => {
    if (!isUndefined(members)) {
      if (activePage === 1) {
        // fetchMembers is forced when context changes
        fetchMembers();
      } else {
        // when current page is different to 1, to update page number fetchMembers is called
        onPageNumberChange(1);
      }
    }
  }, [activeOrg]);

  useEffect(() => {
    if (activeOrg !== ctx.prefs.controlPanel.selectedOrg) {
      setActiveOrg(ctx.prefs.controlPanel.selectedOrg);
    }
  }, [ctx.prefs.controlPanel.selectedOrg]);

  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <main
      role="main"
      className="px-xs-0 px-sm-3 px-lg-0 d-flex flex-column flex-md-row justify-content-between my-md-4"
    >
      <div className="flex-grow-1 w-100 mb-4">
        <div>
          <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom border-1">
            <div className={`h3 pb-0 ${styles.title}`}>Members</div>

            <div>
              <ActionBtn
                className={`btn btn-outline-secondary btn-sm text-uppercase ${styles.btnAction}`}
                contentClassName="justify-content-center"
                onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  setModalMemberOpen(true);
                }}
                action={AuthorizerAction.AddOrganizationMember}
                label="Open invite member modal"
              >
                <div className="d-flex flex-row align-items-center">
                  <MdAdd className="d-inline d-md-none" />
                  <MdAddCircle className="d-none d-md-inline me-2" />
                  <span className="d-none d-md-inline">Invite</span>
                </div>
              </ActionBtn>
            </div>
          </div>
        </div>

        {(isGettingMembers || isUndefined(members)) && <Loading />}

        <div className="mt-5">
          {!isUndefined(members) && (
            <>
              {members.length === 0 ? (
                <NoData issuesLinkVisible={!isNull(apiError)}>
                  {isNull(apiError) ? (
                    <>
                      <p className="h6 my-4 lh-base">Do you want to add a member?</p>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setModalMemberOpen(true)}
                        aria-label="Open modal"
                      >
                        <div className="d-flex flex-row align-items-center text-uppercase">
                          <MdAddCircle className="me-2" />
                          <span>Add member</span>
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
                    {members.map((member: Member) => (
                      <MemberCard
                        key={`member_${member.alias}`}
                        member={member}
                        onAuthError={props.onAuthError}
                        onSuccess={fetchMembers}
                        membersNumber={confirmedMembersNumber}
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

      {modalMemberOpen && (
        <MemberModal
          open={modalMemberOpen}
          membersList={members}
          onSuccess={fetchMembers}
          onAuthError={props.onAuthError}
          onClose={() => setModalMemberOpen(false)}
        />
      )}
    </main>
  );
};

export default MembersSection;
