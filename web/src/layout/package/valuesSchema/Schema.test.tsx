import { JSONSchema } from '@apidevtools/json-schema-ref-parser';
import { render } from '@testing-library/react';
import React from 'react';

import Schema from './Schema';

const defaultSchema = require('./__fixtures__/index/1.json') as JSONSchema;

describe('Schema', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<Schema schema={defaultSchema} />);

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getAllByTestId, getByText } = render(<Schema schema={defaultSchema} />);

      expect(getByText(`# ${defaultSchema.title}`)).toBeInTheDocument();
      const lines = getAllByTestId('schemaLine');
      expect(lines).toHaveLength(97);
    });
  });
});
