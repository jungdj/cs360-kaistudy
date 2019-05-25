var express = require('express');
var router = express.Router();
var knex = require('knex')(require('../knexfile').test);
var _ = require('underscore');

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

router.get('/register', checkAuth, (req, res) => {
  res.send('그룹 생성 페이지');
});


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
      category: category_id
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
      res.redirect(`./manage/${group_id}`);
    });
  })
  .catch(console.error);
});

router.get('/manage', checkAuth, checkGroup_GET, (req, res) => {
  var group_id = parseInt(req.query.group_id); // verified in checkGroup
  var student_id = req.session.student_id;

  // TODO: check whether the user is owner of the group
  // - select 1 from participate where group_id=${group_id}
  //                                and student_id=${student_id}
  //                                and is_owner=true
  
  // Retrieve group_detail & part_detail (members & incoming request)
  // - select * from group join category
  //        on group.category=category.category_id
  //        where group_id=${group_id};
  // - select stu.first_name, stu.last_name, stu.gender,
  //          stu.phone_number, stu.email, part.is_owner, part_is_pending
  //          from (select * from participate where group_id=${group_id}) as part
  //          join student as stu on part.student_id=stu.student_id;
  knex('group')
  .select('*')
  .join('category', 'group.category', 'category.category_id') // 카테고리는 귀찮아서 그냥 join 때림
  .where('group_id', group_id)
  .then(q_res => {
    var group_detail = q_res[0][0];
    return knex.select( // 여기서 return 하면 프로미스 잘 처리 되는지 헷갈림
        'stu.first_name',
        'stu.last_name',
        'stu.gender',
        'stu.phone_number',
        'stu.email',
        'part.is_owner',
        'part.is_pending'
      )
      .from(() => {
        this.select('*').from('participate')
            .where('group_id', group_id)
            .as('part')
      })
      .join('student as stu', 'part.student_id', 'stu.student_id')
      .then(q_res => {
        var part_detail = q_res[0][0];
        // TODO: Using group_detail & part_details & , render proper page
        res.send('그룹 관리 페이지');
      });
  }).catch(console.error);
});

router.get('/view', checkAuth, checkGroup_GET, (req, res) => {
  var group_id = parseInt(req.query.group_id);
  var student_id = req.session.student_id;

  // TODO: check the user's status in the group => button [participate / requesting / already in]
  // - select is_pending from participate where student_id=${student_id}
  //                                 and group_id=${group_id}
  //   result == empty => participate button
  //   result != empty
  //      is_pending == true => requesting button
  //      is_pending == false => already in button


  knex('group')
  .select('*')
  .join('category', 'group.category', 'category.category_id')
  .where('group_id', parseInt(group_id))
  .then(q_res => {
    var group_detail = q_res[0][0];
    // TODO: retrieve group_owner info
    // (TODO): retrieve comments in the group (maybe done in client-side by POST /group/comment/list)

    // TODO: render with group_detail, (comment_details) and proper button
    res.send('그룹 정보 열람 페이지');
  }).catch(console.error);
});

router.post('/comment/new/', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var student_id = req.session.student_id;
  var {text, parent_comment_id} = req.body;
  
  // TODO: check validity of parent_comment_id (parent_comment_id should be 1-level & in group_id)
  // - select 1 from comment where comment_id=${parent_comment_id}
  //                            and parent_comment=null
  //                            and group_id=${group_id}

  knex('comment')
  .insert({
    text: text,
    student_id: student_id,
    group_id: group_id,
    parent_comment_id: parent_comment_id
  })
  .then(q_res => {
    res.send('1');
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
  
});

router.post('/comment/list/', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);

  // TODO: Get all comments in the group
  // - select * from comment where group_id=${group_id};
});

router.post('/participate/list/', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
  var student_id = req.session.student_id;

  knex.raw(`select is_owner, is_pending from participate where student_id=${student_id} and group_id=${group_id};`)
  .then(q_res => {
    if (q_res[0].length <= 0) {
      res.json({success: false});
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

    if (is_owner) {
      // For owner
      return knex('participate')
      .where('group_id', group_id)
      .then(q_res => {
        res.json({success: true, result: q_res[0]});
      });
    } else {
      // For non-owner member
      return knex('participate')
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
  

});

router.post('/participate/reject', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
});

router.post('/finish', checkAuth, checkGroup_POST, (req, res) => {
  var group_id = parseInt(req.body.group_id);
});

router.post('/list', (req, res) => {
  knex('group')
  .select('*')
  .join('category', 'group.category', 'category.category_id')
  .then(q_res => {
    res.json({success: true, result: q_res[0]})
  })  
});

module.exports = router;