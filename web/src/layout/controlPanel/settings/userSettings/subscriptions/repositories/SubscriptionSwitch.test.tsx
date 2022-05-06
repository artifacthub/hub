import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EventKind } from '../../../../../../types';
import SubscriptionSwitch from './SubscriptionSwitch';

const changeSubscriptionMock = jest.fn();

const defaultProps = {
  kind: EventKind.RepositoryScanningErrors,
  repoInfo: {
    repositoryId: 'b4b4973f-08f0-430a-acb3-2c6ec5449495',
    name: 'hub',
    url: 'https://artifacthub.github.io/helm-charts/',
    private: false,
    kind: 0,
    verifiedPublisher: false,
    official: false,
    userAlias: 'user1',
  },
  enabled: true,
  changeSubscription: changeSubscriptionMock,
};

const optOutItem = {
  optOutId: '2e5080ee-91b1-41bb-b4dd-35d9718461d1',
  repository: {
    repositoryId: 'b4b4973f-08f0-430a-acb3-2c6ec5449495',
    name: 'hub',
    url: 'https://artifacthub.github.io/helm-charts/',
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
    const { asFragment } = render(<SubscriptionSwitch {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders inactive switch', () => {
      render(<SubscriptionSwitch {...defaultProps} />);

      const checkbox = screen.getByTestId(`subs_${defaultProps.repoInfo.repositoryId}_4_input`);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('renders active switch', () => {
      render(<SubscriptionSwitch {...defaultProps} optOutItem={optOutItem} />);

      const checkbox = screen.getByTestId(`subs_${defaultProps.repoInfo.repositoryId}_4_input`);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });

    it('calls change subscription', async () => {
      render(<SubscriptionSwitch {...defaultProps} />);

      const checkbox = screen.getByTestId(`subs_${defaultProps.repoInfo.repositoryId}_4_input`);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
      expect(checkbox).toBeEnabled();

      await userEvent.click(checkbox);

      expect(await screen.findByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(changeSubscriptionMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
