# DB Table Design

## 1. 설계 원칙

- `일반 채팅`과 `랜덤 채팅`은 같은 메시지 엔진을 쓰되 방 타입으로 구분합니다.
- 기능 제한은 클라이언트가 아니라 서버와 DB 정책 기준으로 강제합니다.
- MVP에서는 미래 확장을 고려하되, 초기 구현에 필요한 컬럼만 우선 활성화합니다.

## 2. 핵심 엔터티

### `users`
회원 계정의 최소 단위입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 사용자 ID |
| email | varchar unique | 로그인 이메일 |
| password_hash | varchar | 비밀번호 해시 |
| status | varchar | `active`, `suspended`, `deleted` |
| last_login_at | timestamptz null | 마지막 로그인 시각 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |

### `profiles`
사용자 공개 프로필입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| user_id | uuid pk fk -> users.id | 사용자 ID |
| display_name | varchar | 일반 채팅에서 보이는 이름 |
| username | varchar unique | 검색용 고유 아이디 |
| bio | varchar null | 자기소개 |
| avatar_url | text null | 프로필 이미지 |
| theme_id | uuid null fk -> themes.id | 적용 중인 테마 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |

### `friendships`
일반 채팅 진입용 친구 관계입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 관계 ID |
| requester_id | uuid fk -> users.id | 요청 보낸 사용자 |
| addressee_id | uuid fk -> users.id | 요청 받은 사용자 |
| status | varchar | `pending`, `accepted`, `rejected`, `blocked` |
| requested_at | timestamptz | 요청 시각 |
| responded_at | timestamptz null | 응답 시각 |
| created_at | timestamptz | 생성 시각 |

제약:

- `(requester_id, addressee_id)` 유니크
- 자기 자신에게 친구 요청 금지

### `blocks`
사용자 차단 정보입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 차단 ID |
| blocker_id | uuid fk -> users.id | 차단한 사용자 |
| blocked_id | uuid fk -> users.id | 차단당한 사용자 |
| reason | varchar null | 차단 사유 |
| created_at | timestamptz | 생성 시각 |

제약:

- `(blocker_id, blocked_id)` 유니크

### `chat_rooms`
모든 채팅방의 메타 정보입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 채팅방 ID |
| room_type | varchar | `general`, `random` |
| mode | varchar | `direct`, `group`, `match` |
| title | varchar null | 일반 그룹 채팅방 제목 |
| max_members | int | 최대 인원 |
| current_status | varchar | `waiting`, `active`, `closed` |
| created_by | uuid null fk -> users.id | 생성자 |
| created_at | timestamptz | 생성 시각 |
| closed_at | timestamptz null | 종료 시각 |

규칙:

- `random` 방은 `title` 없이 운영 가능
- `random` 방은 서버에서 파일/선물/통화 기능 차단

### `chat_room_members`
채팅방 참여자 정보입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 멤버 레코드 ID |
| room_id | uuid fk -> chat_rooms.id | 채팅방 ID |
| user_id | uuid fk -> users.id | 사용자 ID |
| role | varchar | `owner`, `member`, `system` |
| joined_at | timestamptz | 입장 시각 |
| left_at | timestamptz null | 퇴장 시각 |
| is_muted | boolean | 음소거 여부 |

제약:

- `(room_id, user_id)` 유니크

### `random_room_aliases`
랜덤 채팅 전용 익명 닉네임 매핑입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 레코드 ID |
| room_id | uuid fk -> chat_rooms.id | 랜덤 채팅방 ID |
| user_id | uuid fk -> users.id | 사용자 ID |
| anonymous_nickname | varchar | 자동 생성 닉네임 |
| created_at | timestamptz | 생성 시각 |

제약:

- `(room_id, user_id)` 유니크
- 같은 방 안에서 `anonymous_nickname` 유니크

