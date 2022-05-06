import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import WidgetsGroupModal from './WidgetsGroupModal';

jest.mock('react-color', () => ({
  SketchPicker: () => <>sketch</>,
}));

const setOpenStatusMock = jest.fn();

const defaultProps = {
  visibleWidget: true,
  setOpenStatus: setOpenStatusMock,
};

describe('WidgetsGroupModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<WidgetsGroupModal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<WidgetsGroupModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('light')).toBeInTheDocument();
      expect(screen.getByText('dark')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /light/ })).toBeChecked();
      expect(screen.getByRole('radio', { name: /dark/ })).not.toBeChecked();
      expect(screen.getByText('Container width')).toBeInTheDocument();
      expect(screen.getByText('responsive')).toBeInTheDocument();
      expect(screen.getByText('fixed')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /responsive/ })).toBeChecked();
      expect(screen.getByRole('radio', { name: /fixed/ })).not.toBeChecked();
      expect(screen.getByRole('switch', { name: /Header/ })).not.toBeChecked();
      expect(screen.getByRole('switch', { name: /Loading spinner/ })).toBeChecked();
      expect(screen.getByText('Display loading spinner while waiting for search results.')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Color used for widgets border, header and loading spinner.')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Stars' })).toBeChecked();
      expect(screen.getByText('Stars')).toBeInTheDocument();
      expect(screen.getByText('Display number of stars given to the package.')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByTestId('block-content')).toHaveTextContent(
        '<div class="artifacthub-widget-group" data-url="http://localhost/" data-theme="light" data-header="false" data-stars="true" data-color="#417598" data-responsive="true" data-loading="true"></div><script async src="http://localhost/artifacthub-widget.js"></script>'
      );
    });

    it('when not header', () => {
      render(
        <>
          <meta name="artifacthub:siteName" content="artifact hub" />
          <WidgetsGroupModal {...defaultProps} />
        </>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /Header/ })).not.toBeChecked();
      expect(screen.getByText('Display Artifact Hub header at the top of the widget.')).toBeInTheDocument();
    });

    it('displays fixed width input', async () => {
      render(<WidgetsGroupModal {...defaultProps} />);

      expect(screen.queryByTestId('fixedWidthInput')).toBeNull();
      const label = screen.getByText('fixed');
      const radioFixed = screen.getByRole('radio', { name: /fixed/ });
      expect(radioFixed).not.toBeChecked();
      await userEvent.click(label);

      expect(radioFixed).toBeChecked();
      expect(screen.getByTestId('fixedWidthInput')).toBeInTheDocument();
    });

    it('updates block content to change different options', async () => {
      render(<WidgetsGroupModal {...defaultProps} />);

      expect(screen.getByTestId('block-content')).toHaveTextContent(
        '<div class="artifacthub-widget-group" data-url="http://localhost/" data-theme="light" data-header="false" data-stars="true" data-color="#417598" data-responsive="true" data-loading="true"></div><script async src="http://localhost/artifacthub-widget.js"></script>'
      );

      await userEvent.click(screen.getByText('fixed'));
      await userEvent.click(screen.getByRole('switch', { name: /Loading spinner/ }));
      await userEvent.type(screen.getByTestId('fixedWidthInput'), '0');

      expect(await screen.findByTestId('block-content')).toHaveTextContent(
        '<div class="artifacthub-widget-group" data-url="http://localhost/" data-theme="light" data-header="false" data-stars="true" data-color="#417598" data-responsive="false" data-width="7600" data-loading="false"></div><script async src="http://localhost/artifacthub-widget.js"></script>'
      );
    });
  });
});
