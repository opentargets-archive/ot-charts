import React from 'react';
import * as d3 from 'd3';
import { withContentRect } from 'react-measure';

import theme from './theme';
import {
  chromosomeNames,
  chromosomesWithCumulativeLengths,
  SIGNIFICANCE,
} from './utils';

let idGenerator = 1;

const CHROMOSOME_PADDING = 2;

const MAX_MINUS_LOG_PVAL_DEFAULT = 10;

class Manhattan extends React.Component {
  constructor(props) {
    super(props);
    this.svgRef = React.createRef();
    this.state = {
      scaleMinusLogPValue: d3.scaleLinear(),
      scaleChromosomes: chromosomesWithCumulativeLengths.reduce((acc, d) => {
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width}
          height={height}
          ref={node => (this.svgRef = node)}
        />
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
    const { data, handleClick, handleMouseover } = this.props;
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
      scaleMinusLogPValue,
      scaleChromosomes,
      focusChromosome,
      chartIndex,
    } = this.state;
    const svg = d3.select(this.svgRef);

    // data area
    const dataAreaWidth = width - theme.margin.left - theme.margin.right;
    const dataAreaHeight = height - theme.margin.top - theme.margin.bottom;

    // clip path
    this._renderClipPath(svg, dataAreaWidth, height, chartIndex);

    // render conditionally dependent on whether a chromosome is selected
    if (focusChromosome) {
      // scales
      const yMax = d3.max(
        data.associations.filter(d => d.chromosome === focusChromosome),
        d => -Math.log10(d.pval)
      );
      scaleMinusLogPValue
        .domain([0, yMax ? yMax : MAX_MINUS_LOG_PVAL_DEFAULT])
        .range([dataAreaHeight, 0]);
      Object.values(scaleChromosomes).forEach(chromosome => {
        const { scale } = chromosome;
        if (chromosome.name === focusChromosome) {
          scale.range([CHROMOSOME_PADDING, dataAreaWidth - CHROMOSOME_PADDING]);
        } else if (
          chromosomeNames.indexOf(chromosome.name) <
          chromosomeNames.indexOf(focusChromosome)
        ) {
          scale.range([-2 * dataAreaWidth, -dataAreaWidth]);
        } else if (
          chromosomeNames.indexOf(chromosome.name) >
          chromosomeNames.indexOf(focusChromosome)
        ) {
          scale.range([2 * dataAreaWidth, 3 * dataAreaWidth]);
        }
      });
    } else {
      // scales
      const yMax = d3.max(data.associations, d => -Math.log10(d.pval));
      scaleMinusLogPValue
        .domain([0, yMax ? yMax : MAX_MINUS_LOG_PVAL_DEFAULT])
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
      theme.margin.left,
      theme.margin.top,
    ]);
    Object.values(scaleChromosomes).forEach(chromosome => {
      this._renderAxisChromosome(svg, chromosome, chartIndex, [
        theme.margin.left,
        theme.margin.top + dataAreaHeight,
      ]);
    });

    // axis labels
    this._renderAxisLabelMinusLogPValue(svg, [
      theme.margin.left,
      theme.margin.top,
    ]);
    Object.values(scaleChromosomes).forEach(chromosome => {
      this._renderAxisLabelChromosome(svg, chromosome, chartIndex, [
        theme.margin.left,
        theme.margin.top + dataAreaHeight,
      ]);
    });

    // significance line
    this._renderSignificanceLine(
      svg,
      scaleMinusLogPValue,
      dataAreaWidth,
      [theme.margin.left, theme.margin.top],
      SIGNIFICANCE
    );

    // data
    this._renderLoci(
      svg,
      data.associations,
      scaleChromosomes,
      scaleMinusLogPValue,
      handleClick,
      chartIndex,
      [theme.margin.left, theme.margin.top]
    );
    this._renderLociVoronoi(
      svg,
      data.associations,
      scaleChromosomes,
      scaleMinusLogPValue,
      handleClick,
      handleMouseover,
      chartIndex,
      dataAreaWidth,
      dataAreaHeight,
      [theme.margin.left, theme.margin.top]
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
    g.selectAll('.tick text').attr('fill', theme.axis.color);
    g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);
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
        .attr('fill', theme.axis.color)
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
    g.selectAll('.tick text').attr('fill', theme.axis.color);
    g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);
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
        .attr('fill', theme.axis.highlightColor)
        .attr('fill-opacity', 0)
        .on('click', () => this._handleChromosomeClick(chromosome))
        .on('mouseover', function() {
          const r = d3.select(this);
          r.attr('fill-opacity', 1);
        })
        .on('mouseout', function() {
          const r = d3.select(this);
          r.attr('fill-opacity', 0);
        });
      g.append('text')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 12)
        .attr('dy', 20)
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .attr('fill', theme.axis.color)
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
    handleClick,
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
      .attr('class', function(association) {
        return `loci-${association.indexVariantId}`;
      })
      .attr('stroke', theme.line.color)
      .attr('stroke-width', theme.line.thickness)
      .merge(loci)
      .on('click', handleClick)
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
    handleClick,
    handleMouseover,
    chartIndex,
    dataAreaWidth,
    dataAreaHeight,
    translation
  ) {
    // create voronoi generator
    // jitter: see https://github.com/d3/d3-voronoi/issues/12
    const pixelJitter = () => Math.random() - 0.5;
    const voronoi = d3
      .voronoi()
      .x(d => scaleChromosomes[d.chromosome].scale(d.position) + pixelJitter())
      .y(d => scaleMinusLogPValue(0) + pixelJitter())
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
        handleClick(d.data);
      })
      .on('mouseover', function(d) {
        handleMouseover(d.data);
      })
      .transition()
      .attr('d', function(d) {
        return d ? 'M' + d.join('L') + 'Z' : null;
      });

    lociVoronoi.exit().remove();
  }
  _renderSignificanceLine(svg, y, width, translation, significance) {
    let significanceLine = svg.select('.significance');

    if (significanceLine.empty()) {
      significanceLine = svg.append('line').classed('significance', true);
    }

    significanceLine
      .attr('transform', `translate(${translation})`)
      .attr('x1', 0)
      .attr('y1', y(significance))
      .attr('x2', width)
      .attr('y2', y(significance))
      .attr('stroke', theme.secondary);
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

Manhattan.defaultProps = {
  handleClick: () => {},
  handleMouseover: () => {},
};

Manhattan = withContentRect('bounds')(Manhattan);

export default Manhattan;
