# KAISTudy Routing / API List



### Group

| Routing Path | Functionality |
| ------------ | ------------- |
| POST /group/register        | 그룹 생성 페이지, 그룹 생성                  |
| GET /group/manage       | 그룹장 용 그룹 관리 페이지에 필요한 정보들<br />그룹 참여자 / 참여 요정자 들의 정보,  그룹의 기본 정보 |
| GET /group/detail | 그룹의 기본 정보 열람 페이지 (+ 그룹 참가 버튼 제공)<br />이미지, 그룹 제목, 기본 정보 (시간, 장소, 정원, …), 참가 버튼 (+ 진행 현황), 상세설명, 멤버 목록 |
| POST /group/comment/new    | 새로운 댓글 / 대댓글 생성                            |
| POST /group/comment/modify       | 댓글 수정 (/group/comment/add 와 합치거나 수정 기능을 없앨 수도 있음) |
| GET /group/comment/list     | 댓글 리스트 요청                                             |
| GET /group/participate/list | 그룹 참가 신청 현황 + 참가 신청자 정보                              |
| POST /group/participate/new | 그룹 참가 신청                                           |
| POST /group/participate/accept | 그룹 참가 신청 수락                                         |
| POST /group/participate/reject | 그룹 참가 신청 거절                                    |
| POST /group/endRecruit | 그룹 모집 마감                                |
| POSt /group/deleteGroup | 그룹 삭제     |
| POST /group/list               | 모든 그룹의 기본 정보를 요청 (group table 에 있는 정보 + category name 까지만) |

* 가정
  - group 삭제하면 participate 도 같이 삭제 (participate 에서 group_id : ondelete cascade)
  - group 삭제하면 comment 도 같이 삭제
  - parent comment 삭제하면 child comment 도 같이 삭제
  - **student_id, group_id 는 이미 검증되었다고 가정**
    - student_id : session 이 존재하면 맞다고 가정
      - 로그인 시에 있는지 체크, 계정이 사라지거나 student_id 가 바뀌는 일은 없다고 가정
      - TODO : 실제 인증 과정에 맞춰서 변경 필요
        - req.session.student_id 있는 코드
        - checkAuth 코드
    - group_id : 실제로 있는지 체크하는 방식



### API detail

* POST /group/register

  * 입력 : 
    * title : string
    * desc : string
    * capacity : int
    * deadline : timestamp (백엔드에서는 검사 안 하지만 DB 에 들어갈 때 맞춰줘야 함)
    * workload : string
    * category : string (카테고리 테이블에 있는 거면 그 카테고리의 category_id 를 사용, 없으면 기타로 취급)
    * tag : string
  * 출력 : 
    * ```json
      {
        success: true,
        result: {
          group_id: 5 // (새로 생성된 group_id)
        }
      }
      ```

* GET /group/manage
  * 입력 : student_id, group_d

  * 과정: 

    * 해당 유저가 해당 그룹의 owner 인지 체크

    * ```mysql
      select 1 from participate where group_id=${group_id} and student_id=${student_id} and is_owner=true;
      ```

    * 그룹의 세부 정보를 DB 로부터 읽어서 반환

      * category 하고 join 해서 category_name 을 바로 확인할 수 있도록 함

    * 그룹의 participation 관련 정보를 DB 로부터 읽어서 반환 (참여 중인 사람, 참여 요청을 보낸 사람 들의 정보)

      * participate, student 를 join
      * ```mysql
        select * from  (select * from participate where group_id=${group_id}) natural join student;
        ```

  * 출력 :

    * {success: false, msg: "no authority"}

    * group_detail 과 part_detail (참여 현황 / 참여 요청 현황 + 학생 정보) 이 따로 반환

      ```json
      {
        success: true,
        result: {
          group_detail: {
            group_id: 1,
            title: 'test',
            capacity: 10,
            desc: 'Hello, this is test group!',
            deadline: 2019-05-25T13:07:07.000Z,
            workload: 'hard',
            tag: '#test# #fun#',
            is_recruiting: 1,
            category_id: 7,
            created_at: 2019-05-25T13:07:07.000Z,
            updated_at: 2019-05-25T13:07:07.000Z,
            category_name: 'coding'
          },
          part_detail: [
            {is_pending, is_owner, ... , student_id, first_name, last_name, ...},
            {},
            ...
          ]
        }
      }
      ```

    * 

