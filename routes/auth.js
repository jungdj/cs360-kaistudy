var express = require('express');
var router = express.Router();
var knex = require('knex')(require('../knexfile').development);


router.get('/', function(req, res) {
  const { student_id } = req.session
  if (student_id) {
    res.json({
      status: 200,
      data: true
    })
  } else {
    res.json({
      status: 200,
      data: false
    })
  }
})

router.post('/logout', (req, res) => {
  req.session.destroy()
  res.clearCookie('sessid')
  res.json({
    status: 200,
    data: null
  })
})

/* GET users listing. */
router.post('/signup', function(req, res, next) {
  const { email, password, first_name, last_name, student_id, phone_number } = req.body
  knex('student')
    .insert({
      email, password, first_name, last_name, student_id, phone_number
    })
    .then(id => {
      console.log({ id })
      res.json({
        status: 201,
        data: id
      });
    })
    .catch(error => {
      console.log(error)
      res.status(500).send(error)
    })
});

router.post("/signin", function(req, res, next) {
    const { student_id, password } = req.body
    console.log('id', req.session.student_id)
    knex('student')
        .where({ student_id, password })
      .then(user => {
        console.log({ user })
        req.session.student_id = student_id
        res.json({
          status: 200,
          data: user[0]
        });
      })
      .catch(error => {
        console.log(error)
        res.status(500).send(error)
      })
  });

module.exports = router;
