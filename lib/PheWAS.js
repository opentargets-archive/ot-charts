import React, { Component } from 'react';
import * as d3 from 'd3';
import sortBy from 'lodash.sortby';
import { withContentRect } from 'react-measure';

import theme from './theme';

const getTraitCategories = assocs => {
  return assocs.reduce((acc, assoc) => {
    if (acc.length === 0) {
      acc.push(assoc.traitCategory);
    }

    if (acc[acc.length - 1] !== assoc.traitCategory) {
      acc.push(assoc.traitCategory);
    }
    return acc;
  }, []);
};

const getTraitCategoryRanges = (assocs, x) => {
  return assocs.reduce((acc, assoc) => {
    if (
      acc.length === 0 ||
      acc[acc.length - 1].traitCategory !== assoc.traitCategory
    ) {
      acc.push({
        traitCategory: assoc.traitCategory,
        start: x(assoc.studyId),
        end: x(assoc.studyId),
      });
      return acc;
    }

    const prev = acc[acc.length - 1];
    prev.start = Math.min(prev.start, x(assoc.studyId));
    prev.end = Math.max(prev.end, x(assoc.studyId));
    return acc;
  }, []);
};

class PheWAS extends Component {
  constructor(props) {
    super(props);
    this.svgRef = React.createRef();
    this.x = d3.scaleBand();
    this.y = d3.scaleLinear();
    this.colourScale = d3.scaleOrdinal();
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
    const outerHeight = 440;
    return { outerWidth, outerHeight };
  }

  _render() {
    const { x, y, colourScale } = this;
    const { associations, handleMouseover } = this.props;
    const { outerWidth, outerHeight } = this._dimensions();

    if (!outerWidth || !outerHeight) {
      return;
    }

    const width = outerWidth - theme.margin.right - theme.margin.left;
    const height = outerHeight - theme.margin.top - theme.margin.phewasBottom;

    const assocs = sortBy(associations, ['traitCategory']);

    const svg = d3.select(this.svgRef);
    const chart = svg.select('g');

    const significance = -Math.log10(0.05 / assocs.length);
    const [minLogPval, maxLogPval] = d3.extent(
      assocs,
      assoc => -Math.log10(assoc.pval)
    );

    const traitCategories = getTraitCategories(assocs);

    colourScale.domain(traitCategories).range(d3.schemePaired);
    x.domain(assocs.map(assoc => assoc.studyId)).range([0, width]);
    y.domain([
      Math.min(significance, minLogPval),
      Math.max(significance, maxLogPval),
    ]).range([height, 0]);

    const traitCategoryRanges = getTraitCategoryRanges(assocs, x);
    const traitPositions = traitCategoryRanges.map(
      range => (range.start + range.end) / 2
    );
    const categoryScale = d3
      .scaleOrdinal()
      .domain(traitCategories)
      .range(traitPositions);

    const xAxis = d3.axisBottom(categoryScale);
    const yAxis = d3.axisLeft(y);

    this._renderLogPValueAxis(chart, yAxis);
    this._renderStudiesAxis(chart, width, height, xAxis, colourScale);
    this._renderSignificanceLine(chart, y, width, significance);
    this._renderDataPoints(chart, assocs, colourScale);
    this._renderVoronoi(chart, assocs, x, y, width, height, handleMouseover);
  }

  _renderStudiesAxis(chart, width, height, xAxis, colourScale) {
    let g = chart.select('.axis.axis--studies');
    if (g.empty()) {
      g = chart.append('g').classed('axis axis--studies', true);
    }
    g.attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(45)')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dx', '.4em')
      .attr('dy', '1.5em')
      .attr('fill', function(d) {
        return colourScale(d);
      })
      .style('text-anchor', 'start');
    g.selectAll('.domain, .tick line').attr('stroke', theme.axis.color);
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

  _renderDataPoints(chart, assocs, colourScale) {
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
      .attr('fill', function(assoc) {
        return colourScale(assoc.traitCategory);
      })
      .attr('data-colour', function(assoc) {
        return colourScale(assoc.traitCategory);
      })
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
