import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MoreActionsButton from './MoreActionsButton';

jest.mock('react-color', () => ({
  SketchPicker: () => <>sketch</>,
}));

describe('MoreActionsButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<MoreActionsButton />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<MoreActionsButton />);

      const btn = screen.getByRole('button', { name: /Show menu/ });
      expect(btn).toBeInTheDocument();
    });

    it('displays dropdown', async () => {
      render(<MoreActionsButton />);

      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).not.toHaveClass('show');

      const btn = screen.getByRole('button', { name: /Show menu/ });
      expect(btn).toBeInTheDocument();

      await userEvent.click(btn);

      expect(dropdown).toHaveClass('show');
      expect(screen.getByText('Embed results')).toBeInTheDocument();
    });

    it('opens modal', async () => {
      render(
        <>
          <meta name="artifacthub:siteName" content="test" />
          <MoreActionsButton />
        </>
      );

      const btn = screen.getByRole('button', { name: /Show menu/ });
      expect(btn).toBeInTheDocument();

      await userEvent.click(btn);

      const widgetBtn = await screen.findByRole('button', { name: /Open embed results modal/ });
      expect(widgetBtn).toBeInTheDocument();

      await userEvent.click(widgetBtn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
  });
});
