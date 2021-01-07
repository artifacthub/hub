import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { AuthorizerAction, ErrorKind, Member } from '../../../types';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import ActionBtn from '../ActionBtn';
import MemberCard from './Card';
import styles from './MembersSection.module.css';
import MemberModal from './Modal';

interface Props {
  onAuthError: () => void;
}

const MembersSection = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isGettingMembers, setIsGettingMembers] = useState(false);
  const [members, setMembers] = useState<Member[] | undefined>(undefined);
  const [modalMemberOpen, setModalMemberOpen] = useState(false);
  const [confirmedMembersNumber, setConfirmedMembersNumber] = useState<number>(0);
  const selectedOrg = ctx.prefs.controlPanel.selectedOrg;
  const [apiError, setApiError] = useState<null | string>(null);

  const getConfirmedMembersNumber = (members: Member[]): number => {
    const confirmedMembers = members.filter((member: Member) => member.confirmed);
    return confirmedMembers.length;
  };

  async function fetchMembers() {
    try {
      setIsGettingMembers(true);
      const membersList = await API.getOrganizationMembers(selectedOrg!);
      setMembers(membersList);
      setConfirmedMembersNumber(getConfirmedMembersNumber(membersList));
      setApiError(null);
      setIsGettingMembers(false);
    } catch (err) {
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
    fetchMembers();
  }, [selectedOrg]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <main
      role="main"
      className="px-xs-0 px-sm-3 px-lg-0 d-flex flex-column flex-md-row justify-content-between my-md-4"
    >
      <div className="flex-grow-1 w-100 mb-4">
        <div>
          <div className="d-flex flex-row align-items-center justify-content-between pb-2 border-bottom">
            <div className={`h3 pb-0 ${styles.title}`}>Members</div>

            <div>
              <ActionBtn
                testId="addMemberBtn"
                className={`btn btn-secondary btn-sm text-uppercase ${styles.btnAction}`}
                contentClassName="justify-content-center"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  setModalMemberOpen(true);
                }}
                action={AuthorizerAction.AddOrganizationMember}
              >
                <>
                  <MdAdd className="d-inline d-md-none" />
                  <MdAddCircle className="d-none d-md-inline mr-2" />
                  <span className="d-none d-md-inline">Invite</span>
                </>
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
                      <p className="h6 my-4">Do you want to add a member?</p>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setModalMemberOpen(true)}
                        data-testid="addFirstMemberBtn"
                      >
                        <div className="d-flex flex-row align-items-center">
                          <MdAddCircle className="mr-2" />
                          <span>Add member</span>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>{apiError}</>
                  )}
                </NoData>
              ) : (
                <div className="row mt-4 mt-md-5">
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
