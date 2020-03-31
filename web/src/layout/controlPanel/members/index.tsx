import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { MdAdd, MdAddCircle } from 'react-icons/md';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { Member } from '../../../types';
import Loading from '../../common/Loading';
import NoData from '../../common/NoData';
import MemberCard from './Card';
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
  const organization = ctx.org!;

  const getConfirmedMembersNumber = (members: Member[]): number => {
    const confirmedMembers = members.filter((member: Member) => member.confirmed);
    return confirmedMembers.length;
  };

  async function fetchMembers() {
    try {
      setIsGettingMembers(true);
      const membersList = await API.getOrganizationMembers(organization.name);
      setMembers(membersList);
      setConfirmedMembersNumber(getConfirmedMembersNumber(membersList));
      setIsGettingMembers(false);
    } catch (err) {
      setIsGettingMembers(false);
      if (err.statusText !== 'ErrLoginRedirect') {
        setMembers([]);
      } else {
        props.onAuthError();
      }
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <main role="main" className="container d-flex flex-column flex-md-row justify-content-between my-md-4 p-0">
      <div className="flex-grow-1 position-relative">
        <div>
          <div className="d-flex flex-row align-items-center justify-content-between">
            <div className="h3 pb-0">Members</div>

            <div>
              <button className="btn btn-secondary btn-sm text-uppercase" onClick={() => setModalMemberOpen(true)}>
                <div className="d-flex flex-row align-items-center justify-content-center">
                  <MdAdd className="d-inline d-md-none" />
                  <MdAddCircle className="d-none d-md-inline mr-2" />
                  <span className="d-none d-md-inline">Invite</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {(isGettingMembers || isUndefined(members)) && <Loading />}

        <div className="mt-4">
          {!isUndefined(members) && (
            <>
              {members.length === 0 ? (
                <NoData>
                  <>
                    <p className="h6 my-4">Do you want to add a member?</p>

                    <button type="button" className="btn btn-secondary" onClick={() => setModalMemberOpen(true)}>
                      <div className="d-flex flex-row align-items-center">
                        <MdAddCircle className="mr-2" />
                        <span>Add member</span>
                      </div>
                    </button>
                  </>
                </NoData>
              ) : (
                <div className="list-group mt-4">
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
          onSuccess={fetchMembers}
          onAuthError={props.onAuthError}
          onClose={() => setModalMemberOpen(false)}
        />
      )}
    </main>
  );
};

export default MembersSection;
