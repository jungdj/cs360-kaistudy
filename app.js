var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
const morgan = require('morgan');
const cors = require ('cors');

var userRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var groupRouter = require('./routes/group');

var app = express();

// view engine setup

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  key: 'sessid',
  secret: 'tobechanged',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(morgan('dev', {
  skip: (req, res) => {
    return res.statusCode < 400;
  }, stream: process.stderr,
}));

app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/user', userRouter);
app.use('/group', groupRouter);
app.use('/auth', authRouter);

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
  res.send('error');
});

console.log(`App running on PORT : ${process.env.PORT || 4000} - ${process.env.NODE_ENV}`);
console.log(`App running on PORT : ${process.env.PORT || 4000} - ${process.env.NODE_ENV}`);
console.log(`App running on PORT : ${process.env.PORT || 4000} - ${process.env.NODE_ENV}`);
console.log(`App running on PORT : ${process.env.PORT || 4000} - ${process.env.NODE_ENV}`);
console.log(`App running on PORT : ${process.env.PORT || 4000} - ${process.env.NODE_ENV}`);

module.exports = app;
