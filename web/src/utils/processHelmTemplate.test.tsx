import { ChartTemplateSpecialType } from '../types';
import processHelmTemplate from './processHelmTemplate';

interface Test {
  input: string;
  output: ChartTemplateSpecialType | null;
}

const tests: Test[] = [
  { input: 'text', output: null },
  { input: '.Values.xxx', output: ChartTemplateSpecialType.ValuesBuiltInObject },
  { input: '"string"', output: ChartTemplateSpecialType.String },
  { input: '$variable', output: ChartTemplateSpecialType.Variable },
  { input: '.Capabilities.APIVersions.Has', output: ChartTemplateSpecialType.Function },
  { input: 'append', output: ChartTemplateSpecialType.Function },
  { input: 'kindOf', output: ChartTemplateSpecialType.Function },
  { input: 'isAbs', output: ChartTemplateSpecialType.Function },
  { input: '.Capabilities.Test', output: ChartTemplateSpecialType.BuiltInObject },
  { input: '.Release.Test', output: ChartTemplateSpecialType.BuiltInObject },
  { input: '.Chart.Test', output: ChartTemplateSpecialType.BuiltInObject },
  { input: 'tpl', output: ChartTemplateSpecialType.FlowControl },
];

describe('processHelmTemplate', () => {
  for (let i = 0; i < tests.length; i++) {
    it(`renders proper type for ${tests[i].input}`, () => {
      const actual = processHelmTemplate(tests[i].input);
      expect(actual).toBe(tests[i].output);
    });
  }
});
