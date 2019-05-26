var express = require('express');
var router = express.Router();
var knex = require('knex')(require('../knexfile').development);

// It's better to move it to js about account router.
function checkAuth(req, res, next) {
  console.log(req.session.student_id)
  if (!req.session.student_id) {
    res.status(401).json({status: 401, data: null});
  } else {
    next();
  }
}

function checkGroup_GET(req, res, next) {
  var group_id = parseInt(req.query.group_id);

  // check whether group_id is given & is integer string
  if (isNaN(group_id)) {
    res.status(404).json({status: 404, msg: "wrong group id"});
    return;
  }

  // check whether group_id exists in DB
  knex('group')
  .select('group_id')
  .where('group_id', group_id)
  .then(group => {
    if (group.length <= 0) {
      res.status(404).json({status: 404, msg: "wrong group id"});
    } else {
      next();
    }
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error)
  });
}

function checkGroup_POST(req, res, next) {
  var group_id = parseInt(req.body.group_id);

  // check whether group_id is given & is integer string
  if (isNaN(group_id)) {
    res.status(404).json({status: 404, msg: "wrong group id"});
    return;
  }

  // check whether group_id exists in DB
  knex('group')
  .select('group_id')
  .where('group_id', group_id)
  .then(group => {
    if (group.length <= 0) {
      res.status(404).json({status: 404, msg: "wrong group id"});
    } else {
      next();
    }
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error)
  });
}


/*
 GET /group?id=0
 GET /group/list
 POST /group
 DELETE /group
 PUT /group
 */
/*
  {
    title: "",
    description: "",
    participants: {
      owner: owner_id,
      members: [...members_id]
    }
  }
 */

router.get('/', (req, res) => {
  const group_id = parseInt(req.query.group_id);

  knex('group')
  .where({ group_id })
  .then(groups => {
    const group = groups[0]
    res.status(200).json({
      status: 200,
      data: group
    })
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });
});

router.post('/', checkAuth, (req, res) => {
  var {title, capacity, desc, deadline, workload, category_name, tag} = req.body;
  var student_id = req.session.student_id;

  category_name = category_name.toLowerCase();

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
  .where('name', category_name)
  .then(category => {
    if (category.length <= 0) {
      return null;
    } else {
      return category[0]["category_id"];
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
  .then(() => {
    return knex('group')
      .select('group_id')
      .where('title', title) // assuming title is unique
      .then(group_ids => {
        const group_id = group_ids[0]["group_id"];
        return knex('participate')
          .insert({
            group_id: group_id,
            student_id: student_id,
            is_owner: true,
            is_pending: false
          })
          .then(() => {
            res.status(200).json({status: 200, data: {group_id: group_id}});
          });
      });
  })
  .catch((error) => {
    console.error(error);
    res.sendStatus(500);
  });
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
    if (q_res.length <= 0) {
      res.status(401).json({status: 401, msg: "No authority"});
    } else {
      // Retrieve group_detail & part_detail (members & incoming request)
      return Promise.all([
        knex.raw(`select * from \`group\` natural left join
            (select category_id, name as category_name from category) as c
            where group_id=${group_id}`)
          .then(q_res2 => {
            result["group_detail"] = q_res2[0][0];
          }),
        knex.select('*')
          .from(function () {
            this.select('is_pending', 'is_owner', 'student_id', 'group_id',
              'created_at as part_created_at', 'updated_at as part_updated_at')
                .from('participate')
                .where('group_id', group_id)
                .as('p')
          })
          .joinRaw('natural join (select student_id, email, first_name, last_name, phone_number from student) as s')
          .then(part_details => {
            result["part_detail"] = part_details;
          })
      ])
      .then(() => {
        res.status(200).json({status: 200, data: result});
      });
    }
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });
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
      .then(states => {
        if (states.length <= 0) {
          result["user_status"] = 0; // "Participate" button needed
        } else if (states[0].is_pending) {
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
        return knex('participate').count('*').where({
            group_id: group_id,
            is_pending: false
          })
          .then(member_cnt => {
            result["group_detail"]["member_cnt"] = member_cnt[0]["count(*)"];
          })
      }),
    // retrieve owner info
    knex('participate')
    .select("student_id")
    .where({
      group_id: group_id,
      is_owner: true
    })
    .then(owners => {
      var owner_id = owners[0].student_id;
      return knex('student')
        .where('student_id', student_id)
        .then(students => {
          const {password, ...owner} = students[0];
          result["owner_info"] = owner;
        });
    }),
    // retrieve comment info
    knex.select("*")
      .from(function () {
        this.select("comment_id", "group_id", "student_id", "parent_comment_id",
          "text", "created_at as comment_created_at")
          .from("comment")
          .where('group_id', group_id)
          .as('cmt')
      })
      .joinRaw('natural join (select student_id, email, first_name, last_name, phone_number from student) as s')
      .then(comments => {
        result["comment_info"] = comments;
      })
  ])
  .then(() => {
    res.status(200).json({status: 200, data: result});
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });
});

