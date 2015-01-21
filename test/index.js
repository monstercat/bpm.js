
var expect = require('expect.js')
var blocked = require('blocked')
var createBpmSink = require('../')
var spawn = require('child_process').spawn
var join = require('path').join
var fs = require('fs')

function createAudioStream() {
  var path = join(__dirname, "hellberg.mp3")
  var sox = spawn("sox", [path, "-t", "raw", "-r", "44100", "-e", "float", "-c", "1", "-"])
  return sox.stdout;
}

describe('bpm calc', function(){
  it('works', function(done){
    var bpmSink = createBpmSink()
    createAudioStream().pipe(bpmSink)

    blocked(function(ms){
      throw Error("BLOCKED FOR "+ms+"+ms")
    });

    bpmSink.on("bpm", function(bpm){
      expect(Math.floor(bpm)).to.be(128)
      done()
    });
  });
});
