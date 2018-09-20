import GRCh37 from './GRCh37';

// get the cytoband of a position on a chromosome
export const getCytoband = (chromosome, position) => {
  const chrom = GRCh37.top_level_region.find(d => d.name === chromosome);
  if (chrom) {
    const band = chrom.bands.find(d => d.start <= position && d.end > position);
    const [major] = band.id.split('.');
    if (band) {
      return `${chrom.name}${major}`;
    }
  }
  return null;
};

// ignore Y, MT and patches
export const chromosomeNames = [
  ...Array.from({ length: 22 }, (v, k) => `${k + 1}`),
  'X',
  'Y',
];

// calculate chromosomes with cumulative lengths (also as fraction)
const chromosomesWithLengths = chromosomeNames.map(chr => {
  const chrom = GRCh37.top_level_region.find(d => d.name === chr);
  return { name: chr, length: chrom.length };
});
const totalLength = chromosomesWithLengths.reduce((acc, d) => {
  acc += d.length;
  return acc;
}, 0);
let cumLength = 0;
export const chromosomesWithCumulativeLengths = chromosomesWithLengths.reduce(
  (acc, d) => {
    cumLength += d.length;
    acc.push({
      ...d,
      cumulativeLength: cumLength,
      proportionalStart: (cumLength - d.length) / totalLength,
      proportionalEnd: cumLength / totalLength,
    });
    return acc;
  },
  []
);

export const SIGNIFICANCE = -Math.log10(5e-8);
