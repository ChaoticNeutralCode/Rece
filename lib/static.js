/*
 * A static file preprocessor.
 * It will find then serve static files
 * from a given directory.
 */
const path = require('path'),
      fs = require('fs');

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript'
};

module.exports = function() {

  const pathPieces = arguments;

  return function(req, res, next) {
    const file = path.join(
      ...pathPieces,
      (req.path === '/' ? './index.html' : req.path));

    fs.access(file, fs.constants.F_OK | fs.constants.R_OK, err => {
      if(!err) {
        res.setHeader(
          'content-type',
          CONTENT_TYPES[path.extname(file).toLowerCase()] || 'text/plain');
  
        fs.createReadStream(file).pipe(res);

        next(true);
      } else {
        next();
      }
    });
  }.bind(path);
};