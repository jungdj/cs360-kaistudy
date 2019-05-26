var express = require('express');
var router = express.Router();
var knex = require('knex')(require('../knexfile').development);

// It's better to move it to js about account router.
function checkAuth(req, res, next) {
  if (!req.session.student_id) {
    res.redirect('/login');
  } else {
    next();
  }
}

function checkGroup_GET(req, res, next) {
  var group_id = parseInt(req.query.group_id);
  
  // check whether group_id is given & is integer string
  if (isNaN(group_id)) {
    res.json({success: false, msg: "wrong group id"});
    return;
  }

  // check whether group_id exists in DB
  knex('group')
  .select('group_id')
  .where('group_id', group_id)
  .then(q_res => {
    if (q_res[0].length <= 0) {
      res.json({success: false, msg: "wrong group id"});
    } else {
      next();
    }
  })
  .catch(console.error);
}

function checkGroup_POST(req, res, next) {
  var group_id = parseInt(req.body.group_id);
  
  // check whether group_id is given & is integer string
  if (isNaN(group_id)) {
    res.json({success: false, msg: "wrong group id"});
    return;
  }

  // check whether group_id exists in DB
  knex('group')
  .select('group_id')
  .where('group_id', group_id)
  .then(q_res => {
    if (q_res[0].length <= 0) {
      res.json({success: false, msg: "wrong group id"});
    } else {
      next();
    }
  })
  .catch(console.error);
}


router.post('/register', checkAuth, (req, res) => {
  var {title, capacity, desc, deadline, workload, category, tag} = req.body;
  var student_id = req.session.student_id;

  
  // check capacity
  if (capacity === undefined) {
    capacity = 5; // default capacity
  } else {
    capacity = parseInt(capacity);
    if (isNaN(capacity)) {
      capacity = 5;
    }
  }

  // TODO: check deadline (is it timestamp?)
  // TODO: check workload (is it either tight, moderate, or loose?)
  
  // check category (if not in category list => set as default category)
  // then create group & participation
  knex('category')
  .select('category_id')
  .where('name', category)
  .then(q_res => {
    if (q_res[0].length <= 0) {
      return null;
    } else {
      return q_res[0][0]["category_id"];
    }
  }) 
  .then(category_id => {
    return knex('group')
    .insert({
      title: title,
      capacity: capacity,
      desc: desc,
      deadline: deadline,
      workload: workload,
      tag: tag,
      category_id: category_id
    })
    //.returning("group_id"); returning is not supported in mysql
  })
  .then(group_id => {
    return knex('participate')
    .insert({
      group_id: group_id,
      student_id: student_id,
      is_owner: true,
      is_pending: false
    })
    .then(() => {
      res.json({success: true, result: {group_id: group_id}});
    });
  })
  .catch(console.error);
});

router.get('/manage', checkAuth, checkGroup_GET, (req, res) => {
  var group_id = parseInt(req.query.group_id); // verified in checkGroup
  var student_id = req.session.student_id;
  result = {};
  
  // Check whether the user is owner of the group
  knex('participate')
  .where({
    group_id: group_id,
    student_id: student_id,
    is_owner: true
  })
  .then(q_res => {
    if (q_res[0].length <= 0) {
      res.json({success: false, msg: "no authority"});
    } else {
      // Retrieve group_detail & part_detail (members & incoming request)
      return Promise.all([
        knex.raw(`select * from \`group\` natural left join
            (select category_id, name as category_name from category) as c
            where group_id=${group_id}`)
          .then(q_res => {
            result["group_detail"] = q_res[0][0];
          }),
        knex.select('*')
          .from(() => {
            this.select('*').from('participate')
                .where('group_id', group_id)
                .as('part')
          })
          .joinRaw('natural join student')
          .then(q_res => {
            result["part_detail"] = q_res[0][0];
          })
      ])
      .then(() => {
        res.json({success: true, result: result});
      });
    }
  })
  .catch(console.error);
});

