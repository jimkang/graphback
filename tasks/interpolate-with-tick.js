export function interpolateValueWithTick({ array, tickIndex, totalTicks }) {
  return array[
    Math.floor((tickIndex / totalTicks) * array.length)
  ];
}