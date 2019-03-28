/*
 * A static file preprocessor.
 * It will find then serve static files
 * from a given directory.
 */
const path = require('path'),
      fs = require('fs');

const CONTENT_TYPES = require('./file_mimes.json');

function processor(req, res, next) {
  if(this.route && this.route !== req.path) {
    return next();
  }
  
  let file = this.path;
  
  if(!this.route) {
    file = path.join(this.path,
      (req.path === '/' ? './index.html' : req.path));
  } 
  //console.log(file);

  fs.access(file, fs.constants.F_OK | fs.constants.R_OK, err => {
    if(!err) {
      res.setHeader(
        'content-type',
        CONTENT_TYPES[
          path.extname(file).substring(1).toLowerCase()
        ] || 'text/plain');

      fs.createReadStream(file).pipe(res);

      next(true);
    } else {
      next();
    }
  });
};

module.exports = function(...pathPieces) {
  const ext = path.extname(pathPieces[pathPieces.length - 1]);
  
  // If there is no file extension its a static folder
  let ctx = {
    route: null,
    path: path.join(...pathPieces)
  };

  if(ext) {
    ctx = {
      route: pathPieces[0],
      path: path.join(...pathPieces.slice(1))
    };
  }

  return processor.bind(ctx);
};