# KAISTudy Routing / API List

참고 : modal 띄우는 방식으로 한다고 했던 것 같은데 일단은 온갖 GET 요청들도 나열해봄!



### ETC

| Routing Path | Functionality |
| ------------ | ------------- |
| GET /                 | 메인페이지, 카테고리 별로 모집 중인 그룹들을 표시 |

* /
  * 카테고리 리스트
  * 그룹 리스트 (title, deadline, capacity, group_id)
  * 

### Account

| Routing Path           | Functionality             |
| ---------------------- | ------------------------- |
| GET, POST /login       | SSO 연동해서 로그인       |
| GET /logout            | 로그아웃                  |
| GET, POST /register    | SSO 연동해서 회원가입     |
| GET, ~~POST~~ /mypage  | 유저 정보 확인, ~~수정~~  |
| ~~POST /notification~~ | ~~유저에게 온 알림 요청~~ |

* POST /register
  * first name, last name
  * email, password
  * gender (리스트에서 선택), student id, phone nmber
  * 얘네를 받아서 DB 에 추가 (email 중복 체크, sid 중복 체크)
* POST /login
  * email, password 받아서, 있는지 체크
* /notification
  * 유저가 알림을 확인했을 때 확인했다는 내용을 서버에 보낼 수도 있음

### Group

| Routing Path | Functionality |
| ------------ | ------------- |
| GET, POST /group/register        | 그룹 생성 페이지, 그룹 생성                  |
| GET /group/manage       | 그룹장 용 그룹 관리 페이지<br />그룹 제목, 그룹장, 확정 멤버 목록, 확정 멤버 삭제, 요청 중인 멤버, 수락, 거절, 모집 마감 버튼 |
| GET /group/view        | 그룹의 기본 정보 열람 페이지 (+ 그룹 참가 버튼 제공)<br />이미지, 그룹 제목, 기본 정보 (시간, 장소, 정원, …), 참가 버튼 (+ 진행 현황), 상세설명, 멤버 목록 |
| POST /group/comment/new    | 새로운 댓글 / 대댓글 생성                            |
| POST /group/comment/modify       | 댓글 수정 (/group/comment/add 와 합치거나 수정 기능을 없앨 수도 있음) |
| POST /group/comment/list         | 댓글 리스트 요청                                             |
| POST /group/participate/list | 그룹 참가 신청 현황                                           |
| POST /group/participate/new | 그룹 참가 신청                                           |
| POST /group/participate/accept | 그룹 참가 신청 수락                                         |
| POST /group/participate/reject | 그룹 참가 신청 거절                                    |
| POST /group/finish | 그룹 모집 마감                                |
| POST /group/list                  | (/group/search 의 subset) 모든 그룹의 정보를 요청            |
| ~~POST /group/search~~            | ~~특정 조건의 그룹 검색, (ex. 태그, 제목, 설명, …)~~         |

* 가정
  - group 이 있는 지를 따로 체크할 지, participate 가 있는 지 체크하면서 같이 체크할 지
    - checkGroup : group_id 체크 루틴
    - **<u>group_id 는 post 이든 get 이든 항상 query 에 ?group_id 와 같이 주어야 함</u>**
  - group 삭제하면 participate 도 같이 삭제 (participate 에서 group_id : ondelete cascade)
  - group 삭제하면 comment 도 같이 삭제
  - parent comment 삭제하면 child comment 도 같이 삭제
  - **student_id, group_id 는 이미 검증되었다고 가정**
    - student_id : session 이 존재하면 맞다고 가정
      - 로그인 시에 있는지 체크, 계정이 사라지거나 student_id 가 바뀌는 일은 없다고 가정
    - group_id : 실제로 있는지 체크
* POST /group/register => /group/create 로 바꿀까?
  * title, desc, capacity, deadline, workload, category, tag
* GET /group/manage
  * 입력 : student_id, group_d
  * 체크 : 해당 유저가 해당 그룹의 owner 인지
  * 출력 : 해당 그룹의 capacity, deadline, 멤버 정보, 요청 정보
    * 멤버 정보를 받아오는 과정
      * select * from participate join student on participate.student_id=student.student_id where group_id=${group_id}
      * 최적화 방안
        * semi join 으로 student 정보만 출력
          * fname, lname, gender, phone, email
          * name = fname + lname 은 클라 쪽에서 하기로!
        * participate + student 말고 (select * from participate where group_id=${group_id}) + student 를 사용
    * TODO: 누가 요청을 보냈는지 받아오는 과정이 필요
* GET /group/view => /group/detail 로 바꿀까?
  * 입력 : student_id, group_id
  * 체크 : 해당 그룹에서 해당 유저의 상태
  * 출력 : 해당 그룹의 정보 + 유저에 맞는 버튼 보여주기
    * 코멘트들 받아와야 함
      * **이거는 클라이언트에서 POST /comment/list 로 받아오게끔!**
    * 그룹 매니저 정보 받아와야 함
* POST /group/comment/new
  * 입력 : student_id, group_id, parent_comment_id, text
  * 과정 : 
    * parent_comment_id 체크 (현재 그룹에 있는 comment 인가, 1-level 인가)
    * DB 에 추가 (text 가 string 인지는 귀찮아서 체크 ㄴㄴ)
  * 출력 : 성공 여부?
* POST /group/comment/modify
  * 입력 : student_id, group_id, comment_id, new_text
  * 과정 : 
    * 해당 comment_id 에 대해 올바른 group_id, student_id 인지 체크
      * 이거 그냥 update 에서 한방에 할 수도?
    * update
  * 출력 : 성공 여부?
* POST /group/participate/list
  * 입력 : sid, gid
  * 과정 : 
    * 이걸 아무나 하게 해줘야 하나?
      * 현재 멤버 : 현재 멤버들을 볼 수 있음
        * select student_id, is_owner from participate where is_pending=0 and group_id=${group_id};
        * 귀찮으니 project 는 하지 맙시다
      * 관리자 : 현재 멤버 + 참가 요청을 볼 수 있음
        * select student_id, is_owner, is_pending from participate where group_id=${group_id};
    * 
* POST  /group/participate/new
  * 입력 : student_id, group_id
  * 과정 : 
    * 중복 참가 허용?
    * participate 테이블에 sid, gid 를 추가, is_owner = false, is_pending = true 로 설정
      * 참고 : is_owner, is_pending 의 기본 값은 false, true
  * 출력 : 성공 여부?
* POST /group/participate/accept
  * 입력 : session, part_sid, part_gid
  * 과정 :
    * 체크 루틴
      * part_sid, part_gid, is_pending=1 이 존재하는지
      * sid, part_gid, is_owner=1 이 존재하는지
      * max 를 넘지 않는지 (concurrency 는 무시) => 귀찮으면 
    * is_pending 을 0 으로 수정
  * 출력 : 성공 여부 (왜 안 되었는지)
* /group/search
  * 입력 : keyword
  * 과정 : 
    * 검색 문구가 title / tags / desc 에 있는지를 체크 (카테고리까지는 굳이?)
  * 그룹 리스트를 반환



{success, msg, }





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
  * category 속성 네이밍이 불편 ㅠㅠ category_id 였으면 좋겠음
  * purpose 사라졌음...