var env = require(__dirname + '/env.json');

module.exports.config = function() {
  var node_env = process.env.NODE_ENV || 'development';
  return env[node_env];
};
