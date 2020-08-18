import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { CustomResourcesDefinition } from '../../types';
import CustomResourceDefinition from './CustomResourceDefinition';

const getMockResources = (fixtureId: string): CustomResourcesDefinition[] => {
  return require(`./__fixtures__/CustomResourceDefinition/${fixtureId}.json`) as CustomResourcesDefinition[];
};

describe('CustomResourceDefinition', () => {
  it('creates snapshot', () => {
    const mockResources = getMockResources('1');
    const result = render(<CustomResourceDefinition resources={mockResources} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component with example', () => {
      const mockResources = getMockResources('2');
      const { getByTestId, getByText } = render(<CustomResourceDefinition resources={mockResources} />);

      expect(getByTestId('resourceDefinition')).toBeInTheDocument();
      expect(getByText('View YAML example')).toBeInTheDocument();

      expect(getByText(mockResources[0].displayName!)).toBeInTheDocument();
      expect(getByText(mockResources[0].description)).toBeInTheDocument();
      expect(getByText(mockResources[0].kind)).toBeInTheDocument();
      expect(getByText(mockResources[0].name)).toBeInTheDocument();
      expect(getByText(mockResources[0].version)).toBeInTheDocument();
    });

    it('renders component without example', () => {
      const mockResources = getMockResources('3');
      const { getByTestId, getByText, queryByText } = render(<CustomResourceDefinition resources={mockResources} />);

      expect(getByTestId('resourceDefinition')).toBeInTheDocument();
      expect(queryByText('View YAML example')).toBeNull();

      expect(getByText(mockResources[0].displayName!)).toBeInTheDocument();
      expect(getByText(mockResources[0].description)).toBeInTheDocument();
      expect(getByText(mockResources[0].kind)).toBeInTheDocument();
      expect(getByText(mockResources[0].name)).toBeInTheDocument();
      expect(getByText(mockResources[0].version)).toBeInTheDocument();
    });

    it('opens example resource definition modal', () => {
      const mockResources = getMockResources('4');
      const { getAllByTestId, queryByRole, getByText } = render(<CustomResourceDefinition resources={mockResources} />);

      const modal = queryByRole('dialog');
      expect(modal).toBeNull();

      const modalOpenBtns = getAllByTestId('resourceDefinitionBtn');
      expect(modalOpenBtns).toHaveLength(4);
      fireEvent.click(modalOpenBtns[0]);

      waitFor(() => {
        expect(modal).toBeInTheDocument();
        expect(getByText(`${mockResources[0].displayName!} - YAML example`)).toBeInTheDocument();
      });
    });
  });
});
