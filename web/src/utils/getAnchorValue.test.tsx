import getAnchorValue from './getAnchorValue';

interface Test {
  input: string;
  result?: string;
}

const tests: Test[] = [
  { input: '', result: '' },
  { input: 'Title', result: 'title' },
  { input: 'Unexpected spawned process', result: 'unexpected-spawned-process' },
  { input: 'Configure TLS', result: 'configure-tls' },
  { input: 'TL;DR;', result: 'tl-dr' },
  { input: 'Git-Sync sidecar container', result: 'git-sync-sidecar-container' },
  { input: 'Init-container git connection ssh', result: 'init-container-git-connection-ssh' },
  { input: 'To 2.8.3+', result: 'to-2-8-3' },
  {
    input: "Let's Encrypt domain verification using DNS challenge",
    result: 'let-s-encrypt-domain-verification-using-dns-challenge',
  },
  { input: 'Example: AWS Route 53', result: 'example-aws-route-53' },
  { input: 'FAQs', result: 'faqs' },
  { input: '📜 Using the Chart', result: '-using-the-chart' },
  {
    input: '2. Configure Linux® multipath devices on the host.',
    result: 'X-configure-linux-multipath-devices-on-the-host',
  },
  {
    input: '可选：微信推送打卡结果',
    result: '可选-微信推送打卡结果',
  },
  {
    input: '[2.3.1]',
    result: 'X-3-1',
  },
  {
    input: 'I am receiving "Invalid pattern for given tag"',
    result: 'i-am-receiving-invalid-pattern-for-given-tag',
  },
];

describe('getAnchorValue', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper string', () => {
      const actual = getAnchorValue(tests[i].input);
      expect(actual).toEqual(tests[i].result);
    });
  }
});
