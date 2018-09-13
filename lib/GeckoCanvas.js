import React from 'react';
import * as d3 from 'd3';
import { withContentRect } from 'react-measure';
import theme from './theme';

const GENE_SLOT_HEIGHT = 30;
const GENE_TRANSCRIPT_HEIGHT = 7;
const GENE_TRANSCRIPT_OFFSET = 3;
const GENE_BACKDROP_PADDING = 3;
const GENE_TRACK_PADDING = 5;
const STUDY_SLOT_HEIGHT = 50;
const STUDY_TEXT_MAX_WIDTH = 200;
const VARIANT_TRACK_HEIGHT = 7;
const CONNECTOR_TRACK_HEIGHT = 80;
const CHAR_WIDTH = 12; // TODO: base on font-size
const CHAR_HEIGHT = 12;
const HEIGHT_DEFAULT = 400;
const SCALE_FACTOR = 2;
const HIDDEN_TYPE_MAP = {
  gene: 1,
  tagVariant: 2,
  indexVariant: 3,
  study: 4,
};

class Gecko extends React.Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
    this.hiddenCanvasRef = React.createRef();
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
      <div
        ref={measureRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: 'relative',
        }}
      >
        <canvas
          width={width ? width * SCALE_FACTOR : 0}
          height={height * SCALE_FACTOR}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            pointerEvents: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          ref={node => (this.canvasRef = node)}
        />
        <canvas
          className="hidden-canvas"
          width={width}
          height={height}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          ref={node => (this.hiddenCanvasRef = node)}
        />
      </div>
    );
  }
  _width() {
    const { contentRect } = this.props;
    const { width } = contentRect.bounds;
    return width;
  }
  _height() {
    const {
      data: rawData,
      start,
      end,
      selectedGenes,
      selectedTagVariants,
      selectedIndexVariants,
      selectedStudies,
    } = this.props;
    const data = this._filter({
      data: rawData,
      selectedGenes,
      selectedTagVariants,
      selectedIndexVariants,
      selectedStudies,
    });
    const width = this._width();
    if (this._bail(data, width)) {
      return HEIGHT_DEFAULT;
    }
    const scalePosition = d3
      .scaleLinear()
      .domain([start, end])
      .range([0, width]);

    const { slots: geneSlots } = this._geneSlots(data.genes, scalePosition);
    const studySlotCount = this._studySlotCount(data.studies, width);
    const trackConfig = this._trackConfig(geneSlots.length, studySlotCount);
    return trackConfig.height;
  }
  _dimensions() {
    const width = this._width();
    const height = this._height();
    return { width, height };
  }
  _filter({
    data,
    selectedGenes,
    selectedTagVariants,
    selectedIndexVariants,
    selectedStudies,
  }) {
    // return data;
    const {
      genes,
      tagVariants,
      indexVariants,
      studies,
      geneTagVariants,
      tagVariantIndexVariantStudies,
    } = data;

    // copy original
    let genesFiltered = genes.slice();
    let geneTagVariantsFiltered = geneTagVariants.slice();
    let tagVariantsFiltered = tagVariants.slice();
    let tagVariantIndexVariantStudiesFiltered = tagVariantIndexVariantStudies.slice();
    let indexVariantsFiltered = indexVariants.slice();
    let studiesFiltered = studies.slice();

    // iterative filtering (uses AND between entities; OR within entities)

    // genes
    if (selectedGenes) {
      genesFiltered = genesFiltered.filter(
        d => selectedGenes.indexOf(d.id) >= 0
      );
      geneTagVariantsFiltered = geneTagVariantsFiltered.filter(
        d => selectedGenes.indexOf(d.geneId) >= 0
      );
      const tagVariantsLeft = geneTagVariantsFiltered.reduce((acc, d) => {
        acc[d.tagVariantId] = true;
        return acc;
      }, {});
      tagVariantsFiltered = tagVariantsFiltered.filter(
        d => tagVariantsLeft[d.id]
      );
      tagVariantIndexVariantStudiesFiltered = tagVariantIndexVariantStudiesFiltered.filter(
        d => tagVariantsLeft[d.tagVariantId]
      );
      const indexVariantsLeft = tagVariantIndexVariantStudiesFiltered.reduce(
        (acc, d) => {
          acc[d.indexVariantId] = true;
          return acc;
        },
        {}
      );
      indexVariantsFiltered = indexVariantsFiltered.filter(
        d => indexVariantsLeft[d.id]
      );
      const studiesLeft = tagVariantIndexVariantStudiesFiltered.reduce(
        (acc, d) => {
          acc[d.studyId] = true;
          return acc;
        },
        {}
      );
      studiesFiltered = studiesFiltered.filter(d => studiesLeft[d.studyId]);
    }

    // tag variants
    if (selectedTagVariants) {
      tagVariantsFiltered = tagVariantsFiltered.filter(
        d => selectedTagVariants.indexOf(d.id) >= 0
      );
      geneTagVariantsFiltered = geneTagVariantsFiltered.filter(
        d => selectedTagVariants.indexOf(d.tagVariantId) >= 0
      );
      const genesLeft = geneTagVariantsFiltered.reduce((acc, d) => {
        acc[d.geneId] = true;
        return acc;
      }, {});
      genesFiltered = genesFiltered.filter(d => genesLeft[d.id]);
      tagVariantIndexVariantStudiesFiltered = tagVariantIndexVariantStudiesFiltered.filter(
        d => selectedTagVariants.indexOf(d.tagVariantId) >= 0
      );
      const indexVariantsLeft = tagVariantIndexVariantStudiesFiltered.reduce(
        (acc, d) => {
          acc[d.indexVariantId] = true;
          return acc;
        },
        {}
      );
      indexVariantsFiltered = indexVariantsFiltered.filter(
        d => indexVariantsLeft[d.id]
      );
      const studiesLeft = tagVariantIndexVariantStudiesFiltered.reduce(
        (acc, d) => {
          acc[d.studyId] = true;
          return acc;
        },
        {}
      );
      studiesFiltered = studiesFiltered.filter(d => studiesLeft[d.studyId]);
    }

    // index variants
    if (selectedIndexVariants) {
      indexVariantsFiltered = indexVariantsFiltered.filter(
        d => selectedIndexVariants.indexOf(d.id) >= 0
      );
      tagVariantIndexVariantStudiesFiltered = tagVariantIndexVariantStudiesFiltered.filter(
        d => selectedIndexVariants.indexOf(d.indexVariantId) >= 0
      );
      const tagVariantsLeft = tagVariantIndexVariantStudiesFiltered.reduce(
        (acc, d) => {
          acc[d.tagVariantId] = true;
          return acc;
        },
        {}
      );
      tagVariantsFiltered = tagVariantsFiltered.filter(
        d => tagVariantsLeft[d.id]
      );
      const studiesLeft = tagVariantIndexVariantStudiesFiltered.reduce(
        (acc, d) => {
          acc[d.studyId] = true;
          return acc;
        },
        {}
      );
      studiesFiltered = studiesFiltered.filter(d => studiesLeft[d.studyId]);
      geneTagVariantsFiltered = geneTagVariantsFiltered.filter(
        d => tagVariantsLeft[d.tagVariantId]
      );
      const genesLeft = geneTagVariantsFiltered.reduce((acc, d) => {
        acc[d.geneId] = true;
        return acc;
      }, {});
      genesFiltered = genesFiltered.filter(d => genesLeft[d.id]);
    }

    // studies
    if (selectedStudies) {
      studiesFiltered = studiesFiltered.filter(
        d => selectedStudies.indexOf(d.studyId) >= 0
      );
      tagVariantIndexVariantStudiesFiltered = tagVariantIndexVariantStudiesFiltered.filter(
        d => selectedStudies.indexOf(d.studyId) >= 0
      );
      const tagVariantsLeft = tagVariantIndexVariantStudiesFiltered.reduce(
        (acc, d) => {
          acc[d.tagVariantId] = true;
          return acc;
        },
        {}
      );
      const indexVariantsLeft = tagVariantIndexVariantStudiesFiltered.reduce(
        (acc, d) => {
          acc[d.indexVariantId] = true;
          return acc;
        },
        {}
      );
      tagVariantsFiltered = tagVariantsFiltered.filter(
        d => tagVariantsLeft[d.id]
      );
      indexVariantsFiltered = indexVariantsFiltered.filter(
        d => indexVariantsLeft[d.id]
      );
      geneTagVariantsFiltered = geneTagVariantsFiltered.filter(
        d => tagVariantsLeft[d.tagVariantId]
      );
      const genesLeft = geneTagVariantsFiltered.reduce((acc, d) => {
        acc[d.geneId] = true;
        return acc;
      }, {});
      genesFiltered = genesFiltered.filter(d => genesLeft[d.id]);
    }

    return {
      genes: genesFiltered,
      tagVariants: tagVariantsFiltered,
      indexVariants: indexVariantsFiltered,
      studies: studiesFiltered,
      geneTagVariants: geneTagVariantsFiltered,
      tagVariantIndexVariantStudies: tagVariantIndexVariantStudiesFiltered,
    };
  }
  _bail(data, width) {
    return (
      !width ||
      !data ||
      !data.tagVariants ||
      !data.genes ||
      !data.indexVariants ||
      !data.geneTagVariants ||
      !data.tagVariantIndexVariantStudies ||
      !data.studies
    );
  }
  _render() {
    const {
      data: rawData,
      start,
      end,
      selectedGenes,
      selectedTagVariants,
      selectedIndexVariants,
      selectedStudies,
    } = this.props;
    const filteredData = this._filter({
      data: rawData,
      selectedGenes,
      selectedTagVariants,
      selectedIndexVariants,
      selectedStudies,
    });
    const { colorMap, ...data } = this._generateHiddenColors(filteredData);

    const width = this._width();
    if (this._bail(data, width)) {
      return null;
    }

    const canvas = this.canvasRef;
    const context = canvas.getContext('2d');
    const hiddenCanvas = this.hiddenCanvasRef;
    const hiddenContext = hiddenCanvas.getContext('2d');

    d3.select(hiddenCanvas).on('mousemove', function() {
      const point = d3.mouse(this);
      const [r, g, b, a] = hiddenContext.getImageData(
        Math.round(point[0]),
        Math.round(point[1]),
        1,
        1
      ).data;
      const color = `rgb(${r},${g},${b},${a})`;
      const item = colorMap[color];
      if (item) console.log(item);
    });

    const scalePosition = d3
      .scaleLinear()
      .domain([start, end])
      .range([0, width]);

    const { slots: geneSlots, genesWithSlots } = this._geneSlots(
      data.genes,
      scalePosition
    );
    const studySlotCount = this._studySlotCount(data.studies, width);
    const trackConfig = this._trackConfig(geneSlots.length, studySlotCount);
    const { scaleStudyX, scaleStudyY } = this._studyScales(
      data.studies,
      width,
      trackConfig.studies.height
    );

    context.save();
    context.imageSmoothingEnabled = true;
    context.scale(SCALE_FACTOR, SCALE_FACTOR);
    context.clearRect(0, 0, width, trackConfig.height);

    // hiddenContext.save();
    hiddenContext.clearRect(0, 0, width, trackConfig.height);

    this._renderGenes(
      context,
      hiddenContext,
      scalePosition,
      trackConfig.genes,
      genesWithSlots
    );
    this._renderTagVariants(
      context,
      scalePosition,
      trackConfig.tagVariants,
      data.tagVariants
    );
    this._renderIndexVariants(
      context,
      scalePosition,
      trackConfig.indexVariants,
      data.indexVariants
    );
    this._renderGeneTagVariants(
      context,
      scalePosition,
      trackConfig.geneTagVariants,
      data.geneTagVariants
    );
    this._renderStudies(
      context,
      scaleStudyX,
      scaleStudyY,
      trackConfig.studies,
      data.studies
    );
    this._renderTagVariantIndexVariantStudies(
      context,
      scalePosition,
      scaleStudyX,
      trackConfig.tagVariantIndexVariants,
      trackConfig.indexVariantStudies,
      data.tagVariantIndexVariantStudies
    );

    context.restore();
    // hiddenContext.restore();
  }
  _renderGenes(context, hiddenContext, scaleX, track, data) {
    context.save();
    context.translate(0, track.top);
    hiddenContext.save();
    hiddenContext.translate(0, track.top);

    // verticals
    context.strokeStyle = theme.connector.color;
    context.beginPath();
    data.forEach(d => {
      context.moveTo(scaleX(d.tss), d.slotIndex * GENE_SLOT_HEIGHT);
      context.lineTo(scaleX(d.tss), track.height);
    });
    context.stroke();

    // genes
    data.forEach(d => {
      const label = d.start === d.tss ? `${d.symbol}>` : `<${d.symbol}`;
      const textWidth = context.measureText(label).width;

      const backdropX = scaleX(d.start) - GENE_BACKDROP_PADDING;
      const backdropY =
        d.slotIndex * GENE_SLOT_HEIGHT +
        GENE_TRANSCRIPT_OFFSET -
        GENE_BACKDROP_PADDING;
      const backdropWidth =
        Math.max(textWidth, scaleX(d.end) - scaleX(d.start)) +
        GENE_BACKDROP_PADDING * 2;
      const backdropHeight =
        GENE_TRANSCRIPT_HEIGHT + CHAR_WIDTH + GENE_BACKDROP_PADDING * 2;
      const spitY =
        d.slotIndex * GENE_SLOT_HEIGHT +
        GENE_TRANSCRIPT_OFFSET +
        GENE_TRANSCRIPT_HEIGHT / 2;

      // picker
      hiddenContext.fillStyle = d.hiddenColor;
      hiddenContext.fillRect(
        backdropX,
        backdropY,
        backdropWidth,
        backdropHeight
      );

      // backdrop
      context.fillStyle = 'white';
      context.strokeStyle = theme.line.color;
      context.fillRect(backdropX, backdropY, backdropWidth, backdropHeight);
      context.strokeRect(backdropX, backdropY, backdropWidth, backdropHeight);

      // spit
      context.beginPath();
      context.moveTo(scaleX(d.start), spitY);
      context.lineTo(scaleX(d.end), spitY);
      context.stroke();

      // exons
      d.exons.forEach(e => {
        const exonX = scaleX(e[[0]]);
        const exonY = d.slotIndex * GENE_SLOT_HEIGHT + GENE_TRANSCRIPT_OFFSET;
        const exonWidth = scaleX(e[[1]]) - exonX;
        const exonHeight = GENE_TRANSCRIPT_HEIGHT;
        context.fillRect(exonX, exonY, exonWidth, exonHeight);
        context.strokeRect(exonX, exonY, exonWidth, exonHeight);
      });

      // label
      const labelX = scaleX(d.start);
      const labelY =
        d.slotIndex * GENE_SLOT_HEIGHT +
        GENE_TRANSCRIPT_OFFSET * 2 +
        GENE_TRANSCRIPT_HEIGHT;
      context.textBaseline = 'hanging';
      context.fillStyle = theme.line.color;
      context.fillText(label, labelX, labelY);
    });

    context.restore();
    hiddenContext.restore();
  }
  _generateHiddenColors(data) {
    const {
      genes,
      tagVariants,
      indexVariants,
      studies,
      geneTagVariants,
      tagVariantIndexVariantStudies,
    } = data;
    const colorMap = {};
    const genesWithHiddenColor = genes.map((d, i) => {
      const color = this._hiddenColor(i, 'gene');
      colorMap[color] = d;
      return { ...d, hiddenColor: color };
    });
    const tagVariantsWithHiddenColor = tagVariants.map((d, i) => {
      const color = this._hiddenColor(i, 'tagVariant');
      colorMap[color] = d;
      return { ...d, hiddenColor: color };
    });
    const indexVariantsWithHiddenColor = indexVariants.map((d, i) => {
      const color = this._hiddenColor(i, 'indexVariant');
      colorMap[color] = d;
      return { ...d, hiddenColor: color };
    });
    const studiesWithHiddenColor = studies.map((d, i) => {
      const color = this._hiddenColor(i, 'study');
      colorMap[color] = d;
      return { ...d, hiddenColor: color };
    });
    return {
      colorMap,
      genes: genesWithHiddenColor,
      tagVariants: tagVariantsWithHiddenColor,
      indexVariants: indexVariantsWithHiddenColor,
      studies: studiesWithHiddenColor,
      geneTagVariants,
      tagVariantIndexVariantStudies,
    };
  }
  _hiddenColor(entityId, type) {
    const typeId = HIDDEN_TYPE_MAP[type];
    const r = (typeId << 4) + (Math.floor(entityId / 65536) % 256);
    const g = Math.floor(entityId / 256) % 256;
    const b = entityId % 256;
    return `rgb(${r},${g},${b},255)`;
  }
  _renderTagVariants(context, scaleX, track, data) {
    context.save();

    // backdrop
    context.fillStyle = theme.track.background;
    context.translate(0, track.top);
    context.fillRect(0, 0, scaleX.range()[1] - scaleX.range()[0], track.height);

    // tag variants
    context.strokeStyle = theme.line.color;
    context.beginPath();
    data.forEach(d => {
      context.moveTo(scaleX(d.position), 0);
      context.lineTo(scaleX(d.position), track.height);
    });
    context.stroke();

    context.restore();
  }
  _renderIndexVariants(context, scaleX, track, data) {
    context.save();

    // backdrop
    context.fillStyle = theme.track.background;
    context.translate(0, track.top);
    context.fillRect(0, 0, scaleX.range()[1] - scaleX.range()[0], track.height);

    // tag variants
    context.strokeStyle = theme.line.color;
    context.beginPath();
    data.forEach(d => {
      context.moveTo(scaleX(d.position), 0);
      context.lineTo(scaleX(d.position), track.height);
    });
    context.stroke();

    context.restore();
  }
  _renderStudies(context, scaleX, scaleY, track, data) {
    context.save();
    context.translate(0, track.top);

    // verticals
    context.strokeStyle = theme.connector.color;
    context.beginPath();
    data.forEach(d => {
      context.moveTo(scaleX(d.studyId), 0);
      context.lineTo(scaleX(d.studyId), scaleY(d.studyId));
    });
    context.stroke();

    // studies
    context.textBaseline = 'hanging';
    context.textAlign = 'center';
    data.forEach(d => {
      const label = d.traitReported;
      const { lineArray: labelLines, width: textWidth } = this._wrapText(
        context,
        label,
        STUDY_TEXT_MAX_WIDTH
      );
      const textHeight = labelLines.length * CHAR_HEIGHT;

      const backdropX =
        scaleX(d.studyId) - textWidth / 2 - GENE_BACKDROP_PADDING;
      const backdropY = scaleY(d.studyId) - GENE_BACKDROP_PADDING;
      const backdropWidth = textWidth + GENE_BACKDROP_PADDING * 2;
      const backdropHeight = textHeight + GENE_BACKDROP_PADDING * 2;

      // backdrop
      context.fillStyle = 'white';
      context.strokeStyle = theme.line.color;
      context.fillRect(backdropX, backdropY, backdropWidth, backdropHeight);
      context.strokeRect(backdropX, backdropY, backdropWidth, backdropHeight);

      // label
      const labelX = scaleX(d.studyId);
      const labelY = scaleY(d.studyId);
      context.textBaseline = 'hanging';
      context.fillStyle = theme.line.color;
      labelLines.forEach((l, i) => {
        context.fillText(l, labelX, labelY + i * CHAR_HEIGHT);
      });
    });

    context.restore();
  }
  _renderGeneTagVariants(context, scaleX, track, data) {
    context.save();

    // gene tag variants
    context.translate(0, track.top);
    context.strokeStyle = theme.connector.color;
    context.beginPath();
    data.forEach(d => {
      const topX = scaleX(d.geneTss);
      const topY = 0;
      const bottomX = scaleX(d.tagVariantPosition);
      const bottomY = track.height;
      const controlY = (bottomY + topY) / 2;
      context.moveTo(topX, topY);
      context.bezierCurveTo(
        topX,
        controlY,
        bottomX,
        controlY,
        bottomX,
        bottomY
      );
    });
    context.stroke();

    context.restore();
  }
  _renderTagVariantIndexVariantStudies(
    context,
    scaleX,
    scaleStudyX,
    tvIvTrack,
    ivSTrack,
    data
  ) {
    context.save();
    data.forEach(d => {
      const tvIvTopX = scaleX(d.tagVariantPosition);
      const tvIvTopY = tvIvTrack.top;
      const tvIvBottomX = scaleX(d.indexVariantPosition);
      const tvIvBottomY = tvIvTrack.bottom;
      const tvIvControlY = (tvIvBottomY + tvIvTopY) / 2;
      const ivSTopX = scaleX(d.indexVariantPosition);
      const ivSTopY = ivSTrack.top;
      const ivSBottomX = scaleStudyX(d.studyId);
      const ivSBottomY = ivSTrack.bottom;
      const ivSControlY = (ivSBottomY + ivSTopY) / 2;

      context.strokeStyle = d.posteriorProbability
        ? theme.connector.finemappingColor
        : theme.connector.color;
      context.beginPath();
      // tag variant - index variant
      context.moveTo(tvIvTopX, tvIvTopY);
      context.bezierCurveTo(
        tvIvTopX,
        tvIvControlY,
        tvIvBottomX,
        tvIvControlY,
        tvIvBottomX,
        tvIvBottomY
      );
      // index variant - study
      context.moveTo(ivSTopX, ivSTopY);
      context.bezierCurveTo(
        ivSTopX,
        ivSControlY,
        ivSBottomX,
        ivSControlY,
        ivSBottomX,
        ivSBottomY
      );
      context.stroke();
    });
    context.restore();
  }
  _geneSlots(genes, scale) {
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
  _studySlotCount(studies, width) {
    const studiesPerSlot = Math.floor(width / STUDY_TEXT_MAX_WIDTH);
    const slotCount = Math.ceil(studies.length / studiesPerSlot);
    return slotCount;
  }
  _studyScales(studies, width, trackHeight) {
    const studiesPerSlot = Math.floor(width / STUDY_TEXT_MAX_WIDTH);
    const slotCount = Math.ceil(studies.length / studiesPerSlot);
    const domain = studies
      .slice()
      .sort(function(a, b) {
        return a.traitReported - b.traitReported;
      })
      .map(d => d.studyId);
    const rangeX = [STUDY_TEXT_MAX_WIDTH / 2, width - STUDY_TEXT_MAX_WIDTH / 2];
    const rangeY = domain.map((d, i) => {
      const s = GENE_TRACK_PADDING;
      const e = trackHeight - 2 * GENE_TRACK_PADDING;
      return s + ((e - s) * (i % slotCount)) / slotCount;
    });
    const scaleStudyX = d3
      .scalePoint()
      .domain(domain)
      .range(rangeX);
    const scaleStudyY = d3
      .scaleOrdinal()
      .domain(domain)
      .range(rangeY);

    return { scaleStudyX, scaleStudyY };
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
  _wrapText(context, text, maxWidth, textStyle) {
    const splitChar = ' ';
    const wordArray = text.split(splitChar);
    const lineArray = [];
    let lastLine = wordArray[0];
    let width;
    let measure = 0;
    if (wordArray.length <= 1) {
      width =
        wordArray.length === 0 ? 0 : context.measureText(wordArray[0]).width;
      return { lineArray: wordArray, width };
    }
    if (textStyle) {
      context.font = textStyle;
    }
    for (let i = 1; i < wordArray.length; i++) {
      const w = wordArray[i];
      measure = context.measureText(lastLine + splitChar + w).width;
      if (measure < maxWidth) {
        lastLine += splitChar + w;
      } else {
        lineArray.push(lastLine);
        lastLine = w;
      }
      if (i === wordArray.length - 1) {
        lineArray.push(lastLine);
        break;
      }
    }
    width = lineArray
      .map(l => context.measureText(l).width)
      .reduce((acc, val) => (val > acc ? val : acc), 0);
    return { lineArray, width };
  }
}

export default withContentRect('bounds')(Gecko);