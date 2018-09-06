import React from 'react';
import * as d3 from 'd3';
import { withContentRect } from 'react-measure';
import theme from './theme';

const GENE_SLOT_HEIGHT = 30;
const GENE_TRANSCRIPT_HEIGHT = 7;
const GENE_TRANSCRIPT_OFFSET = 2;
const GENE_LABEL_OFFSET = GENE_TRANSCRIPT_OFFSET * 2 + GENE_TRANSCRIPT_HEIGHT;
const GENE_TRACK_PADDING = 5;
const STUDY_SLOT_HEIGHT = 30;
const STUDY_TEXT_MAX_WIDTH = 100;
const VARIANT_TRACK_HEIGHT = 7;
const CONNECTOR_TRACK_HEIGHT = 80;
const CHAR_WIDTH = 14; // TODO: base on font-size
const HEIGHT_DEFAULT = 400;

class Gecko extends React.Component {
  constructor(props) {
    super(props);
    this.svgRef = React.createRef();
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
    return (
      <div ref={measureRef}>
        <svg width={width} height={height} ref={node => (this.svgRef = node)} />
      </div>
    );
  }
  _width() {
    const { contentRect } = this.props;
    const { width } = contentRect.bounds;
    return width;
  }
  _height() {
    const { data, start, end } = this.props;
    if (!data || !data.tagVariants || !data.genes || !data.geneTagVariants) {
      return HEIGHT_DEFAULT;
    }
    const width = this._width();
    const scalePosition = d3
      .scaleLinear()
      .domain([start, end])
      .range([0, width]);

    const { slots: geneSlots } = this._geneSlots(scalePosition);
    const { slots: studySlots } = this._studySlots(width);
    const trackConfig = this._trackConfig(geneSlots.length, studySlots.length);
    return trackConfig.height;
  }
  _dimensions() {
    const width = this._width();
    const height = this._height();
    return { width, height };
  }
  _render() {
    const { data, start, end } = this.props;
    const width = this._width();
    if (
      !width ||
      !data ||
      !data.tagVariants ||
      !data.genes ||
      !data.geneTagVariants
    ) {
      return null;
    }

    const svg = d3.select(this.svgRef);
    const scalePosition = d3
      .scaleLinear()
      .domain([start, end])
      .range([0, width]);

    const { slots: geneSlots, genesWithSlots } = this._geneSlots(scalePosition);
    const { slots: studySlots, studiesWithSlots } = this._studySlots(width);
    const trackConfig = this._trackConfig(geneSlots.length, studySlots.length);

    const scaleStudyX = d3
      .scalePoint()
      .domain(studiesWithSlots.map(d => d.index))
      .range([STUDY_TEXT_MAX_WIDTH / 2, width - STUDY_TEXT_MAX_WIDTH / 2]);
    const scaleStudyY = d3
      .scalePoint()
      .domain(studySlots.map(d => d.index))
      .range([
        GENE_TRACK_PADDING,
        trackConfig.studies.height - 2 * GENE_TRACK_PADDING,
      ]);

    this._renderGenes(svg, scalePosition, trackConfig.genes, genesWithSlots);
    this._renderTagVariants(
      svg,
      scalePosition,
      trackConfig.tagVariants,
      data.tagVariants
    );
    this._renderIndexVariants(
      svg,
      scalePosition,
      trackConfig.indexVariants,
      data.indexVariants
    );
    this._renderGeneTagVariants(
      svg,
      scalePosition,
      trackConfig.geneTagVariants,
      data.geneTagVariants
    );
    this._renderStudies(
      svg,
      scaleStudyX,
      scaleStudyY,
      trackConfig.studies,
      studiesWithSlots
    );
  }
  _renderGenes(svg, scale, track, data) {
    // render in own group
    let g = svg.select(`.track.track--genes`);
    if (g.empty()) {
      g = svg.append('g').classed('track track--genes', true);
    }
    g.attr('transform', `translate(0,${track.top})`);

    // join
    const genes = g.selectAll('g').data(data, d => d.id);

    // -------------
    // --- GENES ---
    // -------------

    // --- ENTER ---
    const enter = genes.enter().append('g');

    // spit
    enter
      .append('line')
      .classed('spit', true)
      .attr('stroke', theme.line.color);

    // label
    enter
      .append('text')
      .classed('label', true)
      .attr('fill', theme.line.color)
      .attr('alignment-baseline', 'hanging')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 12);

    // --- MERGE ---
    const merge = enter
      .merge(genes)
      .attr('transform', d => `translate(0,${d.slotIndex * GENE_SLOT_HEIGHT})`);

    // spit
    merge
      .selectAll('line.spit')
      .attr('x1', d => scale(d.start))
      .attr('y1', GENE_TRANSCRIPT_OFFSET + GENE_TRANSCRIPT_HEIGHT / 2)
      .attr('x2', d => scale(d.end))
      .attr('y2', GENE_TRANSCRIPT_OFFSET + GENE_TRANSCRIPT_HEIGHT / 2);