### `messages`
공통 메시지 테이블입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 메시지 ID |
| room_id | uuid fk -> chat_rooms.id | 채팅방 ID |
| sender_id | uuid fk -> users.id | 발신자 |
| message_type | varchar | `text`, `system`, `image`, `file`, `gift` |
| body | text null | 텍스트 본문 |
| metadata | jsonb null | 첨부/시스템 정보 |
| is_deleted | boolean | 삭제 여부 |
| created_at | timestamptz | 생성 시각 |
| deleted_at | timestamptz null | 삭제 시각 |

규칙:

- MVP에서는 `text`, `system`만 사용
- `random` 방에서는 `image`, `file`, `gift` 입력 자체를 서버에서 거부

### `message_reads`
읽음 처리용 테이블입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 레코드 ID |
| message_id | uuid fk -> messages.id | 메시지 ID |
| user_id | uuid fk -> users.id | 읽은 사용자 |
| read_at | timestamptz | 읽은 시각 |

제약:

- `(message_id, user_id)` 유니크

### `random_match_queue`
랜덤 채팅 대기열입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 큐 ID |
| user_id | uuid fk -> users.id | 대기 사용자 |
| target_size | int | 희망 인원 수 |
| status | varchar | `queued`, `matched`, `cancelled`, `expired` |
| queued_at | timestamptz | 대기 시작 시각 |
| matched_at | timestamptz null | 매칭 완료 시각 |
| expires_at | timestamptz null | 만료 시각 |

제약:

- 동시에 `queued` 상태는 사용자당 1건만 허용
- `target_size`는 MVP에서 `2`만 허용 가능

### `reports`
신고 테이블입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 신고 ID |
| reporter_id | uuid fk -> users.id | 신고자 |
| reported_user_id | uuid fk -> users.id | 피신고자 |
| room_id | uuid null fk -> chat_rooms.id | 관련 채팅방 |
| message_id | uuid null fk -> messages.id | 관련 메시지 |
| category | varchar | `abuse`, `spam`, `sexual`, `other` |
| description | text null | 상세 사유 |
| status | varchar | `open`, `reviewing`, `resolved`, `dismissed` |
| created_at | timestamptz | 생성 시각 |
| resolved_at | timestamptz null | 처리 시각 |

### `themes`
사용자 테마 정의입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid pk | 테마 ID |
| owner_user_id | uuid fk -> users.id | 제작자 |
| name | varchar | 테마명 |
| scope | varchar | `private`, `shared` |
| config_json | jsonb | 색상/폰트/배경 설정 |
| is_active | boolean | 삭제 대신 비활성 처리 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |

## 3. MVP에서 실제로 쓰는 테이블

- `users`
- `profiles`
- `friendships`
- `blocks`
- `chat_rooms`
- `chat_room_members`
- `random_room_aliases`
- `messages`
- `message_reads`
- `random_match_queue`
- `reports`
- `themes`

## 4. MVP 이후 확장 테이블

추가 기능 도입 시 아래 테이블 확장을 권장합니다.

### `calls`
- 일반 채팅용 음성/영상 통화 세션

### `file_attachments`
- 파일 저장 메타 정보

### `gifts`
- 선물 아이템 및 결제 내역

### `notifications`
- 푸시 및 인앱 알림

## 5. 관계 요약

- 사용자 1명은 1개의 프로필을 가짐
- 사용자 2명 이상은 친구 관계를 가질 수 있음
- 채팅방은 여러 명의 멤버를 가질 수 있음
- 메시지는 채팅방에 속함
- 랜덤 채팅에서는 사용자별 익명 닉네임이 방마다 따로 생성됨
- 신고는 사용자, 채팅방, 메시지와 연결 가능
- 테마는 사용자별로 여러 개 저장 가능

## 6. 서버 정책 메모

- 랜덤 채팅방 생성 시 `random_room_aliases`를 반드시 생성
- 랜덤 채팅방에서는 메시지 타입 제한 검사 필수
- 차단 관계가 있으면 친구 요청, 채팅 생성, 랜덤 매칭 재입장을 제한
- 신고 누적 사용자는 `users.status`로 제재 가능
