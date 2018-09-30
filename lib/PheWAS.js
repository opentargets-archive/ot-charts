import React, { Component } from 'react';
import * as d3 from 'd3';
import sortBy from 'lodash.sortby';
import { withContentRect } from 'react-measure';

import theme from './theme';

class PheWAS extends Component {
  constructor(props) {
    super(props);
    this.svgRef = React.createRef();
    this.x = d3.scaleBand();
    this.y = d3.scaleLinear();
  }

  componentDidMount() {
    this._render();
  }

  componentDidUpdate() {
    this._render();
  }

  render() {
    const { measureRef } = this.props;
    const { outerWidth, outerHeight } = this._dimensions();
    return (
      <div ref={measureRef}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={outerWidth}
          height={outerHeight}
          ref={node => (this.svgRef = node)}
        >
          <g
            transform={`translate(${theme.margin.left},${theme.margin.top})`}
          />
        </svg>
      </div>
    );
  }

  _dimensions() {
    const { contentRect } = this.props;
    const { width: outerWidth } = contentRect.bounds;
    const outerHeight = 400;
    return { outerWidth, outerHeight };
  }

  _render() {
    const { x, y } = this;
    const { associations, handleMouseover } = this.props;
    const { outerWidth, outerHeight } = this._dimensions();

    if (!outerWidth || !outerHeight) {
      return;
    }

    const width = outerWidth - theme.margin.right - theme.margin.left;
    const height = outerHeight - theme.margin.top - theme.margin.bottom;

    const assocs = sortBy(associations, ['traitCategory', 'pval']);

    const svg = d3.select(this.svgRef);
    const chart = svg.select('g');

    const significance = -Math.log10(0.05 / assocs.length);
    const [minLogPval, maxLogPval] = d3.extent(
      assocs,
      assoc => -Math.log10(assoc.pval)
    );

    x.domain(assocs.map(assoc => assoc.studyId)).range([0, width]);
    y.domain([
      Math.min(significance, minLogPval),
      Math.max(significance, maxLogPval),
    ]).range([height, 0]);

    const xAxis = d3.axisBottom(x).tickFormat(() => '');
    const yAxis = d3.axisLeft(y);

    this._renderLogPValueAxis(chart, yAxis);
    this._renderStudiesAxis(chart, width, height, xAxis);
    this._renderSignificanceLine(chart, y, width, significance);
    this._renderDataPoints(chart, assocs);
    this._renderVoronoi(chart, assocs, x, y, width, height, handleMouseover);
  }

  _renderStudiesAxis(chart, width, height, xAxis) {
    let g = chart.select('.axis.axis--studies');
    if (g.empty()) {
      g = chart.append('g').classed('axis axis--studies', true);
    }
    g.attr('transform', `translate(0,${height})`).call(xAxis);
    g.selectAll('.tick text').attr('fill', theme.axis.color);
    g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);

    let label = g.select('.axis-label.axis-label--studies');

    if (label.empty()) {
      label = g
        .append('text')
        .attr('class', 'axis-label axis-label--studies')
        .attr('font-size', 12)
        .attr('dy', 20)
        .attr('fill', theme.axis.color)
        .text('Traits');
    }

    label.attr('dx', width / 2);
  }

  _renderLogPValueAxis(chart, yAxis) {
    let g = chart.select('.axis.axis--minus-log-pvalue');
    if (g.empty()) {
      g = chart.append('g').classed('axis axis--minus-log-pvalue', true);
    }
    g.call(yAxis);
    g.selectAll('.tick text').attr('fill', theme.axis.color);
    g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);

    let label = g.select('.axis-label.axis-label--minus-log-pvalue');

    if (label.empty()) {
      label = g
        .append('text')
        .attr('class', 'axis-label axis-label--minus-log-pvalue')
        .attr('transform', 'rotate(-90)')
        .attr('font-size', 12)
        .attr('dy', -40)
        .attr('text-anchor', 'end')
        .attr('fill', theme.axis.color)
        .text('-log₁₀(p-value)');
    }
  }

  _renderSignificanceLine(chart, y, width, significance) {
    let significanceLine = chart.select('.significance');

    if (significanceLine.empty()) {
      significanceLine = chart.append('line').classed('significance', true);
    }

    significanceLine
      .attr('x1', 0)
      .attr('y1', y(significance))
      .attr('x2', width)
      .attr('y2', y(significance))
      .attr('stroke', theme.secondary);
  }

  _renderDataPoints(chart, assocs) {
    const { x, y } = this;
    const trianglePath = d3
      .symbol()
      .size(32)
      .type(d3.symbolTriangle);

    const dataPoints = chart
      .selectAll('path.point')
      .data(assocs, assoc => assoc.studyId);

    dataPoints
      .enter()
      .append('path')
      .attr('class', function(assoc) {
        return `point loci-${assoc.studyId}`;
      })
      .attr('fill', theme.point.color)
      .attr('d', trianglePath)
      .merge(dataPoints)
      .attr('transform', function(assoc) {
        const xPos = x(assoc.studyId);
        const yPos = y(-Math.log10(assoc.pval));
        const rotation = assoc.beta < 0 ? ',rotate(180)' : '';
        return `translate(${xPos},${yPos})${rotation}`;
      });

    dataPoints.exit().remove();
  }

  _renderVoronoi(chart, assocs, x, y, width, height, handleMouseover) {
    const voronoi = d3
      .voronoi()
      .x(d => x(d.studyId))
      .y(d => y(-Math.log10(d.pval)))
      .extent([[-1, -1], [width + 1, height + 1]]);

    let g = d3.select('.phewas-voronoi');

    if (g.empty()) {
      g = chart.append('g').attr('class', 'phewas-voronoi');
    }

    const lociVoronoi = g.selectAll('path').data(voronoi.polygons(assocs));

    lociVoronoi
      .enter()
      .append('path')
      .merge(lociVoronoi)
      .attr('d', function(d) {
        return `M${d.join('L')}Z`;
      })
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', function(d) {
        handleMouseover(d.data);
      });

    lociVoronoi.exit().remove();
  }
}

PheWAS.defaultProps = {
  handleMouseover: () => {},
};

export default withContentRect('bounds')(PheWAS);
