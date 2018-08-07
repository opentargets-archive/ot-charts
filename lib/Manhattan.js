import React from 'react';
import * as d3 from 'd3';
import { withContentRect } from 'react-measure';

import ChartPlaceholder from './ChartPlaceholder';

// TODO: use GRCh37 instead
const GRCh38 = [
  { name: '1', length: 248956422 },
  { name: '2', length: 242193529 },
  { name: '3', length: 198295559 },
  { name: '4', length: 190214555 },
  { name: '5', length: 181538259 },
  { name: '6', length: 170805979 },
  { name: '7', length: 159345973 },
  { name: '8', length: 145138636 },
  { name: '9', length: 138394717 },
  { name: '10', length: 133797422 },
  { name: '11', length: 135086622 },
  { name: '12', length: 133275309 },
  { name: '13', length: 114364328 },
  { name: '14', length: 107043718 },
  { name: '15', length: 101991189 },
  { name: '16', length: 90338345 },
  { name: '17', length: 83257441 },
  { name: '18', length: 80373285 },
  { name: '19', length: 58617616 },
  { name: '20', length: 64444167 },
  { name: '21', length: 46709983 },
  { name: '22', length: 50818468 },
  { name: 'X', length: 156040895 },
];
const totalLength = GRCh38.reduce((acc, d) => {
  acc += d.length;
  return acc;
}, 0);
let cumLength = 0;
const GRCh38Cum = GRCh38.reduce((acc, d) => {
  cumLength += d.length;
  acc.push({
    ...d,
    cumulativeLength: cumLength,
    proportionalStart: (cumLength - d.length) / totalLength,
    proportionalEnd: cumLength / totalLength,
  });
  return acc;
}, []);
const GRCh38Names = GRCh38.map(d => d.name);
let idGenerator = 1;

const CHROMOSOME_PADDING = 2;

