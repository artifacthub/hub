import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

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
    const result = render(<WidgetsGroupModal {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<WidgetsGroupModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('light')).toBeInTheDocument();
      expect(screen.getByText('dark')).toBeInTheDocument();
      expect(screen.getByTestId('radio-theme-light')).toBeChecked();
      expect(screen.getByTestId('radio-theme-dark')).not.toBeChecked();
      expect(screen.getByText('Container width')).toBeInTheDocument();
      expect(screen.getByText('responsive')).toBeInTheDocument();
      expect(screen.getByText('fixed')).toBeInTheDocument();
      expect(screen.getByTestId('radio-wrapper-width-responsive')).toBeChecked();
      expect(screen.getByTestId('radio-wrapper-width-fixed')).not.toBeChecked();
      expect(screen.queryByTestId('fixedWidthInput')).toBeNull();
      expect(screen.getByText('Loading spinner')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-loading')).toBeChecked();
      expect(screen.getByText('Displays loading spinner while waiting for search results.')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Color used for widgets border, header and loading spinner.')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByTestId('block-content')).toHaveTextContent(
        '<div class="artifacthub-widget-group" data-url="http://localhost/" data-theme="light" data-header="false" data-color="#417598" data-responsive="true" data-loading="true"></div><script async src="http://localhost/artifacthub-widget.js"></script>'
      );
    });

    it('when not white label', () => {
      render(
        <>
          <meta name="artifacthub:siteName" content="artifact hub" />
          <WidgetsGroupModal {...defaultProps} />
        </>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-header')).not.toBeChecked();
      expect(screen.getByText('Displays Artifact Hub header at the top of the widget.')).toBeInTheDocument();
    });

    it('displays fixed width input', () => {
      render(<WidgetsGroupModal {...defaultProps} />);

      expect(screen.queryByTestId('fixedWidthInput')).toBeNull();
      const label = screen.getByText('fixed');
      const radioFixed = screen.getByTestId('radio-wrapper-width-fixed');
      expect(radioFixed).not.toBeChecked();
      userEvent.click(label);

      expect(radioFixed).toBeChecked();
      expect(screen.getByTestId('fixedWidthInput')).toBeInTheDocument();
    });

    it('updates block content to change different options', () => {
      render(<WidgetsGroupModal {...defaultProps} />);

      expect(screen.getByTestId('block-content')).toHaveTextContent(
        '<div class="artifacthub-widget-group" data-url="http://localhost/" data-theme="light" data-header="false" data-color="#417598" data-responsive="true" data-loading="true"></div><script async src="http://localhost/artifacthub-widget.js"></script>'
      );

      userEvent.click(screen.getByText('fixed'));
      userEvent.click(screen.getByTestId('checkbox-loading'));
      userEvent.type(screen.getByTestId('fixedWidthInput'), '1800');

      waitFor(() => {
        expect(screen.getByTestId('block-content')).toHaveTextContent(
          '<div class="artifacthub-widget-group" data-url="http://localhost/" data-theme="light" data-header="false" data-color="#417598" data-responsive="false" data-width="1800" data-loading="false"></div><script async src="http://localhost/artifacthub-widget.js"></script>'
        );
      });
    });
  });
});
