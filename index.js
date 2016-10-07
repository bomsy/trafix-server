var express =  require('express');
var bodyParser = require('body-parser');
var app = express();
var r = require('rethinkdb');
var server = require('http').Server(app);
var io = require('socket.io')(server);

var config = require(__dirname + '/config.js').config();

var port = process.env.PORT || config.port;

var router = express.Router();

function handleError(err) {
  console.log(err.message);
  process.exit(1);
}

function createTable(conn) {
  if (!r.tableList().contains(config.rethinkdb.table)) {
    return r.tableCreate(config.rethinkdb.table)
      .run(conn);
  } else {
    return r.table(config.rethinkdb.table)
      .run(conn);
  }
}

function watchChanges() {
  r.connect(config.rethinkdb.connection)
    .then(function(conn) {
      r.table(config.rethinkdb.table)
        .changes()
        .run(conn, function(err, cursor) {
          cursor.each(function(err, change) {
            io.emit('status', change.new_val);
          });
        });
    })
    .error(handleError);
}

function createDB(conn) {
  return r.dbCreate(config.rethinkdb.connection.db)
    .run(conn)
}

function startServer() {
  server.listen(config.sockPort);
  app.listen(port);
  console.log('API Server running on port ' + port);
  console.log('Socket Server running on port ' + config.sockPort );
}

// middleware which all the requests will pass through
router.use(function(req, res, next) {
  next();
});

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.get('/', function(req, res) {
  res.json({ message: 'hooray! welcome to our api!' });
});

// add a status
router.route('/status')
  .post(function(req, res) {
    r.connect(config.rethinkdb.connection)
      .then(function(conn) {
        r.table(config.rethinkdb.table)
          .insert(req.body)
          .run(conn);
      })
      .error(handleError)

    res.end();
  });

app.use('/api', router);
app.use('/traffic', express.static(__dirname + '/public'));

io.on('connection', function(socket) {
  // get the statuses for all the last few
  // seconds
  console.log(socket.id + ' connected!');
});

r.connect(config.rethinkdb.connection)
  .then(createTable)
  .then(function() {
    console.log('RethinkDB database ' + config.rethinkdb.connection.db + ' running on port ' + config.rethinkdb.connection.port);
    watchChanges();
    startServer();
  })
  .error(handleError)