* GET /group/detail (원래는 /group/view)

  * 입력 : group 3 을 "20160759" 학생이 보려는 경우

    * student_id : "20160759" 
    * group_id : 3

  * 과정 : 

    * 해당 그룹에서 해당 유저의 상태 반환
    * 그룹에 대한 세부 정보 (title, deadline, …) 반환
    * 그룹장에 대한 세부 정보 (student id, email, …) 반환

  * 출력 : 

    * result 에 user_status, group_detail, owner_info 를 따로 저장

    * ```json
      {
        success: true,
        result: {
          "user_status": 0, // 유저에게 보여줄 버튼 : (0 - "Participate" button, 1 - "Requesting" button, 2 - "Already in" button)
          "group_detail": {
            // group 테이블의 속성들
            group_id: 1,
            title: 'test',
            capacity: 10,
            desc: 'Hello, this is test group!',
            deadline: 2019-05-25T13:07:07.000Z,
            workload: 'hard',
            tag: '#test# #fun#',
            is_recruiting: 1,
            category_id: 7,
            created_at: 2019-05-25T13:07:07.000Z,
            updated_at: 2019-05-25T13:07:07.000Z,
            category_name: 'coding'
          },
          "owner_info": {
            // student 테이블의 속성들
          }
        }
      }
      ```

    * comment 리스트는 GET /group/comment/list 로 따로 요청해야 함

* POST /group/comment/new
  * 입력 : 
    * student_id : "20160759"
    * group_id : 3
    * parent_comment_id : 2
    * text : "How much you will cover?"
  * 과정 : 
    * parent_comment_id 체크 (현재 그룹에 있는 comment 인가, 1-level 인가)
    * DB 에 추가 (text 가 string 인지는 귀찮아서 체크 ㄴㄴ)
  * 출력 :
    * {success: false, msg: "wrong parent comment"}
    * {success: true}

* ~~POST /group/comment/modify~~

  * 입력 : student_id, group_id, comment_id, new_text
  * 과정 : 
    * 해당 comment_id 에 대해 올바른 group_id, student_id 인지 체크
      * 이거 그냥 update 에서 한방에 할 수도?
    * update
  * 출력 : 성공 여부?

* GET /group/comment/list

  * 입력 :

    * group_id : 3
  * 과정 :
    * 코멘트 내용, 부모 코멘트, 코멘트 작성 / 수정 일시,  코멘트 작성자 정보, comment_id, group_id
    * 작성자 정보는 student 테이블에 있기 때문에 join 해서 반환
  * 출력 : TODO
    * comment 의 속성들 + student 의 속성들
    * ```json
      {
        success: true,
        result: [
          {comment 정보1, ... ,  student 정보1, ...},
          {}    
        ]
      }
      ```

* GET /group/participate/list

  * 입력 :

    * student_id : "20160759"
    * group_id : 3

  * 과정 : 

    * 해당 유저가 해당 그룹에서 어떤 위치인지 (owner / member / normal) 판단
      * select is_owner, is_pending from participate where student_id="20160759" and group_id=3;
    * 그룹의 현재 멤버 : 현재 멤버들을 볼 수 있음
      * select * from participate where is_pending=0 and group_id=${group_id};
      * 귀찮으니 project 는 하지 맙시다
    * 그룹의 관리자 : 현재 멤버 + 참가 요청을 볼 수 있음
      * select * from participate where group_id=${group_id};
    * 멤버의 정보를 봐야 하기 때문에 student 와 join 해서 반환

  * 출력 : TODO

    * {success: false, msg: "~"}

      * "no authority"

    * 멤버 (관리자 : 확정되지 않은 요청도 볼 수 있음, 관리자 X : 확정된 멤버에 대해서만 볼 수 있음)

      * participate 의 속성들 + student 의 속성들

    * ```json
      {
        success: true,
        result: [
          {participate 정보1, ... ,  student 정보1, ...},
          {}    
        ]
      }
      ```

* POST  /group/participate/new

  * 유저가 해당 그룹에 가입 신청
  * 입력 :
    * student_id : "20160759"
    * group_id : 3
  * 과정 : 
    * 중복 참가 체크 안 함
    * participate 테이블에 추가, is_owner = false, is_pending = true 로 설정
      * insert into participate (student_id, group_id) values ("20160759", 3);
  * 출력 :
    * {success: true}

