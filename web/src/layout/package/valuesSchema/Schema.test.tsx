import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

import compoundJSONSchemaYAML from '../../../utils/compoundJSONSchemaYAML';
import Schema from './Schema';

const defaultSchema = require('./__fixtures__/index/1.json') as JSONSchema;

const defaultProps = {
  pkgName: 'pkg',
  schema: defaultSchema,
  normalizedName: 'pkg-norm',
  onPathChange: jest.fn(),
};

describe('Schema', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Schema {...defaultProps} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getAllByTestId, getByText, getByTestId } = render(<Schema {...defaultProps} />);

      expect(getByText(`# ${defaultSchema.title}`)).toBeInTheDocument();
      const lines = getAllByTestId('schemaLine');
      expect(lines).toHaveLength(97);

      waitFor(() => {
        expect(compoundJSONSchemaYAML).toHaveBeenCalledTimes(1);

        expect(getByTestId('ctcBtn')).toBeInTheDocument();
        expect(getByTestId('downloadBtn')).toBeInTheDocument();
      });
    });
  });
});
