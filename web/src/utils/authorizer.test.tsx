import { waitFor } from '@testing-library/dom';
import { mocked } from 'jest-mock';

import API from '../api';
import { AuthorizerAction } from '../types';
import authorizer from './authorizer';
jest.mock('../api');

const allActions: AuthorizerAction[] = [AuthorizerAction.All];
const onCompletionMock = jest.fn();

describe('authorizer', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("does't call to getUserAllowedActions when selectedOrg is undefined", async () => {
    authorizer.init();

    await waitFor(() => {
      expect(API.getUserAllowedActions).toHaveBeenCalledTimes(0);
    });
  });

  it('calls to getUserAllowedActions when selectedOrg is defined', async () => {
    mocked(API).getUserAllowedActions.mockResolvedValue(allActions);
    authorizer.init('org1');

    await waitFor(() => {
      expect(API.getUserAllowedActions).toHaveBeenCalledTimes(1);
      expect(API.getUserAllowedActions).toHaveBeenCalledWith('org1');
    });
  });

  it('calls onCompletion', async () => {
    mocked(API).getUserAllowedActions.mockResolvedValue(allActions);
    authorizer.init('org1');
    authorizer.getAllowedActionsList(onCompletionMock);

    await waitFor(() => {
      expect(API.getUserAllowedActions).toHaveBeenCalledTimes(2);
      expect(API.getUserAllowedActions).toHaveBeenLastCalledWith('org1');
      expect(onCompletionMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('to update context', () => {
    it('calls again to getUserAllowedActions when a new org is defined', async () => {
      mocked(API).getUserAllowedActions.mockResolvedValue(allActions);
      authorizer.init('org1');

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledWith('org1');
      });

      authorizer.updateCtx('org2');

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledTimes(2);
        expect(API.getUserAllowedActions).toHaveBeenLastCalledWith('org2');
      });
    });

    it('does not call getUserAllowedActions again when selected org is the same', async () => {
      mocked(API).getUserAllowedActions.mockResolvedValue(allActions);
      authorizer.init('org1');

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledWith('org1');
      });

      authorizer.updateCtx('org1');

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call getUserAllowedActions when not selected org', async () => {
      mocked(API).getUserAllowedActions.mockResolvedValue(allActions);
      authorizer.init('org1');

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledWith('org1');
      });

      authorizer.updateCtx();

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledTimes(1);
      });
    });

    it('calls only one getUserAllowedActions when a new org is selected and previously not selected org', async () => {
      mocked(API).getUserAllowedActions.mockResolvedValue(allActions);
      authorizer.init();
      authorizer.updateCtx('org1');

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledTimes(1);
        expect(API.getUserAllowedActions).toHaveBeenCalledWith('org1');
      });
    });
  });

  describe('check authorizated actions', () => {
    it('calls getUserAllowedActions when selected org is different to saved one', async () => {
      mocked(API).getUserAllowedActions.mockResolvedValue(allActions);
      authorizer.init('org1');

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledTimes(1);
        expect(API.getUserAllowedActions).toHaveBeenCalledWith('org1');
      });

      authorizer.check({
        action: AuthorizerAction.DeleteOrganization,
        organizationName: 'org2',
        user: 'user1',
      });

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledTimes(2);
        expect(API.getUserAllowedActions).toHaveBeenLastCalledWith('org2');
      });
    });

    it('returns true when all actions are allowed', async () => {
      mocked(API).getUserAllowedActions.mockResolvedValue(allActions);
      authorizer.init('org1');

      await waitFor(() => {
        expect(API.getUserAllowedActions).toHaveBeenCalledTimes(1);
        expect(API.getUserAllowedActions).toHaveBeenCalledWith('org1');
      });

      const checked = authorizer.check({
        action: AuthorizerAction.DeleteOrganization,
        user: 'user1',
      });

      expect(checked).toBeTruthy();
    });

    it('returns true when action is allowed', async () => {});
    it('returns false when action is not allowed', async () => {});
  });
});