* POST /group/participate/accept

  * group owner 가 자신의 그룹에 보내진 참가 요청을 수락
  * 입력 : 
    * student_id: "20160759" (현재 유저)
    * part_student_id: "20160123" (참가 요청을 보낸 유저)
    * part_group_id: 3
  * 과정 :
    * 체크 루틴
      * part_sid, part_gid, is_pending=1 이 존재하는지
      * sid, part_gid, is_owner=1 이 존재하는지
      * max 를 넘지 않는지 (concurrency 는 무시) => 체크 안 함 
    * is_pending 을 0 으로 수정
  * 출력 :
    * {success: true}
    * {success: false, msg: "~"}
      * "wrong participation information"
      * "you have no authority to accept participation"

* POST /group/participate/reject

  * group owner 가 자신의 그룹에 보내진 참가 요청을 거절
  * 입력 : 
    - student_id: "20160759" (현재 유저)
    - part_student_id: "20160123" (참가 요청을 보낸 유저)
    - part_group_id: 3
  * 과정 :
    - 체크 루틴
      - part_sid, part_gid, is_pending=1 이 존재하는지
      - sid, part_gid, is_owner=1 이 존재하는지
      - max 를 넘지 않는지 (concurrency 는 무시) => 체크 안 함 
    - 해당 요청을 DB 에서 삭제
  * 출력 :
    - {success: true}
    - {success: false, msg: "~"}
      - "wrong participation information"
      - "you have no authority to reject participation"

* POST /group/endRecruit

  * group owner 가 그룹 모집을 마감
  * 입력 : 
    * student_id : "20160759" (현재 유저)
    * group_id : 3 (마감하고자 하는 group)
  * 과정 :
    * 체크 루틴
      * student_id 가 group_id 의 owner 인가?
        * select * from participate where student_id="20160759" and group_id=3 and is_owner=1;
    * 해당 그룹의 모집을 종료
      * update group set is_recruiting = false where group_id=3;
  * 출력 :
    * {success: true}
    * {success: false, msg: "~"}
      * "you have no authority to end recruitment"

* POST /group/deleteGroup

  * group owner 가 그룹을 삭제
  * 입력 :
    - student_id : "20160759" (현재 유저)
    - group_id : 3 (삭제하고자 하는 group)
  * 과정 :
    - 체크 루틴
      - student_id 가 group_id 의 owner 인가?
        - select * from participate where student_id="20160759" and group_id=3 and is_owner=1;
    - 해당 그룹을 삭제
      - delete from group where group_id=3;
  * 출력 :
    - {success: true}
    - {success: false, msg: "~"}
      - "you have no authority to delete group"

* /group/list
  * 입력 : 없음

  * 과정 : 

    * 카테고리 테이블과 join
    * 그룹 (카테고리 테이블과 join) 의 리스트를 반환

  * 출력 :

    * ```json
      {
        success: true, 
        result: [
          {
            group_id: 1,
            title: 'test',
            capacity: 10,
            desc: 'Hello, this is test group!',
            deadline: 2019-05-25T13:07:07.000Z,
            workload: 'hard',
            tag: '#test# #fun#',
            is_recruiting: 1,
            category_id: 7,
            created_at: 2019-05-25T13:07:07.000Z,
            updated_at: 2019-05-25T13:07:07.000Z,
            category_name: 'coding'
          },
          ...
        ]
      }
      ```





* /group/comment/modify
  * /group/comment/new 와 합칠 수 있음
  * 아예 수정 기능을 없애는 방식도 있음
* /group/comment/list
  * 없앨 수도 있음
* /group/list, /group/search
  * 하나로 합칠 수 있음
* /group/participate/*
  * 굳이 라우팅 나눌 필요 없이 param 으로 받는게 더 깔끔할 수 있음
  * action=new&action=accept&action=reject
* 그룹 정보 수정 페이지도 필요할 수 있음





* timestamp 관리가 힘드네 (유저한테 타임 정보가 어케 들어올 지를 모르겠고, string => mysql timestamp 로 어케 바꾸는 지 모르겠음)
* group
  * 모든 handler 앞에 session 체크하기
  * category 속성 네이밍이 불편 ㅠㅠ category_id 였으면 좋겠음 -> 적용
  * purpose 사라졌음...





### TODO

* ~~그룹 : 모집 마감 되었는지 여부를 저장하는 tiny int~~
* 그룹 : category 속성을 category_id 로 수정
* 카테고리 : 1-level 로 수정 (나중에 ERD 다시 캡처 필요)
* Student_id 를 세션에서 받고 싶은데 일단은 json 으로 받도록 함