    // label
    merge
      .selectAll('text.label')
      .attr('x', d => scale(d.start))
      .attr('y', GENE_LABEL_OFFSET)
      .text(d => (d.forwardStrand ? `${d.symbol}>` : `<${d.symbol}`));

    // --- EXIT ---
    genes.exit().remove();

    // -------------
    // --- EXONS ---
    // -------------
    const exons = genes.selectAll('rect.exon').data(d => d.exons);

    exons
      .enter()
      .append('rect')
      .attr('stroke', theme.line.color)
      .attr('fill', 'white')
      .classed('exon', true)
      .merge(exons)
      .attr('x', d => scale(d[0]))
      .attr('y', GENE_TRANSCRIPT_OFFSET)
      .attr('width', d => scale(d[1]) - scale(d[0]))
      .attr('height', GENE_TRANSCRIPT_HEIGHT);

    exons.exit().remove();
  }
  _renderTagVariants(svg, scale, track, data) {
    // render in own group
    let g = svg.select(`.track.track--tag-variants`);
    if (g.empty()) {
      g = svg.append('g').classed('track track--tag-variants', true);
    }
    g.attr('transform', `translate(0,${track.top})`);

    // join
    const tags = g.selectAll('line').data(data);

    tags
      .enter()
      .append('line')
      .attr('stroke', theme.line.color)
      .attr('stroke-width', theme.line.thickness)
      .merge(tags)
      .attr('x1', d => scale(d.position))
      .attr('y1', 0)
      .attr('x2', d => scale(d.position))
      .attr('y2', track.height);

    tags.exit().remove();
  }
  _renderIndexVariants(svg, scale, track, data) {
    // render in own group
    let g = svg.select(`.track.track--index-variants`);
    if (g.empty()) {
      g = svg.append('g').classed('track track--index-variants', true);
    }
    g.attr('transform', `translate(0,${track.top})`);

    // join
    const tags = g.selectAll('line').data(data);

    tags
      .enter()
      .append('line')
      .attr('stroke', theme.line.color)
      .attr('stroke-width', theme.line.thickness)
      .merge(tags)
      .attr('x1', d => scale(d.position))
      .attr('y1', 0)
      .attr('x2', d => scale(d.position))
      .attr('y2', track.height);

    tags.exit().remove();
  }
  _renderStudies(svg, scaleX, scaleY, track, data) {
    // render in own group
    let g = svg.select(`.track.track--index-studies`);
    if (g.empty()) {
      g = svg.append('g').classed('track track--index-studies', true);
    }
    g.attr('transform', `translate(0,${track.top})`);

    // join
    const texts = g.selectAll('text').data(data);

    texts
      .enter()
      .append('text')
      .attr('fill', theme.line.color)
      .attr('alignment-baseline', 'middle')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 12)
      .merge(texts)
      .attr('x', d => scaleX(d.index))
      .attr('y', d => scaleY(d.slotIndex))
      .text(d => d.studyId);

    texts.exit().remove();
  }
  _renderGeneTagVariants(svg, scale, track, data) {
    // AS LINES
    // render in own group
    let g = svg.select(`.track.track--gene-tag-variants`);
    if (g.empty()) {
      g = svg.append('g').classed('track track--gene-tag-variants', true);
    }
    g.attr('transform', `translate(0,${track.top})`);

    // join
    const tags = g.selectAll('line').data(data);

    tags
      .enter()
      .append('line')
      .attr('stroke', theme.connector.color)
      .merge(tags)
      .attr('x1', d => scale(d.geneTss))
      .attr('y1', 0)
      .attr('x2', d => scale(d.tagVariantPosition))
      .attr('y2', track.height);

    tags.exit().remove();
  }
  // _renderGeneTagVariants(svg, scale, track, data) {
  //   // AS CURVES
  //   // render in own group
  //   let g = svg.select(`.track.track--gene-tag-variants`);
  //   if (g.empty()) {
  //     g = svg.append('g').classed('track track--gene-tag-variants', true);
  //   }
  //   g.attr('transform', `translate(0,${track.top})`);

  //   // join
  //   const tags = g.selectAll('path').data(data);

  //   tags
  //     .enter()
  //     .append('path')
  //     .attr('stroke', theme.connector.color)
  //     .attr('fill', 'none')
  //     .merge(tags)
  //     .attr('d', d => {
  //       const topX = scale(d.geneTss);
  //       const topY = 0;
  //       const bottomX = scale(d.variantPosition);
  //       const bottomY = track.height;
  //       const controlY = (bottomY + topY) / 2;
  //       return `M${topX},${topY} C${topX},${controlY}, ${bottomX},${controlY} ${bottomX},${bottomY}`;
  //     });

  //   tags.exit().remove();
  // }
  _geneSlots(scale) {
    const { genes } = this.props.data;
    const sortedGenes = genes.slice().sort(function(a, b) {
      return a.start - b.start;
    });

    let slotCount = 0;
    const slots = [];
    const genesWithSlots = [];
    sortedGenes.forEach(gene => {
      const suitableSlots = slots.filter(
        slot =>
          scale(gene.start) > scale(slot.end) + gene.symbol.length * CHAR_WIDTH
      );
      if (suitableSlots.length > 0) {
        // store in slots
        suitableSlots[0].genes.push(gene);
        suitableSlots[0].end = gene.end;

        // store in gene list with slot index
        genesWithSlots.push({ ...gene, slotIndex: suitableSlots[0].index });
      } else {
        // store in slots
        const newSlot = { genes: [gene], end: gene.end, index: slotCount++ };
        slots.push(newSlot);

        // store in gene list with slot index
        genesWithSlots.push({ ...gene, slotIndex: newSlot.index });
      }
    });

    return { slots, genesWithSlots };
  }
  _studySlots(width) {
    const { studies } = this.props.data;
    const sortedStudies = studies
      .slice()
      .sort(function(a, b) {
        return a.traitReported - b.traitReported;
      })
      .map((d, i) => ({ ...d, index: i }));

    const studiesPerSlot = Math.ceil(width / STUDY_TEXT_MAX_WIDTH);
    const slotCount = Math.ceil(sortedStudies.length / studiesPerSlot);

    const sortedStudiesWithSlots = sortedStudies.map(d => ({
      ...d,
      slotIndex: d.index % slotCount,
    }));

    const slots = [];
    for (let i = 0; i < slotCount; i++) {
      const studiesInSlot = sortedStudiesWithSlots.filter(
        d => d.slotIndex === i
      );
      const slot = { studies: studiesInSlot, index: i };
      slots.push(slot);
    }

    return { slots, studiesWithSlots: sortedStudiesWithSlots };
  }
  _trackConfig(geneSlotCount, studySlotCount) {
    const geneTrackHeight =
      geneSlotCount * GENE_SLOT_HEIGHT + 2 * GENE_TRACK_PADDING;
    const genes = {
      top: 0,
      bottom: geneTrackHeight,
      height: geneTrackHeight,
    };
    const geneTagVariants = {
      top: genes.bottom,
      bottom: genes.bottom + CONNECTOR_TRACK_HEIGHT,
      height: CONNECTOR_TRACK_HEIGHT,
    };
    const tagVariants = {
      top: geneTagVariants.bottom,
      bottom: geneTagVariants.bottom + VARIANT_TRACK_HEIGHT,
      height: VARIANT_TRACK_HEIGHT,
    };
    const tagVariantIndexVariants = {
      top: tagVariants.bottom,
      bottom: tagVariants.bottom + CONNECTOR_TRACK_HEIGHT,
      height: CONNECTOR_TRACK_HEIGHT,
    };
    const indexVariants = {
      top: tagVariantIndexVariants.bottom,
      bottom: tagVariantIndexVariants.bottom + VARIANT_TRACK_HEIGHT,
      height: VARIANT_TRACK_HEIGHT,
    };
    const indexVariantStudies = {
      top: indexVariants.bottom,
      bottom: indexVariants.bottom + CONNECTOR_TRACK_HEIGHT,
      height: CONNECTOR_TRACK_HEIGHT,
    };
    const studyTrackHeight =
      studySlotCount * STUDY_SLOT_HEIGHT + 2 * GENE_TRACK_PADDING;
    const studies = {
      top: indexVariantStudies.bottom,
      bottom: indexVariantStudies.bottom + studyTrackHeight,
      height: studyTrackHeight,
    };
    return {
      genes,
      geneTagVariants,
      tagVariants,
      tagVariantIndexVariants,
      indexVariants,
      indexVariantStudies,
      studies,
      height: studies.bottom,
    };
  }
  // _textWrap(text, width) {
  //   text.each(function() {
  //     var text = d3.select(this),
  //       words = text
  //         .text()
  //         .split(/\s+/)
  //         .reverse(),
  //       word,
  //       line = [],
  //       lineNumber = 0,
  //       lineHeight = 1.1, // ems
  //       y = text.attr('y'),
  //       dy = parseFloat(text.attr('dy')),
  //       tspan = text
  //         .text(null)
  //         .append('tspan')
  //         .attr('x', 0)
  //         .attr('y', y)
  //         .attr('dy', dy + 'em');
  //     while ((word = words.pop())) {
  //       line.push(word);
  //       tspan.text(line.join(' '));
  //       if (tspan.node().getComputedTextLength() > width) {
  //         line.pop();
  //         tspan.text(line.join(' '));
  //         line = [word];
  //         tspan = text
  //           .append('tspan')
  //           .attr('x', 0)
  //           .attr('y', y)
  //           .attr('dy', ++lineNumber * lineHeight + dy + 'em')
  //           .text(word);
  //       }
  //     }
  //   });
  // }
}

export default withContentRect('bounds')(Gecko);
