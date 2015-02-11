'use strict';

var through = require('through2')
var rng = require('seedrandom')('bpm.js')
var debug = require("debug")("bpm")


// TODO: make these configurable?

var RATE = 44100 /* of input data */
var LOWER = 84.0
var UPPER = 146.0

var BLOCK = 4096
var INTERVAL = 128

/*
 * Sample from the metered energy
 *
 * No need to interpolate and it makes a tiny amount of difference; we
 * take a random sample of samples, any errors are averaged out.
 */
function sample(nrg, len, offset) {
  var n = Math.floor(offset);
  return (n >= 0.0 && n < len) ? nrg[n] : 0.0;
}

var beats = [ -32, -16, -8, -4, -2, -1,
                1,   2,  4,  8, 16, 32 ];
var nobeats = [ -0.5, -0.25, 0.25, 0.5 ];

/*
 * Test an autodifference for the given interval
 */
function autodifference(nrg, len, interval)
{
  var n, y, w;
  var mid, v, diff, total;

  mid = rng() * len;
  v = sample(nrg, len, mid);

  diff = 0.0;
  total = 0.0;

  for (n = 0; n < beats.length; n++) {
    y = sample(nrg, len, mid + beats[n] * interval);
    w = 1.0 / Math.abs(beats[n]);
    diff += w * Math.abs(y - v);
    total += w;
  }

  for (n = 0; n < nobeats.length; n++) {
    y = sample(nrg, len, mid + nobeats[n] * interval);
    w = Math.abs(nobeats[n]);
    diff -= w * Math.abs(y - v);
    total += w;
  }

  return diff / total;
}

/*
 * Beats-per-minute to a sampling interval in energy space
 */

function bpmToInterval(bpm)
{
  var beatsPerSecond = bpm / 60;
  var samplesPerBeat = RATE / beatsPerSecond;
  return samplesPerBeat / INTERVAL;
}

/*
 * Sampling interval in enery space to beats-per-minute
 */

function intervalToBPM(interval)
{
  var samplesPerBeat = interval * INTERVAL;
  var beatsPerSecond = RATE / samplesPerBeat;
  return beatsPerSecond * 60;
}

/*
 * Scan a range of BPM values for the one with the
 * minimum autodifference
 */

function scanForBPM(nrg, len, slowest, fastest, steps, samples, done) {
  slowest = bpmToInterval(slowest);
  fastest = bpmToInterval(fastest);
  debug("slowest %d", slowest)
  debug("fastest %d", fastest)
  debug("samples %d", samples)
  var step = (slowest - fastest) / steps;

  var intervals = [];
  var height = Infinity;
  var trough = NaN;
  var i = 0;
  var interval = fastest;

  function autodiff() {
    var t = 0;

    if (interval > slowest)
      return done(null, intervalToBPM(trough))

    for (var s = 0; s < samples; ++s)
      t += autodifference(nrg, len, interval)

    if (t < height) {
      trough = interval;
      height = t;
    }

    interval += step
    setImmediate(autodiff)
  }

  autodiff()

  debug("trough", trough)
  return intervalToBPM(trough);
}

function bufRead(arr, i) {
  return arr.readFloatLE(i*4);
}

function bufSize(arr) {
  return arr.length / 4;
}

function bpmCalcSink(opts) {
  opts = opts || {};
  var nrg = [];
  var len = 0;
  var v = 0.0;
  var n = 0;
  var buf = 0;
  var min = opts.min == null? LOWER : opts.min;
  var max = opts.max == null? UPPER : opts.max;

  function write(chunk, enc, done) {
    for (var i = 0; i < bufSize(chunk); ++i) {
      var z = bufRead(chunk, i)
      /* Maintain an energy meter (similar to PPM) */

      z = Math.abs(z);
      if (z > v) {
        v += (z - v) / 8;
      } else {
        v -= (v - z) / 512;
      }

      /* At regular intervals, sample the energy to give a
       * low-resolution overview of the track */

      n++;
      if (n !== INTERVAL)
        continue;

      n = 0;

      var energy = len * (INTERVAL / RATE)
      this.emit("energy", energy, v);

      nrg[len++] = v;
    }
    done();
  }

  function end() {
    var self = this;
    scanForBPM(nrg, len, min, max, 1024, 1024, function(err, bpm){
      self.emit("bpm", bpm)
    })
  }

  return through(write, end);
}

module.exports = bpmCalcSink;
