export default (data: { [key: string]: any } | string): string => {
  return JSON.stringify(data, null, '  ');
};
