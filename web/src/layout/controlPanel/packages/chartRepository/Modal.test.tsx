import { render } from '@testing-library/react';
import React from 'react';

import { ChartRepository } from '../../../../types';
import Modal from './Modal';
jest.mock('../../../../api');

const defaultProps = {
  open: true,
  onAuthError: jest.fn(),
  onClose: jest.fn(),
};

const chartRepoMock: ChartRepository = {
  name: 'repoTest',
  displayName: 'Repo test',
  url: 'http://test.repo',
};

describe('Chart Repository Modal - packages section', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Modal {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByTestId } = render(<Modal {...defaultProps} />);

      const form = getByTestId('chartRepoForm');
      expect(form).toBeInTheDocument();
      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByTestId('displayNameInput')).toBeInTheDocument();
      expect(getByTestId('urlInput')).toBeInTheDocument();
    });

    it('renders component with existing chart repo', () => {
      const { getByTestId, getByDisplayValue } = render(<Modal {...defaultProps} chartRepository={chartRepoMock} />);

      const form = getByTestId('chartRepoForm');
      expect(form).toBeInTheDocument();
      expect(getByDisplayValue(chartRepoMock.name)).toBeInTheDocument();
      expect(getByDisplayValue(chartRepoMock.displayName!)).toBeInTheDocument();
      expect(getByDisplayValue(chartRepoMock.url)).toBeInTheDocument();
    });
  });
});
