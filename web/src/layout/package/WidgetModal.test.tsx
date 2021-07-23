import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import WidgetModal from './WidgetModal';

jest.mock('react-color', () => ({
  SketchPicker: () => <>sketch</>,
}));

const setOpenStatusMock = jest.fn();

const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    replace: mockHistoryReplace,
  }),
}));

const defaultProps = {
  packageId: 'id',
  packageName: 'pkg',
  packageDescription: 'this is the description',
  visibleWidget: true,
  setOpenStatus: setOpenStatusMock,
};

describe('WidgetModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<WidgetModal {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<WidgetModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('light')).toBeInTheDocument();
      expect(screen.getByText('dark')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'light' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'dark' })).not.toBeChecked();
      expect(screen.getByText('Responsive')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Responsive' })).not.toBeChecked();
      expect(
        screen.getByText(
          'The widget will try to use the width available on the parent container (between 350px and 650px).'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByTestId('block-content')).toHaveTextContent(
        '<div class="artifacthub-widget" data-url="http://localhost/" data-theme="light" data-header="true" data-responsive="false"><blockquote><p lang="en" dir="ltr"><b>pkg</b>: this is the description</p>&mdash; Open in <a href="http://localhost/">null</a></blockquote></div><script async src="http://localhost/artifacthub-widget.js"></script>'
      );

      waitFor(() => {
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({
          search: '?modal=widget',
          state: {
            fromStarredPage: undefined,
            searchUrlReferer: undefined,
          },
        });
      });
    });

    it('when not white label', () => {
      render(
        <>
          <meta name="artifacthub:siteName" content="artifact hub" />
          <WidgetModal {...defaultProps} />
        </>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Header' })).toBeChecked();
      expect(screen.getByText('Displays Artifact Hub header at the top of the widget.')).toBeInTheDocument();
    });

    it('updates block content to change different options', () => {
      render(<WidgetModal {...defaultProps} />);

      expect(screen.getByTestId('block-content')).toHaveTextContent(
        '<div class="artifacthub-widget" data-url="http://localhost/" data-theme="light" data-header="true" data-responsive="false"><blockquote><p lang="en" dir="ltr"><b>pkg</b>: this is the description</p>&mdash; Open in <a href="http://localhost/">null</a></blockquote></div><script async src="http://localhost/artifacthub-widget.js"></script>'
      );

      userEvent.click(screen.getByText('dark'));
      userEvent.click(screen.getByText('Responsive'));

      expect(screen.getByTestId('block-content')).toHaveTextContent(
        '<div class="artifacthub-widget" data-url="http://localhost/" data-theme="dark" data-header="true" data-responsive="false"><blockquote><p lang="en" dir="ltr"><b>pkg</b>: this is the description</p>&mdash; Open in <a href="http://localhost/">null</a></blockquote></div><script async src="http://localhost/artifacthub-widget.js"></script>'
      );
    });
  });
});
