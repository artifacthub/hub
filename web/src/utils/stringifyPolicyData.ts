// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stringifyPolicyData = (data: { [key: string]: any } | string): string => {
  if (data) {
    return JSON.stringify(data, null, '  ');
  } else {
    return '';
  }
};

export default stringifyPolicyData;
