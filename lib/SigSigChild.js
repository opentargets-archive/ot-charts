import React from 'react';
import * as d3 from 'd3';
import { withContentRect } from 'react-measure';

import theme from './theme';

class SigSigChild extends React.Component {
  constructor(props) {
    super(props);
    this.gRef = React.createRef();
  }

  componentDidMount() {
    this._render();
  }

  componentDidUpdate() {
    this._render();
  }

  render() {
    return (
      <g
        ref={node => (this.gRef = node)}
        transform={`translate(${theme.margin.left},${theme.margin.top})`}
      />
    );
  }

  _render() {
    const { x, y, data, height, showXAxis, showYAxis } = this.props;

    // const width = width - theme.margin.right - theme.margin.left;
    // const height = height - theme.margin.top - theme.margin.bottom;

    const svg = d3.select(this.gRef);
    const chart = svg.select('g');
    // console.log(chart);

    const significance = -Math.log10(5e-8);

    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    if (showYAxis) {
      this._renderYAxis(chart, yAxis);
    }
    if (showXAxis) {
      this._renderXAxis(chart, height, xAxis);
    }

    this._renderDataPoints(chart, data);
  }

  _renderYAxis(chart, yAxis) {
    let g = chart.select('.axis.axis--y.axis--minus-log-pvalue');
    if (g.empty()) {
      g = chart
        .append('g')
        .classed('axis axis--y axis--minus-log-pvalue', true);
    }
    g.call(yAxis);
    g.selectAll('.tick text').attr('fill', theme.axis.color);
    g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);
  }

  _renderXAxis(chart, height, xAxis) {
    let g = chart.select('.axis.axis--x.axis--minus-log-pvalue');
    if (g.empty()) {
      g = chart
        .append('g')
        .classed('axis axis--x axis--minus-log-pvalue', true);
    }
    g.attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text');
    g.selectAll('.tick text').attr('fill', theme.axis.color);
    g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);
  }

  _renderDataPoints(chart, data) {
    const { x, y } = this.props;

    const dataPoints = chart.selectAll('circle.point').data(data, d => d.id);

    dataPoints
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('fill', 'white')
      .attr('stroke', theme.point.color)
      .attr('r', 3)
      // .merge(dataPoints)
      .attr('cx', d => {
        console.log(d);
        return x(-Math.log10(d.x));
      })
      .attr('cy', d => y(-Math.log10(d.y)));

    dataPoints.exit().remove();
  }
}

export default withContentRect('bounds')(SigSigChild);
