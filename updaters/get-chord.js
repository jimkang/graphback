import { tonalityDiamondPitches } from '../tonality-diamond'; import { range } from 'd3-array';
import { interpolateValueWithTick } from '../tasks/interpolate-with-tick';

// TODO: Different curve for each period, multiple periods.
export function getChord({
  ticks,
  probable,
  densityOverTimeArray,
  totalTicks,
}) {
  // TODO: Find out how to calculate c.
  //const chordPitchCount = Math.round(mag * Math.sin(mag + 1.5*Math.PI) + mag) || 1;
  //const chordPitchCount = Math.round(denseness * tonalityDiamondPitches.length) || 1;

  var chordPitchCount = interpolateValueWithTick({
    tickIndex: ticks,
    totalTicks,
    array: densityOverTimeArray,
  });

  console.log('chordPitchCount', chordPitchCount);
  if (chordPitchCount < 1) {
    chordPitchCount = 1;
  }
  // Slightly off start times.
  var delays = range(chordPitchCount).map(() =>
    probable.roll(2) === 0 ? 0 : (probable.roll(10) / 10) * 1
  );
  return { rates: tonalityDiamondPitches.slice(0, chordPitchCount), delays };
}
