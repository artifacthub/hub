const formatCVSS = (vector: string): { [key: string]: string } => {
  const values = vector.split('/');
  const cvss = {};
  values.forEach((metric: string) => {
    const opt = metric.split(':');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cvss as any)[opt[0]] = opt[1];
  });

  return cvss;
};

export default formatCVSS;
