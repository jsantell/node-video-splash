var exec = require('child_process').exec;

// Nest them functions
module.exports = function (splash, input, output, duration) {
  if (!input)
    throw new Error('No input video specified');
  if (!splash)
    throw new Error('No input image specified');

  output = output || 'output.mp4';
  duration = duration || 1;

  getDimensions(input, function (dimension) {
    resizeSplash(splash, dimension.width, dimension.height, function (image) {
      concat(image, input, output, duration);
    });
  });
};


function getDimensions (input, callback) {
  var probe = 'ffprobe -v quiet -print_format json -show_streams ' + input;
  exec(probe, function (err, stdout) {
    var data;
    try {
      data = JSON.parse(stdout);
    } catch (e) {
      console.error('Could not parse resolution of ' + input);
      throw e;
    }
    var video = data.streams.filter(function (stream) {
      return stream.codec_type === 'video';
    })[0];

    var w = video.width;
    var h = video.height;
    callback({ width: w, height: h });
  });
}

function resizeSplash (splash, w, h, callback) {
  var resize = 'ffmpeg -i ' + splash + ' -vf scale=' +
    w + ':' + h + ' tmp.jpg', error;

  // If 1920x1080, no need to resize
  if (w == 1920 && h == 1080)
    return callback(splash);

  exec(resize, function (err, stdout, stderr) {
    if (err) throw err;
    callback('tmp.jpg');
  });
}

function concat (image, input, output, duration) {

  var merge = 'ffmpeg -itsoffset ' + duration + ' -i ' + input +
    ' -r 25 -loop 1 -i ' + image + ' -filter_complex ' +
    '"[1:v] fade=out:' + (duration * 25) + ':25:alpha=1 [intro]; ' +
    '[0:v][intro] overlay [v]" ' +
    '-map "[v]" -map 0:a -acodec copy ' + output;

  console.log('Processing.. may take a few ' +
    '(~3 minutes for 1080p 3 minute video)');

  exec(merge, function (err, stdout, stderr) {
    if (err) console.error(err);
    else console.log(output + ' created.');
  });
}
