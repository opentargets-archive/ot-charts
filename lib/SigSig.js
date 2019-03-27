import React from 'react';
import * as d3 from 'd3';
import { withContentRect } from 'react-measure';

import theme from './theme';
import SigSigChild from './SigSigChild';

class SigSig extends React.Component {
  // constructor(props) {
  //   super(props);
  //   this.svgRef = React.createRef();
  //   this.x = d3.scaleLinear();
  //   this.y = d3.scaleLinear();
  //   this.voronoi = d3.voronoi();
  // }

  // componentDidMount() {
  //   this._render();
  // }

  // componentDidUpdate() {
  //   this._render();
  // }

  render() {
    // const { x, y } = this;
    const x = d3.scaleLinear();
    const y = d3.scaleLinear();
    const { data, measureRef } = this.props;
    const { outerWidth, outerHeight } = this._dimensions();

    const dimension = data.length;
    const width =
      (outerWidth ? outerWidth : 0) - theme.margin.right - theme.margin.left;
    const height =
      (outerHeight ? outerHeight : 0) - theme.margin.top - theme.margin.bottom;
    const childWidth = width / dimension;
    const childHeight = height / dimension;
    const minPval = d3.min(data.map(di => d3.min(di[0], d => d.x)));
    const domain = [0, -Math.log10(minPval)];
    x.domain(domain).range([0, childWidth]);
    y.domain(domain).range([childHeight, 0]);

    return (
      <div ref={measureRef}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={outerWidth}
          height={outerHeight}
          ref={node => (this.svgRef = node)}
        >
          {data.map((di, i) =>
            di.map((dij, j) => (
              <g
                key={`${i}-${j}`}
                transform={`translate(${i * childWidth},${j * childHeight})`}
              >
                <SigSigChild
                  x={x}
                  y={y}
                  height={childHeight}
                  data={dij}
                  showXAxis={i === dimension - 1}
                  showYAxis={j === dimension - 1}
                />
              </g>
            ))
          )}
          {/* <g
            transform={`translate(${theme.margin.left},${theme.margin.top})`}
          /> */}
        </svg>
      </div>
    );
  }

  _dimensions() {
    const { contentRect } = this.props;
    const { width: outerWidth } = contentRect.bounds;
    const outerHeight = outerWidth;
    return { outerWidth, outerHeight };
  }

  // _scale() {
  //   const { x, y } = this;
  //   const { data } = this.props;

  //   const minPval = d3.min(data.map(di => d3.min(di[0], d => d.x)));
  //   const domain = [0, -Math.log10(minPval)]
  //   x.domain(domain).range([0, width]);
  //   y.domain(domain).range([height, 0]);
  // }

  // _render() {
  //   const { x, y, voronoi } = this;
  //   const { data, domain } = this.props;
  //   const { outerWidth, outerHeight } = this._dimensions();

  //   if (!outerWidth || !outerHeight) {
  //     return;
  //   }

  //   const dimension = data.length;
  //   const width = outerWidth - theme.margin.right - theme.margin.left;
  //   const height = outerHeight - theme.margin.top - theme.margin.bottom;
  //   const childWidth = width / dimension;
  //   const childHeight = height / dimension;

  //   const svg = d3.select(this.svgRef);
  //   const chart = svg.select('g');

  //   const significance = -Math.log10(5e-8);
  //   const minPval = d3.min(data.map(di => d3.min(di[0], d => d.x)));
  //   const domain = [0, -Math.log10(minPval)]
  //   x.domain(domain).range([0, width]);
  //   y.domain(domain).range([height, 0]);

  //   // const xAxis = d3.axisBottom(x);
  //   // const yAxis = d3.axisLeft(y);

  //   // // this._renderLegend(svg, outerWidth);
  //   // this._renderYAxis(chart, yAxis);
  //   // this._renderXAxis(chart, height, xAxis);
  //   // // this._renderSignificanceLine(chart, y, width, significance);
  //   // this._renderDataPoints(chart, data);
  //   // // this._renderLabel(chart, title);
  //   // // this._renderTraitLabels(chart, polygons, x, y, significance);
  //   // // this._renderVoronoi(chart, polygons);
  // }

  // _renderYAxis(chart, yAxis) {
  //   let g = chart.select('.axis.axis--y.axis--minus-log-pvalue');
  //   if (g.empty()) {
  //     g = chart
  //       .append('g')
  //       .classed('axis axis--y axis--minus-log-pvalue', true);
  //   }
  //   g.call(yAxis);
  //   g.selectAll('.tick text').attr('fill', theme.axis.color);
  //   g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);

  //   // let label = g.select('.axis-label.axis-label--minus-log-pvalue');

  //   // if (label.empty()) {
  //   //   label = g
  //   //     .append('text')
  //   //     .attr('class', 'axis-label axis-label--minus-log-pvalue')
  //   //     .attr('transform', 'rotate(-90)')
  //   //     .attr('font-size', 12)
  //   //     .attr('dy', -40)
  //   //     .attr('text-anchor', 'end')
  //   //     .attr('fill', theme.axis.color)
  //   //     .text('-log₁₀(p-value)');
  //   // }
  // }

  // _renderXAxis(chart, height, xAxis) {
  //   let g = chart.select('.axis.axis--x.axis--minus-log-pvalue');
  //   if (g.empty()) {
  //     g = chart
  //       .append('g')
  //       .classed('axis axis--x axis--minus-log-pvalue', true);
  //   }
  //   g.attr('transform', `translate(0,${height})`)
  //     .call(xAxis)
  //     .selectAll('text');
  //   g.selectAll('.tick text').attr('fill', theme.axis.color);
  //   g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);
  //   //   // .attr('transform', 'rotate(45)')
  //   //   // .attr('x', 0)
  //   //   // .attr('y', 0)
  //   //   // .attr('dx', '.4em')
  //   //   // .attr('dy', '1.5em')
  //   //   .attr('fill', theme.axis.color);
  //   // // .style('text-anchor', 'start');
  //   // g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);
  // }

  // // _renderSignificanceLine(chart, y, width, significance) {
  // //   let significanceLine = chart.select('.significance');

  // //   if (significanceLine.empty()) {
  // //     significanceLine = chart.append('line').classed('significance', true);
  // //   }

  // //   significanceLine
  // //     .attr('x1', 0)
  // //     .attr('y1', y(significance))
  // //     .attr('x2', width)
  // //     .attr('y2', y(significance))
  // //     .attr('stroke', theme.secondary);
  // // }

  // _renderDataPoints(chart, data) {
  //   const { x, y } = this;

  //   const dataPoints = chart.selectAll('circle.point').data(data, d => d.id);

  //   dataPoints
  //     .enter()
  //     .append('circle')
  //     .attr('class', 'point')
  //     .attr('fill', 'white')
  //     .attr('stroke', theme.point.color)
  //     .attr('r', 3)
  //     .merge(dataPoints)
  //     .attr('cx', d => x(-Math.log10(d.x)))
  //     .attr('cy', d => y(-Math.log10(d.y)));

  //   dataPoints.exit().remove();
  // }

  // // _renderLabel(chart, title) {
  // //   let g = chart.select('.title');
  // //   if (g.empty()) {
  // //     g = chart.append('g').classed('title', true);
  // //   }

  // //   let label = g.select('text');

  // //   if (label.empty()) {
  // //     label = g
  // //       .append('text')
  // //       .attr('font-size', 14)
  // //       .attr('font-weight', 'bold')
  // //       .attr('dy', -10)
  // //       .attr('fill', theme.axis.color)
  // //       .text(title);
  // //   }
  // // }
}

export default withContentRect('bounds')(SigSig);