router.get('/detail', checkAuth, checkGroup_GET, (req, res) => {
  var group_id = parseInt(req.query.group_id);
  var student_id = req.session.student_id;
  var result = {};

  Promise.all([
    // Check the user's status in the group to show
    // proper button (participate / requesting / already in)
    knex('participate')
      .select("is_pending")
      .where({
        student_id: student_id,
        group_id: group_id
      })
      .then(q_res => {
        if (q_res[0].length <= 0) {
          result["user_status"] = 0; // "Participate" button needed
        } else if (q_res[0][0].is_pending) {
          result["user_status"] = 1; // "Requesting" button needed
        } else {
          result["user_status"] = 2; // "Already in" button needed
        }
      }),
    // retrieve group_detail
    knex.raw(`select * from \`group\` natural left join 
      (select category_id, name as category_name from category) as c
      where group_id=${group_id}`)
      .then(q_res => {
        result["group_detail"] = q_res[0][0];
      }),
    // retrieve owner info
    knex('participate')
    .select("student_id")
    .where('group_id', group_id)
    .then(q_res => {
      var owner_id = q_res[0][0].student_id;
      return knex('student')
        .where('student_id', student_id)
        .then(q_res2 => {
          result["owner_info"] = q_res2[0][0];
        });
    })
  ])  
  .then(() => {
    res.json({success: true, result: result});
  })
  .catch(console.error);
});

router.post('/comment/new/', checkAuth, checkGroup_POST, async (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var student_id = req.session.student_id;
  var {text, parent_comment_id} = req.body;
  
  // Check validity of parent_comment_id (parent_comment_id should be 1-level & in group_id)
  // - select 1 from comment where comment_id=${parent_comment_id}
  //                            and parent_comment=null
  //                            and group_id=${group_id}
  if (parent_comment_id != undefined) {
    await knex('comment')
      .select('comment_id')
      .where({
        comment_id: parent_comment_id,
        parent_comment_id: null,
        group_id: group_id
      })
      .then(q_res => {
        if (q_res[0].length <= 0) {
          res.json({success: false, msg: "wrong parent comment"})
        }
      });
  } else {
    parent_comment_id = null;
  }

  knex('comment')
  .insert({
    text: text,
    student_id: student_id,
    group_id: group_id,
    parent_comment_id: parent_comment_id
  })
  .then(q_res => {
    res.json({success: true});
  }).catch(console.error);
});

router.post('/comment/modify/', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var student_id = req.session.student_id;
  var {text, comment_id} = req.body;
  
  // TODO: check validity of comment_id with respect to group_id, student_id
  // OR just ...
  // - update comment set text="${text(sanitized)}"
  //    where group_id=${group_id} and comment_id=${comment_id} and student_id=${};
  
  // Not implemented yet
});

router.get('/comment/list/', checkAuth, checkGroup_GET, (req, res) => {
  var group_id = parseInt(req.query.group_id);

  // Get all comments in the group
  knex('comment')
  .joinRaw('natural join student')
  .where('group_id', group_id)
  .then(q_res => {
    res.json({success: true, result: q_res[0]})
  })
});

router.get('/participate/list/', checkAuth, checkGroup_GET, (req, res) => {
  var group_id = parseInt(req.query.group_id);
  var student_id = req.session.student_id;

  // - select is_owner, is_pending from participate where student_id=${student_id} and group_id=${group_id};
  knex('participate')
  .select("is_owner", "is_pending")
  .where({
    student_id: student_id,
    group_id: group_id
  })
  .then(q_res => {
    if (q_res[0].length <= 0) {
      res.json({success: false, msg: "no authority"});
      return;
    }

    var part_status = q_res[0][0];
    var is_owner = part_status["is_owner"];
    var is_member = !part_status["is_pending"];
    if (!is_member) {
      // For non-member
      res.json({success: false, msg: "no authority"});
      return;
    }

    // Check which participation data to send
    if (is_owner) {
      // For owner
      return knex('participate')
      .joinRaw("natural join student")
      .where('group_id', group_id)
      .then(q_res => {
        res.json({success: true, result: q_res[0]});
      });
    } else {
      // For non-owner member
      return knex('participate')
      .joinRaw("natural join student")
      .where({
        'group_id': group_id,
        'is_pending': 0,
      })
      .then(q_res => {
        res.json({success: true, result: q_res[0]});
      });
    }
  })
  .catch(console.error)
});

