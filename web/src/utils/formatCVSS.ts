export default (vector: string): { [key: string]: string } => {
  const values = vector.split('/');
  const cvss = {};
  values.forEach((metric: string) => {
    const opt = metric.split(':');
    (cvss as any)[opt[0]] = opt[1];
  });

  return cvss;
};
