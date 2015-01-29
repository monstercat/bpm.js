
# bpm.js [![Build Status](https://travis-ci.org/monstercat/bpm.js.svg)](https://travis-ci.org/monstercat/bpm.js)

  Calculate bpm from a raw audio stream. pure js. non blocking.

## Installation

  Install with npm

    $ npm install bpm.js

## Example

```js
var bpmSink = require('bpm.js')
var spawn = require('child_process').spawn

createAudioStream("track.mp3")
.pipe(bpmSink())
.on("bpm", function(bpm){
  console.log("bpm is %d", bpm)
});


// needed to convert mp3 to proper format
function createAudioStream(filename) {
  var args = "-t raw -r 44100 -e float -c 1 -".split(" ")
  args.unshift(filename)
  var sox = spawn("sox", args)
  return sox.stdout
}


```

## Brought to you by...

This source code was human-transpiled from the C version here:

http://www.pogo.org.uk/~mark/bpm-tools/


## License

    GPLv2