class Manhattan extends React.Component {
  constructor(props) {
    super(props);
    this.svgRef = React.createRef();
    this.state = {
      margins: {
        top: 50,
        bottom: 80,
        left: 80,
        right: 50,
      },
      scaleMinusLogPValue: d3.scaleLinear(),
      scaleChromosomes: GRCh38Cum.reduce((acc, d) => {
        acc[d.name] = {
          ...d,
          scale: d3.scaleLinear().domain([1, d.length]),
        };
        return acc;
      }, {}),
      focusChromosome: null,
      chartIndex: idGenerator++,
    };
  }
  componentDidMount() {
    this._render();
  }
  componentDidUpdate() {
    this._render();
  }
  render() {
    const { measureRef } = this.props;
    const { width, height } = this._dimensions();
    // const aspectRatio = 6;
    // const height = width ? width / aspectRatio : null;
    return (
      <div ref={measureRef}>
        <svg width={width} height={height} ref={node => (this.svgRef = node)} />
      </div>
    );
  }
  _dimensions() {
    const { contentRect } = this.props;
    const { width } = contentRect.bounds;

    // note: using fixed height, but could use aspect ratio
    const height = 400;
    return { width, height };
  }
  _render() {
    // avoid errors on empty data or null width
    const { data, handleAssociationClick } = this.props;
    const { width, height } = this._dimensions();
    if (
      !data ||
      !data.associations ||
      data.associations.length === 0 ||
      !width ||
      !height
    ) {
      return;
    }

    const {
      margins,
      scaleMinusLogPValue,
      scaleChromosomes,
      focusChromosome,
      chartIndex,
    } = this.state;
    const svg = d3.select(this.svgRef);

    // data area
    const dataAreaWidth = width - margins.left - margins.right;
    const dataAreaHeight = height - margins.top - margins.bottom;

    // clip path
    this._renderClipPath(svg, dataAreaWidth, height, chartIndex);

    // render conditionally dependent on whether a chromosome is selected
    if (focusChromosome) {
      // scales
      scaleMinusLogPValue
        .domain([
          0,
          d3.max(
            data.associations.filter(d => d.chromosome === focusChromosome),
            d => -Math.log10(d.pval)
          ),
        ])
        .range([dataAreaHeight, 0]);
      Object.values(scaleChromosomes).forEach(chromosome => {
        const { scale, proportionalStart, proportionalEnd } = chromosome;
        if (chromosome.name === focusChromosome) {
          scale.range([CHROMOSOME_PADDING, dataAreaWidth - CHROMOSOME_PADDING]);
        } else if (
          GRCh38Names.indexOf(chromosome.name) <
          GRCh38Names.indexOf(focusChromosome)
        ) {
          scale.range([-2 * dataAreaWidth, -dataAreaWidth]);
        } else if (
          GRCh38Names.indexOf(chromosome.name) >
          GRCh38Names.indexOf(focusChromosome)
        ) {
          scale.range([2 * dataAreaWidth, 3 * dataAreaWidth]);
        }
      });
    } else {
      // scales
      scaleMinusLogPValue
        .domain([0, d3.max(data.associations, d => -Math.log10(d.pval))])
        .range([dataAreaHeight, 0]);
      Object.values(scaleChromosomes).forEach(chromosome => {
        const { scale, proportionalStart, proportionalEnd } = chromosome;
        scale.range([
          proportionalStart * dataAreaWidth + CHROMOSOME_PADDING,
          proportionalEnd * dataAreaWidth - CHROMOSOME_PADDING,
        ]);
      });
    }

    // axes
    this._renderAxisMinusLogPValue(svg, scaleMinusLogPValue, [
      margins.left,
      margins.top,
    ]);
    Object.values(scaleChromosomes).forEach(chromosome => {
      this._renderAxisChromosome(svg, chromosome, chartIndex, [
        margins.left,
        margins.top + dataAreaHeight,
      ]);
    });

    // axis labels
    this._renderAxisLabelMinusLogPValue(svg, [margins.left, margins.top]);
    Object.values(scaleChromosomes).forEach(chromosome => {
      this._renderAxisLabelChromosome(svg, chromosome, chartIndex, [
        margins.left,
        margins.top + dataAreaHeight,
      ]);
    });

    // data
    this._renderLociVoronoi(
      svg,
      data.associations,
      scaleChromosomes,
      scaleMinusLogPValue,
      handleAssociationClick,
      chartIndex,
      dataAreaWidth,
      dataAreaHeight,
      [margins.left, margins.top]
    );
    this._renderLoci(
      svg,
      data.associations,
      scaleChromosomes,
      scaleMinusLogPValue,
      handleAssociationClick,
      chartIndex,
      [margins.left, margins.top]
    );
  }
  _renderClipPath(svg, dataAreaWidth, height, chartIndex) {
    // render in own group
    let clip = svg.select('clipPath');
    if (clip.empty()) {
      clip = svg
        .append('clipPath')
        .attr('id', `manhattan-clip-path-${chartIndex}`);
      clip.append('rect');
    }
    clip
      .select('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', dataAreaWidth)
      .attr('height', height);
  }
  _renderAxisMinusLogPValue(svg, scale, translation) {
    // create axis
    const axis = d3.axisLeft(scale);

    // render in own group
    let g = svg.select('.axis.axis--minus-log-p-value');
    if (g.empty()) {
      g = svg.append('g').classed('axis axis--minus-log-p-value', true);
    }
    g.attr('transform', `translate(${translation})`)
      .transition()
      .call(axis);
  }
  _renderAxisLabelMinusLogPValue(svg, translation) {
    // render in own group
    let g = svg.select('.axis-label.axis-label--minus-log-p-value');
    if (g.empty()) {
      g = svg
        .append('g')
        .classed('axis-label axis-label--minus-log-p-value', true);
      g.append('text')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 12)
        .attr('dy', -40)
        .attr('text-anchor', 'end')
        .text('-log₁₀(p-value)');
    }
    g.attr('transform', `translate(${translation}) rotate(-90)`);
  }
  _renderAxisChromosome(svg, chromosome, chartIndex, translation) {
    // create axis
    const axis = d3.axisBottom(chromosome.scale).tickValues([]);

    // render in own group
    let g = svg.selectAll(
      `.axis.axis--chromosome.axis--chromosome-${chromosome.name}`
    );
    if (g.empty()) {
      g = svg
        .append('g')
        .classed(
          `axis axis--chromosome axis--chromosome-${chromosome.name}`,
          true
        )
        .attr('clip-path', `url(#manhattan-clip-path-${chartIndex})`);
    }
    g.attr('transform', `translate(${translation})`)
      .transition()
      .call(axis);
  }
  _renderAxisLabelChromosome(svg, chromosome, chartIndex, translation) {
    // render in own group
    let g = svg.select(
      `.axis-label.axis-label--chromosome.axis-label--chromosome-${
        chromosome.name
      }`
    );
    if (g.empty()) {
      g = svg
        .append('g')
        .classed(
          `axis-label axis-label--chromosome axis-label--chromosome-${
            chromosome.name
          }`,
          true
        )
        .attr('clip-path', `url(#manhattan-clip-path-${chartIndex})`);
      g.append('rect')
        .attr('fill', 'white')
        .on('click', () => this._handleChromosomeClick(chromosome))
        .on('mouseover', function() {
          const r = d3.select(this);
          r.attr('fill', 'lightgrey');
        })
        .on('mouseout', function() {
          const r = d3.select(this);
          r.attr('fill', 'white');
        });
      g.append('text')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 12)
        .attr('dy', 20)
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .text(chromosome.name);
    }
    g.attr('transform', `translate(${translation})`);
    g.select('rect')
      .transition()
      .attr('x', chromosome.scale.range()[0] + 1)
      .attr('y', 1)
      .attr(
        'width',
        chromosome.scale.range()[1] -
          chromosome.scale.range()[0] -
          CHROMOSOME_PADDING
      )
      .attr('height', 35);
    g.select('text')
      .transition()
      .attr('x', chromosome.scale.range().reduce((a, b) => 0.5 * (a + b)))
      .attr('y', 0);
  }
  _renderLoci(
    svg,
    associations,
    scaleChromosomes,
    scaleMinusLogPValue,
    handleAssociationClick,
    chartIndex,
    translation
  ) {
    // render in own group
    let g = svg.select(`.loci`);
    if (g.empty()) {
      g = svg
        .append('g')
        .classed('loci', true)
        .attr('clip-path', `url(#manhattan-clip-path-${chartIndex})`);
    }
    g.attr('transform', `translate(${translation})`);

    // join
    const loci = g.selectAll('line').data(associations);

    loci
      .enter()
      .append('line')
      .attr('stroke', 'blue')
      .attr('stroke-width', 2)
      .merge(loci)
      .on('click', handleAssociationClick)
      .on('mouseover', function() {
        const l = d3.select(this);
        l.attr('stroke', 'red');
      })
      .on('mouseout', function() {
        const l = d3.select(this);
        l.attr('stroke', 'blue');
      })
      .transition()
      .attr('x1', d => scaleChromosomes[d.chromosome].scale(d.position))
      .attr('y1', scaleMinusLogPValue(0))
      .attr('x2', d => scaleChromosomes[d.chromosome].scale(d.position))
      .attr('y2', d => scaleMinusLogPValue(-Math.log10(d.pval)));

    loci.exit().remove();
  }
  _renderLociVoronoi(
    svg,
    associations,
    scaleChromosomes,
    scaleMinusLogPValue,
    handleAssociationClick,
    chartIndex,
    dataAreaWidth,
    dataAreaHeight,
    translation
  ) {
    // create voronoi generator
    const voronoi = d3
      .voronoi()
      .x(d => scaleChromosomes[d.chromosome].scale(d.position))
      .y(d => scaleMinusLogPValue(0))
      .extent([[-1, -1], [dataAreaWidth + 1, dataAreaHeight + 1]]);

    // render in own group
    let g = svg.select(`.loci-voronoi`);
    if (g.empty()) {
      g = svg
        .append('g')
        .classed('loci-voronoi', true)
        .attr('clip-path', `url(#manhattan-clip-path-${chartIndex})`);
    }
    g.attr('transform', `translate(${translation})`);

    // join
    const lociVoronoi = g
      .selectAll('path')
      .data(voronoi.polygons(associations));

    lociVoronoi
      .enter()
      .append('path')
      .attr('opacity', 0)
      .merge(lociVoronoi)
      .on('click', function(d) {
        handleAssociationClick(d.data);
      })
      .on('mouseover', function(d) {
        const l = svg.selectAll('.loci line').filter(d2 => d2 === d.data);
        l.attr('stroke', 'red');
      })
      .on('mouseout', function(d) {
        const l = svg.selectAll('.loci line').filter(d2 => d2 === d.data);
        l.attr('stroke', 'blue');
      })
      .transition()
      .attr('d', function(d) {
        return d ? 'M' + d.join('L') + 'Z' : null;
      });

    lociVoronoi.exit().remove();
  }
  _handleChromosomeClick(chromosome) {
    const { focusChromosome } = this.state;
    if (focusChromosome) {
      this.setState({ focusChromosome: null });
    } else {
      this.setState({ focusChromosome: chromosome.name });
    }
  }
}

Manhattan = withContentRect('bounds')(Manhattan);

export default Manhattan;
