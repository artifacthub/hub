import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { EventKind } from '../../../../../../types';
import SubscriptionSwitch from './SubscriptionSwitch';

const changeSubscriptionMock = jest.fn();

const defaultProps = {
  kind: EventKind.RepositoryScanningErrors,
  repoInfo: {
    repositoryId: 'b4b4973f-08f0-430a-acb3-2c6ec5449495',
    name: 'hub',
    url: 'https://artifacthub.github.io/hub/chart/',
    private: false,
    kind: 0,
    verifiedPublisher: false,
    official: false,
    userAlias: 'user1',
  },
  enabled: false,
  changeSubscription: changeSubscriptionMock,
};

const optOutItem = {
  optOutId: '2e5080ee-91b1-41bb-b4dd-35d9718461d1',
  repository: {
    repositoryId: 'b4b4973f-08f0-430a-acb3-2c6ec5449495',
    name: 'hub',
    url: 'https://artifacthub.github.io/hub/chart/',
    private: false,
    kind: 0,
    verifiedPublisher: false,
    official: false,
    userAlias: 'user1',
  },
  eventKind: 4,
};

describe('SubscriptionSwitch', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', () => {
    const result = render(<SubscriptionSwitch {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders inactive switch', () => {
      const { getByTestId } = render(<SubscriptionSwitch {...defaultProps} />);

      const checkbox = getByTestId(`subs_${defaultProps.repoInfo.repositoryId}_4_input`);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('renders active switch', () => {
      const { getByTestId } = render(<SubscriptionSwitch {...defaultProps} optOutItem={optOutItem} />);

      const checkbox = getByTestId(`subs_${defaultProps.repoInfo.repositoryId}_4_input`);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });

    it('calls change subscription', () => {
      const { getByTestId, getByRole } = render(<SubscriptionSwitch {...defaultProps} />);

      const label = getByTestId(`subs_${defaultProps.repoInfo.repositoryId}_4_label`);
      expect(label).toBeInTheDocument();
      fireEvent.click(label);

      waitFor(() => {
        expect(getByRole('status')).toBeInTheDocument();
        expect(getByTestId(`subs_${defaultProps.repoInfo.repositoryId}_4_input`)).toBeEnabled();
        expect(changeSubscriptionMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
