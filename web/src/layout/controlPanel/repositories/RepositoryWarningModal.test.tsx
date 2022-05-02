import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RepositoryWarningModal from './RepositoryWarningModal';

describe('RepositoryWarningModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<RepositoryWarningModal />);

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<RepositoryWarningModal />);

      expect(screen.getByRole('button', { name: 'Open repository warning modal' })).toBeInTheDocument();
    });

    it('opens modal', async () => {
      render(<RepositoryWarningModal />);

      const btn = screen.getByRole('button', { name: 'Open repository warning modal' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toHaveClass('d-block');

      expect(screen.getByText('Warning info'));
      expect(
        screen.getByText(
          'This warning sign indicates that the tracking operation that took place at the processed time displayed failed. You can see more details about why it failed by opening the tracking errors log modal.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('30 minutes approximately')).toBeInTheDocument();
      expect(screen.getByText('changed since the last time they were processed')).toBeInTheDocument();
      expect(
        screen.getByText(
          "Depending on the nature of the error, an action on your side may be required or not. In the case of isolated network errors, you can ignore the warning and it'll be cleaned up automatically on the next successful tracking operation."
        )
      ).toBeInTheDocument();
    });
  });
});