router.post('/comment', checkAuth, checkGroup_POST, async (req, res) => {
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
      .then(comments => {
        if (comments.length <= 0) {
          res.status(500).json({status: 500, msg: "wrong parent comment"})
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
  .then(() => {
    res.status(200).json({status: 200, data: null});
  }).catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });
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

// Since comment listing does not require authorization, it's added just like /group/detail
router.get('/comment/list/', checkAuth, checkGroup_GET, (req, res) => {
  var group_id = parseInt(req.query.group_id);

  // Get all comments in the group
  knex.select("*")
  .from(function () {
    this.select("comment_id", "group_id", "student_id", "parent_comment_id",
      "text", "created_at as comment_created_at")
      .from("comment")
      .where('group_id', group_id)
      .as('cmt')
  })
  .joinRaw('natural join (select student_id, email, first_name, last_name, phone_number from student) as s')
  .then(comments => {
    res.status(200).json({status: 200, data: comments})
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
  .then(states => {
    if (states.length <= 0) {
      res.status(401).json({status: 401, msg: "No authority"});
      return;
    }

    var part_status = states[0];
    var is_owner = part_status["is_owner"];
    var is_member = !part_status["is_pending"];
    if (!is_member) {
      // For non-member
      res.status(401).json({status: 401, msg: "No authority"});
      return;
    }

    // Check which participation data to send
    if (is_owner) {
      // For owner
      return knex.from(function () {
          this.select('is_pending', 'is_owner', 'student_id', 'group_id',
            'created_at as part_created_at', 'updated_at as part_updated_at')
              .from('participate')
              .where('group_id', group_id)
              .as('p')
        })
      .joinRaw('natural join (select student_id, email, first_name, last_name, phone_number from student) as s')
      .then(part_details => {
        res.status(200).json({status: 200, data: part_details});
      });
    } else {
      // For non-owner member
      return knex.from(function () {
        this.select('is_pending', 'is_owner', 'student_id', 'group_id',
          'created_at as part_created_at', 'updated_at as part_updated_at')
            .from('participate')
            .where({
              group_id: group_id,
              is_pending: false
            })
            .as('p')
      })
      .joinRaw('natural join (select student_id, email, first_name, last_name, phone_number from student) as s')
      .then(part_details => {
        res.status(200).json({status: 200, data: part_details});
      });
    }
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error);
  })
});

router.post('/participate', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var student_id = req.session.student_id;

  knex('participate')
  .insert({
    student_id: student_id,
    group_id: group_id
  })
  .then(() => {
    res.status(200).json({status: 200, data: null});
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });
});

router.post('/participate/accept', checkAuth, (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var part_student_id = req.body.student_id; // POST param is student_id, not part_student_id
  var student_id = req.session.student_id;

  // Two check routines
  Promise.all([
    knex('participate')
      .where({
        student_id: part_student_id,
        group_id: group_id,
        is_pending: true
      })
      .then(parts => {
        if(parts.length <= 0) {
          return Promise.reject({status: 500, data: "wrong participation information"});     
        }
      }),
    knex('participate')
      .where({
        student_id: student_id,
        group_id: group_id,
        is_owner: true
      })
      .then(parts => {
        if(parts.length <= 0) {
          return Promise.reject({status: 401, data: "No authority"});
        }
      })
  ])
  .then(() => {
    knex('participate')
    .where({
      student_id: part_student_id,
      group_id: group_id
    })
    .update({is_pending: 0})
    .then(() => {
      res.status(200).json({status: 200, data: null});
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error);
    });
  })
  .catch(result => {
    console.log(result);
    res.status(result.status).json(result);
  });
});

router.post('/participate/reject', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var part_student_id = req.body.student_id;
  var student_id = req.session.student_id;

  // Two check routines
  Promise.all([
    knex('participate')
      .where({
        student_id: part_student_id,
        group_id: group_id,
        is_pending: true
      })
      .then(parts => {
        if(parts.length <= 0) {
          return Promise.reject({status: 500, data: "wrong participation information"});
        }
      }),
    knex('participate')
      .where({
        student_id: student_id,
        group_id: group_id,
        is_owner: true
      })
      .then(parts => {
        if(parts.length <= 0) {
          return Promise.reject({status: 401, data: "No authority"});
        }
      })
  ])
  .then(() => {
    knex('participate')
    .where({
      student_id: part_student_id,
      group_id: group_id
    })
    .delete()
    .then(() => {
      res.status(200).json({status: 200, data: null});
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error);
    });
  })
  .catch(result => {
    console.log(result);
    res.status(result.status).json(result);
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
  .then(parts => {
    if (parts.length <= 0) {
      res.status(401).json({status: 401, msg: "No authority"});
      return;
    }
    return knex('group')
      .where("group_id", group_id)
      .update("is_recruiting", false)
      .then(() => {
        res.status(200).json({status: 200, data: null});
      });
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });
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
  .then(parts => {
    if (parts.length <= 0) {
      res.status(401).json({status: 401, msg: "No authority"});
      return;
    }
    return knex('group')
      .where("group_id", group_id)
      .delete()
      .then(() => {
        res.status(200).json({status: 200, data: null});
      });
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });
});

router.get('/list', (req, res) => {
  knex.raw("select * from `group` natural left join (select category_id, name as category_name from category) as c")
  .then(q_res => {
    const result = [];
    return Promise.all(
      q_res[0].map(group => {
        return knex('participate').count('*').where({
          group_id: group["group_id"],
          is_pending: false
        })
        .then(member_cnt => {
          group["member_cnt"] = member_cnt[0]["count(*)"];
          result.push(group);
        })
      })
    )
    .then(() => {
      res.status(200).json({status: 200, data: result});
    })
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });
});

// returns groups that current user belongs to
router.get('/mypage', checkAuth, (req, res) => {
  const student_id = req.session.student_id;
  knex('participate')
  .select('group_id')
  .where("student_id", student_id)
  .then(rows => {
    const result = [];
    return Promise.all(
      rows.map(row => {
        const group_id = row["group_id"];
        return knex.raw(`select * from \`group\` natural left join (select category_id, name as category_name from category) as c where group_id=${group_id}`)
          .then(q_res => {
            const group = q_res[0][0];
            return knex('participate').count('*').where({
                group_id: group["group_id"],
                is_pending: false
              })
              .then(member_cnt => {
                group["member_cnt"] = member_cnt[0]["count(*)"];
                result.push(group);
              });
          });
        })
      ).then(() => {
        res.status(200).json({status: 200, data: result});
      });
  })
  .catch((error) => {
    console.log(error);
    res.status(500).send(error);
  });
});

module.exports = router;
