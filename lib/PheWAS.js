import React, { Component } from 'react';
import * as d3 from 'd3';
import sortBy from 'lodash.sortby';
import { withContentRect } from 'react-measure';

import theme from './theme';

const SIGNIFICANCE = -Math.log10(5e-8);

function hasAssociations(data) {
  return (
    data.pheWAS &&
    data.pheWAS.associations &&
    data.pheWAS.associations.length > 0
  );
}

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
    const { data, handleMouseover, handleMouseout } = this.props;
    const { outerWidth, outerHeight } = this._dimensions();

    if (!hasAssociations(data) || !outerWidth || !outerHeight) {
      return;
    }

    const width = outerWidth - theme.margin.right - theme.margin.left;
    const height = outerHeight - theme.margin.top - theme.margin.bottom;

    const assocs = sortBy(data.pheWAS.associations, 'traitReported');
    const svg = d3.select(this.svgRef);
    const chart = svg.select('g');

    x.domain(assocs.map(assoc => assoc.studyId)).range([0, width]);
    y.domain(d3.extent(assocs, assoc => -Math.log10(assoc.pval))).range([
      height,
      0,
    ]);

    const xAxis = d3.axisBottom(x).tickFormat(() => '');
    const yAxis = d3.axisLeft(y);

    this._renderLogPValueAxis(chart, height, yAxis);
    this._renderStudiesAxis(chart, width, height, xAxis);
    this._renderSignificanceLine(chart, y, width, SIGNIFICANCE);
    this._renderDataPoints(chart, assocs, handleMouseover, handleMouseout);
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
        .text('Studies');
    }

    label.attr('dx', width / 2);
  }

  _renderLogPValueAxis(chart, height, yAxis) {
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

  _renderDataPoints(chart, assocs, handleMouseover, handleMouseout) {
    const { x, y } = this;
    const dataPoints = chart.selectAll('circle').data(assocs);
    dataPoints
      .enter()
      .append('circle')
      .attr('r', theme.point.radius)
      .attr('fill', theme.point.color)
      .merge(dataPoints)
      .attr('cx', function(assoc) {
        return x(assoc.studyId);
      })
      .attr('cy', function(assoc) {
        return y(-Math.log10(assoc.pval));
      })
      .on('mouseover', function(d) {
        handleMouseover(d, this);
      })
      .on('mouseout', function() {
        handleMouseout();
      });
    dataPoints.exit().remove();
  }
}

export default withContentRect('bounds')(PheWAS);