router.post('/participate/new/', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var student_id = req.session.student_id;

  knex('participate')
  .insert({
    student_id: student_id,
    group_id: group_id
  })
  .then(() => {
    res.json({success: true});
  })
  .catch(console.error);
});

router.post('/participate/accept', checkAuth, (req, res) => {
  var {part_student_id, part_group_id} = req.body;
  var student_id = req.session.student_id;

  // Two check routines
  Promise.all([
    knex('participate')
      .where({
        student_id: part_group_id,
        group_id: part_group_id,
        is_pending: 1
      })
      .then(q_res => {
        if(q_res[0].length <= 0) {
          Promise.reject("wrong participation information");
          return;
        }
      }),
    knex('participate')
      .where({
        student_id: student_id,
        group_id: part_group_id,
        is_owner: true
      })
      .then(q_res => {
        if(q_res[0].length <= 0) {
          Promise.reject("you have no authority to accept participation");
          return;
        }
      })
  ])
  .then(() => {
    knex('participate')
    .where({
      student_id: part_student_id,
      group_id: part_group_id
    })
    .update({is_pending: 0})
    .then(() => {
      res.json({success: true});
    })
    .catch(console.error);
  })
  .catch(msg => {
    res.json({success: false, msg: msg});
  });
});

router.post('/participate/reject', checkAuth, checkGroup_POST, (req, res) => {
  var {part_student_id, part_group_id} = req.body;
  var student_id = req.session.student_id;

  // Two check routines
  Promise.all([
    knex('participate')
      .where({
        student_id: part_group_id,
        group_id: part_group_id,
        is_pending: 1
      })
      .then(q_res => {
        if(q_res[0].length <= 0) {
          Promise.reject("wrong participation information");
          return;
        }
      }),
    knex('participate')
      .where({
        student_id: student_id,
        group_id: part_group_id,
        is_owner: true
      })
      .then(q_res => {
        if(q_res[0].length <= 0) {
          Promise.reject("you have no authority to reject participation");
          return;
        }
      })
  ])
  .then(() => {
    knex('participate')
    .where({
      student_id: part_student_id,
      group_id: part_group_id
    })
    .delete()
    .then(() => {
      res.json({success: true});
    })
    .catch(console.error);
  })
  .catch(msg => {
    res.json({success: false, msg: msg});
  });
});

router.post('/endRecruit', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var student_id = req.session.student_id;

  // Check authority of user to end recruitment of the group
  knex('participate')
  .where({
    student_id: student_id,
    group_id: group_id,
    is_owner: true
  })
  .then(q_res => {
    if (q_res[0].length <= 0) {
      res.json({success: false, msg: "you have no authority to end recruitment"});
      return;
    }
    return knex('group')
    .where("group_id", group_id)
    .update("is_recruiting", false)
    .then(() => {
      res.json({success: true})
    });
  })
  .catch(console.error);
});

router.post('/deleteGroup', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var student_id = req.session.student_id;

  // Check authority of user to delete the group
  knex('participate')
  .where({
    student_id: student_id,
    group_id: group_id,
    is_owner: true
  })
  .then(q_res => {
    if (q_res[0].length <= 0) {
      res.json({success: false, msg: "you have no authority to delete group"});
      return;
    }
    return knex('group')
    .where("group_id", group_id)
    .delete()
    .then(() => {
      res.json({success: true})
    });
  })
  .catch(console.error);
});

router.post('/list', (req, res) => {
  knex.raw("select * from `group` natural left join (select category_id, name as category_name from category) as c")
  .then(q_res => {
    res.json({success: true, result: q_res[0]})
  })  
});

module.exports = router;