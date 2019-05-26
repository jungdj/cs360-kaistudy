var express = require('express');
var router = express.Router();
var knex = require('knex')(require('../knexfile').development);

/* GET users listing. */
router.get('/', function(req, res, next) {
  const { student_id } = req.session
  if (student_id) {
    knex('student')
      .where({ student_id })
      .then(users => {
        const { password, ...user } = users[0]
        res.json({
          status: 200,
          data: user
        })
      })
      .catch(error => {
        res.status(401).json({
          status: 401,
          data: "Not authorized"
        })
      })
  } else {
    res.status(401).json({
      status: 401,
      data: "Not authorized"
    })
  }
});


/* GET users listing. */
router.get('/:student_id', function(req, res, next) {
  const { student_id } = req.params
  if (student_id) {
    knex('student')
      .where({ student_id })
      .then(users => {
        const { password, ...user } = users[0]
        res.json({
          status: 200,
          data: user
        })
      })
      .catch(error => {
        res.status(401).json({
          status: 401,
          data: "Not authorized"
        })
      })
  } else {
    res.status(401).json({
      status: 401,
      data: "Not authorized"
    })
  }
});

module.exports = router;
