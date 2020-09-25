import { RegoPlaygroundPolicy } from '../types';

interface RegoData {
  [key: string]: any;
}

export default (policy: string, data: RegoData, userAlias: string): RegoPlaygroundPolicy => {
  const formattedPolicy = policy.replaceAll('(\\r|\\n|\\r\\n)+', '\\\\n');

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
