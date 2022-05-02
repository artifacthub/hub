import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ExternalLink from './ExternalLink';

const defaultProps = {
  children: <span>external</span>,
  href: 'http://test.com',
};

const openMock = jest.fn();
window.open = openMock;

describe('External link', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ExternalLink {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<ExternalLink {...defaultProps} />);
    const link = screen.getByRole('button');
    expect(link).toBeInTheDocument();
    expect(link).toHaveProperty('target', '_blank');
    expect(link).toHaveProperty('href', `${defaultProps.href}/`);
    expect(link).toHaveProperty('rel', 'noopener noreferrer');
  });

  it('renders proper content when btnType is enabled', async () => {
    const props = {
      ...defaultProps,
      btnType: true,
    };
    render(<ExternalLink {...props} />);
    const link = screen.getByRole('button');
    expect(link).toBeInTheDocument();
    expect(link).toHaveProperty('type', 'button');

    await userEvent.click(link);
    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith('http://test.com', '_blank');
  });
});
