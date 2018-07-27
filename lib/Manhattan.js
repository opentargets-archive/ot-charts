import React from 'react';
import * as d3 from 'd3';

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
const totalLength = GRCh38.reduce((acc, d) => { acc += d.length; return acc; }, 0);
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

// TODO: handle width/height inside Manhattan
const width = 1600;
const height = 300;

class Manhattan extends React.Component {
    constructor(props) {
        super(props);
        this.svgRef = React.createRef();
        this.state = {
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50,
            },
            scaleMinusLogPValue: d3.scaleLinear(),
            scaleChromosomes: GRCh38Cum.reduce((acc, d) => {
                acc[d.name] = {
                    ...d,
                    scale: d3.scaleLinear().domain([1, d.length])
                }
                return acc;
            }, {}),
        };
    }
    componentDidMount() {
        this._render();
    }
    componentDidUpdate() {
        this._render();
    }
    render() {
        return (<ChartPlaceholder>
            <svg width={width} height={height} ref={node => this.svgRef = node} />
        </ChartPlaceholder>);
    }
    _render() {
        const { data } = this.props;
        const { margins, scaleMinusLogPValue, scaleChromosomes } = this.state;
        const svg = d3.select(this.svgRef);

        // data area
        const dataAreaWidth = width - margins.left - margins.right;
        const dataAreaHeight = height - margins.top - margins.bottom;

        // scales
        scaleMinusLogPValue
            .domain([0, d3.max(data.associations, d => -Math.log10(d.pval))])
            .range([dataAreaHeight, 0])
        const chromosomePadding = 2;
        Object.entries(scaleChromosomes).forEach(([chromosome, { scale, proportionalStart, proportionalEnd }]) => {
            scale.range([
                proportionalStart * dataAreaWidth + chromosomePadding,
                proportionalEnd * dataAreaWidth - chromosomePadding,
            ]);
        });

        // axes
        this._renderAxisMinusLogPValue(svg, scaleMinusLogPValue, [margins.left, margins.top])
        Object.values(scaleChromosomes).forEach(chromosome => {
            this._renderAxisChromosome(svg, chromosome, [margins.left, margins.top + dataAreaHeight])
        });

        // data
        this._renderLoci(svg, data.associations, scaleChromosomes, scaleMinusLogPValue, [margins.left, margins.top]);

    }
    _renderAxisMinusLogPValue(svg, scale, translation) {
        // create axis
        const axis = d3.axisLeft().scale(scale);
        
        // render in own group
        let g = svg.select('.axis.axis--minus-log-p-value');
        if (g.empty()) {
            g = svg.append('g')
                .classed('axis', true)
                .classed('axis--minus-log-p-value', true);
        }
        g
            .attr('transform', `translate(${translation})`)
            .call(axis);
    }
    _renderAxisChromosome(svg, chromosome, translation) {
        // create axis
        const axis = d3.axisBottom().scale(chromosome.scale).tickValues([]);
        
        // render in own group
        let g = svg.select(`.axis.axis--chromosome.axis--chromosome-${chromosome.name}`);
        if (g.empty()) {
            g = svg.append('g')
                .classed('axis', true)
                .classed('axis--location', true)
                .classed(`axis--chromosome-${chromosome.name}`, true);
        }
        g
            .attr('transform', `translate(${translation})`)
            .call(axis);
    }
    _renderLoci(svg, associations, scaleChromosomes, scaleMinusLogPValue, translation) {
        // render in own group
        let g = svg.select(`.loci`);
        if (g.empty()) {
            g = svg.append('g')
                .classed('loci', true);
        }
        g.attr('transform', `translate(${translation})`);

        // join
        const loci = g.selectAll('line')
            .data(associations);

        loci.enter()
            .append('line')
            .attr('stroke', 'red')
            .merge(loci)
            .attr('x1', d => scaleChromosomes[d.chromosome].scale(d.position))
            .attr('y1', scaleMinusLogPValue(0))
            .attr('x2', d => scaleChromosomes[d.chromosome].scale(d.position))
            .attr('y2', d => scaleMinusLogPValue(-Math.log10(d.pval)));

        loci.exit()
            .remove();
    }
}

export default Manhattan;
