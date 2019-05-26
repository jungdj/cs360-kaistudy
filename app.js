var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');


var usersRouter = require('./routes/users');
var groupRouter = require('./routes/group')

var app = express();

// view engine setup

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  key: 'sessid',
  secret: 'tobechanged',
  cookie: {
    maxAge: 1000 * 60 * 60
  }
}));


app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', usersRouter);
app.use('/group', groupRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
