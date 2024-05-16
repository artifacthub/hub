import { RegoPlaygroundPolicy } from '../types';

interface RegoData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const prepareRegoPolicyForPlayground = (policy: string, data: RegoData, userAlias: string): RegoPlaygroundPolicy => {
  let formattedPolicy;
  try {
    formattedPolicy = policy.replaceAll('(\\r|\\n|\\r\\n)+', '\\\\n');
  } catch {
    formattedPolicy = policy;
  }

  return {
    rego_modules: {
      'policy.rego': formattedPolicy,
    },
    input: {
      user: userAlias,
    },
    data: data,
  };
};

export default prepareRegoPolicyForPlayground;
