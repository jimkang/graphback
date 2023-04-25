import RouteState from 'route-state';
import handleError from 'handle-error-web';
import { version } from './package.json';
import ep from 'errorback-promise';
import ContextKeeper from 'audio-context-singleton';
//import { queue } from 'd3-queue';
import wireControls from './renderers/wire-controls';
import { Ticker } from './updaters/ticker';
import { SampleDownloader } from './tasks/sample-downloader';
import seedrandom from 'seedrandom';
import RandomId from '@jimkang/randomid';
import { createProbable as Probable } from 'probable';
import { ChordPlayer } from './updaters/chord-player';
import { getChord } from './updaters/get-chord';
import { RenderTimeControlGraph } from './renderers/render-time-control-graph';
import { tonalityDiamondPitches } from './tonality-diamond';
import { defaultTotalTicks, defaultSecondsPerTick } from './consts';
import { Undoer } from './updaters/undoer';
import { select } from 'd3-selection';

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var prob;
var chordPlayer;

(async function go() {
  window.onerror = reportTopLevelError;
  renderVersion();

  routeState = RouteState({
    followRoute,
    windowObject: window,
    propsToCoerceToBool: ['enableFeedback'],
  });
  routeState.routeFromHash();
})();

async function followRoute({
  seed,
  totalTicks = defaultTotalTicks,
  secondsPerTick = defaultSecondsPerTick,
  minGrainLength = 0.5,
  maxGrainLength = 0.9,
  minGrainOffset = 0.0,
  maxGrainOffset = 0.5,
  minDuration = 0.9,
  maxDuration = 4.0,
  minFeedbackGain = 0.0,
  maxFeedbackGain = 1.5,
  enableFeedback = true,
  sampleIndex = 0,
}) {
  if (!seed) {
    routeState.addToRoute({ seed: randomId(8) });
    return;
  }

  secondsPerTick = +secondsPerTick;
  minGrainLength = +minGrainLength;
  maxGrainLength = +maxGrainLength;
  minGrainOffset = +minGrainOffset;
  maxGrainOffset = +maxGrainOffset;
  minDuration = +minDuration;
  maxDuration = +maxDuration;

  var renderDensityCanvas = RenderTimeControlGraph({
    canvasId: 'density-canvas',
  });
  var densityUndoer = Undoer({
    onUpdateValue: callRenderDensityCanvas,
    storageKey: 'densityOverTimeArray',
  });
  var renderLengthCanvas = RenderTimeControlGraph({
    canvasId: 'length-canvas',
    lineColor: 'hsl(10, 60%, 40%)',
  });
  var lengthUndoer = Undoer({
    onUpdateValue: callRenderLengthCanvas,
    storageKey: 'lengthOverTimeArray',
  });
  var renderOffsetCanvas = RenderTimeControlGraph({
    canvasId: 'offset-canvas',
    lineColor: 'hsl(240, 60%, 40%)',
  });
  var offsetUndoer = Undoer({
    onUpdateValue: callRenderOffsetCanvas,
    storageKey: 'offsetOverTimeArray',
  });
  var renderDurationCanvas = RenderTimeControlGraph({
    canvasId: 'duration-canvas',
    lineColor: 'hsl(300, 60%, 60%)',
  });
  var durationUndoer = Undoer({
    onUpdateValue: callRenderDurationCanvas,
    storageKey: 'durationOverTimeArray',
  });
  var renderFeedbackCanvas = RenderTimeControlGraph({
    canvasId: 'feedback-canvas',
    lineColor: 'hsl(300, 60%, 60%)',
  });
  var feedbackUndoer = Undoer({
    onUpdateValue: callRenderFeedbackCanvas,
    storageKey: 'feedbackOverTimeArray',
  });

  function callRenderDensityCanvas(newValue, undoer) {
    renderDensityCanvas({
      valueOverTimeArray: newValue,
      valueMin: 1,
      valueMax: tonalityDiamondPitches.length,
      onChange: undoer.onChange,
    });
  }

  function callRenderLengthCanvas(newValue, undoer) {
    renderLengthCanvas({
      valueOverTimeArray: newValue,
      valueMin: minGrainLength,
      valueMax: maxGrainLength,
      onChange: undoer.onChange,
    });
  }

  function callRenderOffsetCanvas(newValue, undoer) {
    renderOffsetCanvas({
      valueOverTimeArray: newValue,
      valueMin: minGrainOffset,
      valueMax: maxGrainOffset,
      onChange: undoer.onChange,
    });
  }

  function callRenderDurationCanvas(newValue, undoer) {
    renderDurationCanvas({
      valueOverTimeArray: newValue,
      valueMin: minDuration,
      valueMax: maxDuration,
      onChange: undoer.onChange,
    });
  }

  function callRenderFeedbackCanvas(newValue, undoer) {
    renderFeedbackCanvas({
      valueOverTimeArray: newValue,
      valueMin: minFeedbackGain,
      valueMax: maxFeedbackGain,
      onChange: undoer.onChange,
    });
  }

  var { error, values } = await ep(getCurrentContext);
  if (error) {
    handleError(error);
    return;
  }

  var ctx = values[0];

  var random = seedrandom(seed);
  prob = Probable({ random });
  prob.roll(2);

  ticker = new Ticker({
    onTick,
    startTicks: 0,
    totalTicks,
    getTickLength,
  });

  sampleDownloader = SampleDownloader({
    sampleFiles: [
      'crackle.wav',
      'rustle.wav',
      'log-crunch.wav',
      'sink-drips.wav',
    ],
    localMode: true,
    onComplete,
    handleError,
  });
  sampleDownloader.startDownloads();

  renderDensityCanvas({
    valueOverTimeArray: densityUndoer.getCurrentValue(),
    valueMin: 1,
    valueMax: tonalityDiamondPitches.length,
    onChange: densityUndoer.onChange,
  });
  renderLengthCanvas({
    valueOverTimeArray: lengthUndoer.getCurrentValue(),
    valueMin: minGrainLength,
    valueMax: maxGrainLength,
    onChange: lengthUndoer.onChange,
  });
  renderOffsetCanvas({
    valueOverTimeArray: offsetUndoer.getCurrentValue(),
    valueMin: minGrainOffset,
    valueMax: maxGrainOffset,
    onChange: offsetUndoer.onChange,
  });
  renderDurationCanvas({
    valueOverTimeArray: durationUndoer.getCurrentValue(),
    valueMin: minDuration,
    valueMax: maxDuration,
    onChange: durationUndoer.onChange,
  });
  renderFeedbackCanvas({
    valueOverTimeArray: feedbackUndoer.getCurrentValue(),
    valueMin: minFeedbackGain,
    valueMax: maxFeedbackGain,
    onChange: feedbackUndoer.onChange,
  });

  (function renderGraphRangeLabels() {
    select('.min-length').text(minGrainLength);
    select('.max-length').text(maxGrainLength);
    select('.min-offset').text(minGrainOffset);
    select('.max-offset').text(maxGrainOffset);
    select('.min-duration').text(minDuration);
    select('.max-duration').text(maxDuration);
    select('.min-feedbcak').text(minFeedbackGain);
    select('.max-feedback').text(maxFeedbackGain);
  })();

  // TODO: Test non-locally.
  function onComplete({ buffers }) {
    console.log(buffers);
    chordPlayer = ChordPlayer({
      ctx,
      sampleBuffer: buffers[sampleIndex],
      enableFeedback,
    });
    wireControls({
      onStart,
      onUndoDensity: densityUndoer.onUndo,
      onUndoLength: lengthUndoer.onUndo,
      onUndoOffset: offsetUndoer.onUndo,
      onUndoDuration: durationUndoer.onUndo,
      onUndoFeedback: feedbackUndoer.onUndo,
      onPieceLengthChange,
      onTickLengthChange,
      totalTicks,
      secondsPerTick,
    });
  }

  function onTick({ ticks, currentTickLengthSeconds }) {
    console.log(ticks, currentTickLengthSeconds);
    chordPlayer.play(
      Object.assign(
        {
          currentTickLengthSeconds,
          grainLengths: lengthUndoer.getCurrentValue(),
          grainOffsets: offsetUndoer.getCurrentValue(),
          durations: durationUndoer.getCurrentValue(),
          feedbackGains: feedbackUndoer.getCurrentValue(),
          tickIndex: ticks,
        },
        getChord({
          ticks,
          probable: prob,
          densityOverTimeArray: densityUndoer.getCurrentValue(),
          totalTicks,
        })
      )
    );
  }

  function onPieceLengthChange(length) {
    routeState.addToRoute({ totalTicks: length });
  }

  function onTickLengthChange(length) {
    routeState.addToRoute({ secondsPerTick: length });
  }

  function getTickLength() {
    return secondsPerTick;
  }
}

function reportTopLevelError(msg, url, lineNo, columnNo, error) {
  handleError(error);
}

function renderVersion() {
  var versionInfo = document.getElementById('version-info');
  versionInfo.textContent = version;
}

// Responders

function onStart() {
  ticker.resume();
}
