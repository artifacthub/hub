export default (data: { [key: string]: any } | string): string => {
  if (data) {
    return JSON.stringify(data, null, '  ');
  } else {
    return '';
  }
};
