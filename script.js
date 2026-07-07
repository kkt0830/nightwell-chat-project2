const SUPABASE_URL = "https://xzuribmvvluqdcndfqko.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_O-WfjZ0K3JAe_TQ3YTHgIw_gFXD5JrX";
const POLL_INTERVAL_MS = 3000;

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const uiState = {
  currentView: "home",
  memberAuthMode: "signin",
  session: null,
  profile: null,
  friendships: [],
  directoryProfiles: [],
  rooms: [],
  roomMembers: [],
  blocks: [],
  reports: [],
  randomQueue: null,
  activeGeneralRoomId: null,
  activeRandomRoomId: null,
  activeGeneralMessages: [],
  activeRandomMessages: [],
  pollTimer: null,
  autoSigningIn: false,
  autoJoiningRandom: false,
  realtimeChannel: null,
};

const themeCatalog = [
  {
    id: "moon-violet",
    name: "Moon Violet",
    description: "달빛 보랏빛과 금빛 선이 살아 있는 기본 테마",
    swatches: ["#070b10", "#151d2b", "#7c6cff", "#e1bf74"],
    vars: {
      "--void": "#070b10",
      "--nave": "#0d1420",
      "--vault": "#151d2b",
      "--bone": "#f2ecdc",
      "--mist": "#adb7cf",
      "--ash": "#7d889f",
      "--gold": "#c9a45a",
      "--gold-bright": "#e1bf74",
      "--violet": "#7c6cff",
      "--teal": "#6fbdb0",
      "--rose": "#ab5d66",
    },
  },
  {
    id: "covenant-teal",
    name: "Covenant Teal",
    description: "청록 계열 문양이 강조된 차분한 밤색 테마",
    swatches: ["#081017", "#162633", "#6fbdb0", "#d8c58c"],
    vars: {
      "--void": "#081017",
      "--nave": "#0f1a25",
      "--vault": "#162633",
      "--bone": "#f3efe5",
      "--mist": "#a9c0c7",
      "--ash": "#7f98a0",
      "--gold": "#c0a66b",
      "--gold-bright": "#d8c58c",
      "--violet": "#5985cc",
      "--teal": "#6fbdb0",
      "--rose": "#bc7a78",
    },
  },
  {
    id: "ember-rose",
    name: "Ember Rose",
    description: "장작빛 로즈와 어두운 자주색이 섞인 따뜻한 테마",
    swatches: ["#0e090d", "#21131d", "#ab5d66", "#f0ca8c"],
    vars: {
      "--void": "#0e090d",
      "--nave": "#161019",
      "--vault": "#21131d",
      "--bone": "#f7eee7",
      "--mist": "#d1b8bc",
      "--ash": "#aa8d93",
      "--gold": "#d09b6a",
      "--gold-bright": "#f0ca8c",
      "--violet": "#8f6b9d",
      "--teal": "#8ab8aa",
      "--rose": "#ab5d66",
    },
  },
  {
    id: "frost-archive",
    name: "Frost Archive",
    description: "푸른 안개와 은빛 대비가 강한 차가운 도서관 테마",
    swatches: ["#061019", "#102133", "#82b6ff", "#dfe8ff"],
    vars: {
      "--void": "#061019",
      "--nave": "#0e1827",
      "--vault": "#102133",
      "--bone": "#eef4ff",
      "--mist": "#c1d3ef",
      "--ash": "#91a6c7",
      "--gold": "#8db2ff",
      "--gold-bright": "#dfe8ff",
      "--violet": "#82b6ff",
      "--teal": "#88d8d2",
      "--rose": "#a6b3d9",
    },
  },
];

const elements = {
  authScreen: document.querySelector("[data-auth-screen]"),
  appScreen: document.querySelector("[data-app-screen]"),
  authStatus: document.querySelector("[data-auth-status]"),
  retryGuestButton: document.querySelector("[data-retry-guest]"),
  sessionLabel: document.querySelector("[data-session-label]"),
  logoutButton: document.querySelector("[data-logout-button]"),
  navButtons: document.querySelectorAll("[data-view-target]"),
  views: document.querySelectorAll("[data-view]"),
  profileName: document.querySelector("[data-profile-name]"),
  profileHandle: document.querySelector("[data-profile-handle]"),
  profileBio: document.querySelector("[data-profile-bio]"),
  friendCount: document.querySelector("[data-friend-count]"),
  roomCount: document.querySelector("[data-room-count]"),
  reportCount: document.querySelector("[data-report-count]"),
  homeSummary: document.querySelector("[data-home-summary]"),
  homeActivity: document.querySelector("[data-home-activity]"),
  friendList: document.querySelector("[data-friend-list]"),
  incomingRequests: document.querySelector("[data-incoming-requests]"),
  directoryList: document.querySelector("[data-directory-list]"),
  generalRoomHead: document.querySelector("[data-general-room-head]"),
  generalMessages: document.querySelector("[data-general-messages]"),
  generalForm: document.querySelector("[data-general-form]"),
  randomSettingsForm: document.querySelector("[data-random-settings-form]"),
  randomSize: document.querySelector("[data-random-size]"),
  randomStartButton: document.querySelector("[data-random-start]"),
  randomStatus: document.querySelector("[data-random-status]"),
  randomHistory: document.querySelector("[data-random-history]"),
  randomRoomHead: document.querySelector("[data-random-room-head]"),
  randomMessages: document.querySelector("[data-random-messages]"),
  randomForm: document.querySelector("[data-random-form]"),
  memberAuthTitle: document.querySelector("[data-member-auth-title]"),
  memberAuthForm: document.querySelector("[data-member-auth-form]"),
  memberAuthSubmit: document.querySelector("[data-member-auth-submit]"),
  memberAuthModeButtons: document.querySelectorAll("[data-member-auth-mode]"),
  memberSignupFields: document.querySelectorAll("[data-member-signup-field]"),
  memberAuthStatus: document.querySelector("[data-member-auth-status]"),
  profileForm: document.querySelector("[data-profile-form]"),
  themeGrid: document.querySelector("[data-theme-grid]"),
  blockedList: document.querySelector("[data-blocked-list]"),
  reportList: document.querySelector("[data-report-list]"),
  reportModal: document.querySelector("[data-report-modal]"),
  reportForm: document.querySelector("[data-report-form]"),
  closeReport: document.querySelector("[data-close-report]"),
  toast: document.querySelector("[data-toast]"),
  homeActions: document.querySelectorAll("[data-home-action]"),
  disabledFeatureButtons: document.querySelectorAll("[data-disabled-feature]"),
};

let toastTimer = null;

bootstrap();

async function bootstrap() {
  bindEvents();
  applyThemeById("moon-violet");
  setMemberAuthMode("signin");

  if (!supabaseClient) {
    renderLoggedOut();
    elements.sessionLabel.textContent = "연결 불가";
    showToast("Supabase 연결을 찾을 수 없습니다.");
    return;
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  await handleSessionChange(session);

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    await handleSessionChange(session);
  });
}

function bindEvents() {
  for (const button of elements.memberAuthModeButtons) {
    button.addEventListener("click", () => setMemberAuthMode(button.dataset.memberAuthMode));
  }

  for (const button of elements.navButtons) {
    button.addEventListener("click", () => setView(button.dataset.viewTarget));
  }

  for (const button of elements.homeActions) {
    button.addEventListener("click", () => setView(button.dataset.homeAction));
  }

  for (const button of elements.disabledFeatureButtons) {
    button.addEventListener("click", () => showToast(`${button.textContent} 기능은 아직 준비 중입니다.`));
  }

  elements.retryGuestButton.addEventListener("click", () => ensureGuestSession(true));
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.memberAuthForm.addEventListener("submit", handleMemberAuthSubmit);
  elements.generalForm.addEventListener("submit", handleGeneralMessageSubmit);
  elements.randomSettingsForm.addEventListener("submit", handleRandomQueueSubmit);
  elements.randomForm.addEventListener("submit", handleRandomMessageSubmit);
  elements.profileForm.addEventListener("submit", handleProfileSave);
  elements.themeGrid.addEventListener("click", handleThemeClick);
  elements.friendList.addEventListener("click", handleFriendListClick);
  elements.incomingRequests.addEventListener("click", handleIncomingRequestClick);
  elements.directoryList.addEventListener("click", handleDirectoryClick);
  elements.blockedList.addEventListener("click", handleBlockedListClick);
  elements.randomHistory.addEventListener("click", handleRandomHistoryClick);
  elements.generalRoomHead.addEventListener("click", handleRoomHeaderClick);
  elements.randomRoomHead.addEventListener("click", handleRoomHeaderClick);
  elements.reportList.addEventListener("click", handleReportListClick);
  elements.reportForm.addEventListener("submit", handleReportSubmit);
  elements.closeReport.addEventListener("click", closeReportModal);
  elements.reportModal.addEventListener("click", (event) => {
    if (event.target === elements.reportModal) {
      closeReportModal();
    }
  });
}

async function handleSessionChange(session) {
  uiState.session = session;
  stopPolling();
  stopRealtime();

  if (!session) {
    resetSignedInState();
    renderLoggedOut();
    await ensureGuestSession();
    return;
  }

  await refreshAppData();
  await ensureGuestRandomReady();
  startPolling();
  startRealtime();
}

async function ensureGuestRandomReady() {
  if (!uiState.profile || !isGuestMode()) {
    return;
  }

  uiState.currentView = "random";

  if (uiState.activeRandomRoomId || uiState.randomQueue || uiState.autoJoiningRandom) {
    renderSignedIn();
    return;
  }

  uiState.autoJoiningRandom = true;
  const { data, error } = await supabaseClient.rpc("chat_join_random_queue", { p_target_size: 2 });
  uiState.autoJoiningRandom = false;

  if (error) {
    showToast(getReadableError(error));
    renderSignedIn();
    return;
  }

  if (data) {
    uiState.activeRandomRoomId = data;
  }

  await refreshAppData();
}

function resetSignedInState() {
  uiState.profile = null;
  uiState.friendships = [];
  uiState.directoryProfiles = [];
  uiState.rooms = [];
  uiState.roomMembers = [];
  uiState.blocks = [];
  uiState.reports = [];
  uiState.randomQueue = null;
  uiState.activeGeneralRoomId = null;
  uiState.activeRandomRoomId = null;
  uiState.activeGeneralMessages = [];
  uiState.activeRandomMessages = [];
  uiState.currentView = "random";
  applyThemeById("moon-violet");
}

function renderLoggedOut() {
  elements.authScreen.hidden = true;
  elements.appScreen.hidden = false;
  elements.logoutButton.hidden = true;
  uiState.currentView = "random";
  elements.sessionLabel.textContent = uiState.autoSigningIn ? "게스트 연결 중" : "게스트 연결 대기";
  renderWaitingApp();
}

function renderWaitingApp() {
  renderSidebarWaiting();
  renderHomeWaiting();
  renderGeneral();
  renderRandom();
  renderMemberAuthCard();
  renderProfileWaiting();
  updateViewVisibility();
}

function renderSidebarWaiting() {
  elements.profileName.textContent = "연결 중";
  elements.profileHandle.textContent = "@connecting";
  elements.profileBio.textContent = "게스트 세션을 만들고 실제 채팅 데이터를 불러오는 중입니다.";
  elements.friendCount.textContent = "0";
  elements.roomCount.textContent = "0";
  elements.reportCount.textContent = "0";

  for (const button of elements.navButtons) {
    const target = button.dataset.viewTarget;
    button.disabled = false;
    button.classList.toggle("is-active", target === uiState.currentView);
  }
}

function renderHomeWaiting() {
  elements.homeSummary.innerHTML = [
    summaryCard("상태", "실제 모드", "체험 모드는 비활성화되어 있습니다."),
    summaryCard("일반 채팅", "대기", "실제 사용자 데이터가 연결되면 활성화됩니다."),
    summaryCard("랜덤 채팅", "대기", "게스트 세션이 연결되면 실제 매칭을 시작할 수 있습니다."),
    summaryCard("연결 상태", uiState.autoSigningIn ? "연결 중" : "대기", "백그라운드에서 게스트 세션을 시도합니다."),
  ].join("");

  elements.homeActivity.innerHTML = `
    <article class="activity-item">
      <strong>실제 채팅 준비 중</strong>
      <p>다른 사용자와 대화할 수 있도록 게스트 세션과 채팅 데이터를 불러오고 있습니다.</p>
      <small>${uiState.autoSigningIn ? "연결 중" : "대기 중"}</small>
    </article>
  `;
}

function renderProfileWaiting() {
  getFormControl(elements.profileForm, "displayName").value = "연결 중";
  getFormControl(elements.profileForm, "username").value = "connecting";
  getFormControl(elements.profileForm, "bio").value = "프로필 정보가 아직 준비되지 않았습니다.";
  getFormControl(elements.profileForm, "displayName").disabled = true;
  getFormControl(elements.profileForm, "username").disabled = true;
  getFormControl(elements.profileForm, "bio").disabled = true;
  elements.profileForm.querySelector("button").disabled = true;
  elements.themeGrid.innerHTML = themeCatalog
    .map(
      (theme) => `
        <button class="theme-card ${theme.id === "moon-violet" ? "is-active" : ""}" type="button" data-theme-id="${theme.id}">
          <strong>${escapeHtml(theme.name)}</strong>
          <p>${escapeHtml(theme.description)}</p>
          <div class="theme-swatches">
            ${theme.swatches.map((color) => `<span style="background:${color}"></span>`).join("")}
          </div>
        </button>
      `,
    )
    .join("");
  elements.blockedList.innerHTML = '<div class="empty-state">연결 후 차단 목록이 표시됩니다.</div>';
  elements.reportList.innerHTML = '<div class="empty-state">연결 후 신고 기록이 표시됩니다.</div>';
}

async function ensureGuestSession(forceRetry = false) {
  if (!supabaseClient) {
    renderLoggedOut();
    elements.sessionLabel.textContent = "연결 불가";
    return;
  }

  if (uiState.session || uiState.autoSigningIn) {
    return;
  }

  uiState.autoSigningIn = true;
  elements.sessionLabel.textContent = "게스트 연결 중";
  if (forceRetry) {
    elements.retryGuestButton.hidden = true;
  }

  const suffix = randomLabel();
  const { error } = await supabaseClient.auth.signInAnonymously({
    options: {
      data: {
        display_name: `게스트 ${suffix}`,
      },
    },
  });

  uiState.autoSigningIn = false;

  if (error) {
    elements.sessionLabel.textContent = "게스트 연결 실패";
    showToast(getReadableError(error));
  }
}

async function refreshAppData() {
  const session = uiState.session;
  if (!session?.user) {
    renderLoggedOut();
    return;
  }

  const userId = session.user.id;
  let profile = await fetchMyProfile(userId);
  if (!profile) {
    profile = await ensureMyProfile(session.user);
  }
  if (!profile) {
    showToast("프로필을 준비하지 못했습니다. 잠시 후 다시 시도하세요.");
    return;
  }

  const isGuest = Boolean(profile.is_guest);

  const [friendships, blocks, reports, queueRow, roomMembersForMe, directoryProfiles] = await Promise.all([
    isGuest ? Promise.resolve([]) : fetchMyFriendships(userId),
    fetchMyBlocks(userId),
    fetchMyReports(userId),
    fetchMyQueue(userId),
    fetchMyRoomMemberships(userId),
    isGuest ? Promise.resolve([]) : fetchDirectoryProfiles(userId),
  ]);

  const roomIds = roomMembersForMe.map((entry) => entry.room_id);
  const [rooms, roomMembers] = await Promise.all([
    roomIds.length ? fetchRoomsByIds(roomIds) : Promise.resolve([]),
    roomIds.length ? fetchRoomMembersByRoomIds(roomIds) : Promise.resolve([]),
  ]);

  uiState.profile = profile;
  uiState.friendships = friendships;
  uiState.blocks = blocks;
  uiState.reports = reports;
  uiState.randomQueue = queueRow;
  uiState.directoryProfiles = directoryProfiles;
  uiState.rooms = rooms;
  uiState.roomMembers = roomMembers;

  syncActiveRooms();

  const [generalMessages, randomMessages] = await Promise.all([
    uiState.activeGeneralRoomId ? fetchRoomMessages(uiState.activeGeneralRoomId) : Promise.resolve([]),
    uiState.activeRandomRoomId ? fetchRoomMessages(uiState.activeRandomRoomId) : Promise.resolve([]),
  ]);

  uiState.activeGeneralMessages = generalMessages;
  uiState.activeRandomMessages = randomMessages;

  applyThemeById(profile.theme_id || "moon-violet");
  renderSignedIn();
}

function syncActiveRooms() {
  const generalRooms = getGeneralRooms();
  const randomRooms = getRandomRooms();

  if (!generalRooms.some((room) => room.id === uiState.activeGeneralRoomId)) {
    uiState.activeGeneralRoomId = generalRooms[0]?.id || null;
  }

  const activeRandomRoom = randomRooms.find((room) => room.status === "active");
  if (activeRandomRoom) {
    uiState.activeRandomRoomId = activeRandomRoom.id;
  } else if (!randomRooms.some((room) => room.id === uiState.activeRandomRoomId)) {
    uiState.activeRandomRoomId = randomRooms[0]?.id || null;
  }

  if (isGuestMode() && uiState.currentView === "general") {
    uiState.currentView = "random";
  }
}

function renderSignedIn() {
  const profile = uiState.profile;
  elements.authScreen.hidden = true;
  elements.appScreen.hidden = false;
  elements.logoutButton.hidden = false;
  if (isGuestMode() && (uiState.currentView === "home" || uiState.currentView === "general")) {
    uiState.currentView = "random";
  }
  elements.sessionLabel.textContent = isGuestMode() ? `${profile.display_name} 게스트` : `${profile.display_name} 접속 중`;

  renderSidebar();
  renderHome();
  renderGeneral();
  renderRandom();
  renderMemberAuthCard();
  renderProfile();
  updateViewVisibility();
}

function setMemberAuthMode(mode) {
  uiState.memberAuthMode = mode;
  for (const button of elements.memberAuthModeButtons) {
    button.classList.toggle("is-active", button.dataset.memberAuthMode === mode);
  }
  for (const field of elements.memberSignupFields) {
    field.hidden = mode !== "signup";
  }
  elements.memberAuthTitle.textContent = mode === "signup" ? "회원가입" : "회원 로그인";
  elements.memberAuthSubmit.textContent = mode === "signup" ? "회원가입" : "로그인";
}

function renderMemberAuthCard() {
  const hasProfile = Boolean(uiState.profile);
  const isGuest = isGuestMode();

  if (!hasProfile) {
    setMemberAuthMode("signin");
    elements.memberAuthForm.querySelectorAll("input").forEach((input) => {
      input.disabled = true;
      input.required = false;
    });
    elements.memberAuthSubmit.disabled = true;
    elements.memberAuthStatus.innerHTML = "<strong>현재 상태</strong><p>게스트 세션을 연결하는 중입니다. 연결 후 회원 로그인 또는 회원가입을 할 수 있습니다.</p>";
    return;
  }

  if (!isGuest) {
    elements.memberAuthForm.querySelectorAll("input").forEach((input) => {
      input.disabled = true;
      input.required = false;
    });
    elements.memberAuthSubmit.disabled = true;
    elements.memberAuthStatus.innerHTML = `<strong>현재 상태</strong><p>${escapeHtml(uiState.profile.display_name)} 계정으로 로그인되어 있습니다. 상단 로그아웃 후 다른 계정으로 전환할 수 있습니다.</p>`;
    return;
  }

  elements.memberAuthForm.querySelectorAll("input").forEach((input) => {
    input.disabled = false;
  });
  getFormControl(elements.memberAuthForm, "email").required = true;
  getFormControl(elements.memberAuthForm, "password").required = true;
  const signup = uiState.memberAuthMode === "signup";
  getFormControl(elements.memberAuthForm, "displayName").required = signup;
  getFormControl(elements.memberAuthForm, "username").required = signup;
  elements.memberAuthSubmit.disabled = false;
  elements.memberAuthStatus.innerHTML = "<strong>현재 상태</strong><p>현재는 게스트 모드입니다. 회원 계정으로 로그인하면 일반 채팅과 친구 기능을 사용할 수 있습니다.</p>";
}

function renderSidebar() {
  const profile = uiState.profile;
  elements.profileName.textContent = profile.display_name;
  elements.profileHandle.textContent = `@${profile.username}`;
  elements.profileBio.textContent = profile.bio || (isGuestMode() ? "게스트 모드는 랜덤 채팅만 사용할 수 있습니다." : "소개가 아직 없습니다.");
  elements.friendCount.textContent = String(getAcceptedFriendships().length);
  elements.roomCount.textContent = String(uiState.rooms.length);
  elements.reportCount.textContent = String(uiState.reports.length);

  for (const button of elements.navButtons) {
    const target = button.dataset.viewTarget;
    const disabled = isGuestMode() && target === "general";
    button.disabled = disabled;
    button.classList.toggle("is-active", target === uiState.currentView);
  }
}

function renderHome() {
  const summaryItems = [
    summaryCard("모드", isGuestMode() ? "게스트" : "회원", isGuestMode() ? "게스트끼리만 랜덤 채팅 매칭" : "회원 기능과 일반 채팅 사용 가능"),
    summaryCard("친구", String(getAcceptedFriendships().length), isGuestMode() ? "게스트 모드에서는 친구 기능을 사용하지 않습니다." : "일반 채팅이 가능한 친구 수"),
    summaryCard("일반 채팅방", String(getGeneralRooms().length), isGuestMode() ? "게스트 모드에서는 비활성화됩니다." : "친구 기반 1:1 채팅방 수"),
    summaryCard("랜덤 채팅방", String(getRandomRooms().length), "랜덤 매칭으로 만들어진 방 수"),
    summaryCard("차단 수", String(uiState.blocks.length), "내가 차단한 사용자 수"),
    summaryCard("현재 테마", getThemeById(uiState.profile.theme_id)?.name || "Moon Violet", "프로필에 저장된 테마"),
  ];
  elements.homeSummary.innerHTML = summaryItems.join("");

  const activities = buildRecentActivities();
  elements.homeActivity.innerHTML = activities.length
    ? activities
        .map(
          (entry) => `
            <article class="activity-item">
              <strong>${escapeHtml(entry.title)}</strong>
              <p>${escapeHtml(entry.body)}</p>
              <small>${formatRelativeTime(entry.createdAt)}</small>
            </article>
          `,
        )
        .join("")
    : '<div class="empty-state">아직 활동 기록이 없습니다.</div>';
}

function renderGeneral() {
  if (!uiState.profile) {
    elements.friendList.innerHTML = '<div class="empty-state">연결 후 친구 목록이 표시됩니다.</div>';
    elements.incomingRequests.innerHTML = '<div class="empty-state">연결 후 친구 요청이 표시됩니다.</div>';
    elements.directoryList.innerHTML = '<div class="empty-state">연결 후 사용자 목록이 표시됩니다.</div>';
    elements.generalRoomHead.innerHTML = `
      <div>
        <p class="eyebrow">General Room</p>
        <h2>일반 채팅 준비 중</h2>
        <p class="chat-room-meta">세션 연결 후 실제 친구 기반 대화를 시작할 수 있습니다.</p>
      </div>
    `;
    elements.generalMessages.innerHTML = '<div class="empty-state">연결 후 일반 채팅방이 여기에 표시됩니다.</div>';
    elements.generalForm.querySelector("button").disabled = true;
    getFormControl(elements.generalForm, "message").disabled = true;
    getFormControl(elements.generalForm, "message").placeholder = "게스트 세션 연결 후 사용할 수 있습니다.";
    return;
  }

  if (isGuestMode()) {
    elements.friendList.innerHTML = '<div class="empty-state">게스트 모드에서는 일반 채팅을 사용할 수 없습니다.</div>';
    elements.incomingRequests.innerHTML = '<div class="empty-state">게스트 모드에서는 친구 요청을 받지 않습니다.</div>';
    elements.directoryList.innerHTML = '<div class="empty-state">게스트 모드에서는 사용자 찾기가 비활성화됩니다.</div>';
    elements.generalRoomHead.innerHTML = `
      <div>
        <p class="eyebrow">General Room</p>
        <h2>게스트 모드에서는 사용할 수 없습니다</h2>
        <p class="chat-room-meta">게스트는 게스트끼리 랜덤 채팅만 가능합니다.</p>
      </div>
    `;
    elements.generalMessages.innerHTML = '<div class="empty-state">회원가입 또는 로그인 후 일반 채팅을 사용할 수 있습니다.</div>';
    elements.generalForm.querySelector("button").disabled = true;
    getFormControl(elements.generalForm, "message").disabled = true;
    return;
  }

  const friends = getAcceptedFriendProfiles();
  const incoming = getIncomingFriendships();
  const directory = getDirectoryCards();

  elements.friendList.innerHTML = friends.length
    ? friends.map((profile) => userCard(profile, `<button class="inline-button" type="button" data-open-general="${profile.user_id}">대화 열기</button>`)).join("")
    : '<div class="empty-state">아직 친구가 없습니다.</div>';

  elements.incomingRequests.innerHTML = incoming.length
    ? incoming
        .map(
          (entry) => userCard(
            entry.profile,
            `
              <button class="inline-button" type="button" data-accept-friendship="${entry.id}">수락</button>
              <button class="ghost-button" type="button" data-reject-friendship="${entry.id}">거절</button>
            `,
          ),
        )
        .join("")
    : '<div class="empty-state">받은 친구 요청이 없습니다.</div>';

  elements.directoryList.innerHTML = directory.length
    ? directory
        .map((entry) => userCard(entry.profile, buildDirectoryActions(entry)))
        .join("")
    : '<div class="empty-state">추가로 보여줄 회원이 없습니다.</div>';

  elements.generalForm.querySelector("button").disabled = false;
  getFormControl(elements.generalForm, "message").disabled = false;
  renderGeneralRoom();
}

function renderGeneralRoom() {
  const room = uiState.rooms.find((entry) => entry.id === uiState.activeGeneralRoomId && entry.room_type === "general");
  if (!room) {
    elements.generalRoomHead.innerHTML = `
      <div>
        <p class="eyebrow">General Room</p>
        <h2>대화할 친구를 선택하세요</h2>
        <p class="chat-room-meta">친구 목록에서 대화를 열면 이곳에 메시지가 표시됩니다.</p>
      </div>
    `;
    elements.generalMessages.innerHTML = '<div class="empty-state">아직 열린 일반 채팅방이 없습니다.</div>';
    return;
  }

  const partner = getOtherMemberProfile(room.id);
  elements.generalRoomHead.innerHTML = `
    <div>
      <p class="eyebrow">General Room</p>
      <h2>${escapeHtml(partner?.display_name || "알 수 없는 사용자")}</h2>
      <p class="chat-room-meta">@${escapeHtml(partner?.username || "unknown")} · 일반 1:1 채팅</p>
    </div>
    <div class="chat-room-actions">
      <button class="inline-button" type="button" data-open-report="${partner?.user_id || ""}" data-room-id="${room.id}">신고</button>
      <button class="danger-button" type="button" data-block-user="${partner?.user_id || ""}">차단</button>
    </div>
  `;
  elements.generalMessages.innerHTML = renderMessages(uiState.activeGeneralMessages, room, false);
}

function renderRandom() {
  if (!uiState.profile) {
    elements.randomStartButton.textContent = uiState.autoSigningIn ? "게스트 연결 중" : "매칭 시작";
    elements.randomStartButton.disabled = true;
    elements.randomSize.value = "2";
    elements.randomSize.disabled = true;
    elements.randomStatus.textContent = uiState.autoSigningIn
      ? "게스트 세션을 생성하는 중입니다. 연결되면 자동으로 랜덤 채팅이 활성화됩니다."
      : "게스트 세션이 연결되면 실제 랜덤 매칭을 시작할 수 있습니다.";
    elements.randomHistory.innerHTML = '<div class="empty-state">연결 후 랜덤 채팅 기록이 표시됩니다.</div>';
    elements.randomRoomHead.innerHTML = `
      <div>
        <p class="eyebrow">Anonymous Room</p>
        <h2>랜덤 채팅 준비 중</h2>
        <p class="chat-room-meta">세션 연결 후 실제 사용자와 익명 매칭이 시작됩니다.</p>
      </div>
    `;
    elements.randomMessages.innerHTML = '<div class="empty-state">연결 후 랜덤 채팅 메시지가 표시됩니다.</div>';
    getFormControl(elements.randomForm, "message").disabled = true;
    elements.randomForm.querySelector("button").disabled = true;
    getFormControl(elements.randomForm, "message").placeholder = "연결 후 사용할 수 있습니다.";
    return;
  }

  const queueing = Boolean(uiState.randomQueue);
  elements.randomStartButton.textContent = queueing ? "매칭 취소" : isGuestMode() ? "자동 매칭 대기" : "매칭 시작";
  elements.randomStartButton.disabled = false;
  elements.randomSize.value = "2";
  elements.randomSize.disabled = queueing || isGuestMode() || uiState.autoJoiningRandom;

  if (isGuestMode()) {
    elements.randomStatus.textContent = queueing
      ? "다른 게스트를 찾는 중입니다. 두 번째 기기나 다른 브라우저에서 게스트로 접속하면 매칭됩니다."
      : "게스트 모드는 게스트끼리만 랜덤 채팅할 수 있습니다.";
  } else {
    elements.randomStatus.textContent = queueing
      ? "다른 회원을 찾는 중입니다. 잠시 후 자동으로 방이 열립니다."
      : "랜덤 채팅을 시작하면 같은 등급의 사용자와 1:1로 연결됩니다.";
  }

  const randomRooms = getRandomRooms();
  elements.randomHistory.innerHTML = randomRooms.length
    ? randomRooms
        .map((room) => renderRandomHistoryCard(room))
        .join("")
    : '<div class="empty-state">랜덤 채팅 기록이 없습니다.</div>';

  renderRandomRoom();
}

function renderRandomRoom() {
  const room = uiState.rooms.find((entry) => entry.id === uiState.activeRandomRoomId && entry.room_type === "random");
  if (!room) {
    elements.randomRoomHead.innerHTML = `
      <div>
        <p class="eyebrow">Anonymous Room</p>
        <h2>익명 방이 아직 열리지 않았습니다</h2>
        <p class="chat-room-meta">매칭이 완료되면 상대와 익명 닉네임으로 입장합니다.</p>
      </div>
    `;
    elements.randomMessages.innerHTML = '<div class="empty-state">랜덤 매칭을 시작하면 익명 대화가 이 영역에 표시됩니다.</div>';
    getFormControl(elements.randomForm, "message").disabled = true;
    elements.randomForm.querySelector("button").disabled = true;
    return;
  }

  const myAlias = getMyAlias(room.id);
  const partner = getOtherMember(room.id);
  const partnerAlias = partner?.alias || "익명 상대";
  elements.randomRoomHead.innerHTML = `
    <div>
      <p class="eyebrow">Anonymous Room</p>
      <h2>${escapeHtml(myAlias || "나")} · 상대 ${escapeHtml(partnerAlias)}</h2>
      <p class="chat-room-meta">${isGuestMode() ? "게스트" : "회원"} 랜덤 1:1 채팅 · 개인정보는 노출되지 않습니다.</p>
    </div>
    <div class="chat-room-actions">
      <button class="inline-button" type="button" data-open-report="${partner?.user_id || ""}" data-room-id="${room.id}">신고</button>
      <button class="danger-button" type="button" data-block-user="${partner?.user_id || ""}">차단</button>
      <button class="ghost-button" type="button" data-close-room="${room.id}">나가기</button>
    </div>
  `;
  elements.randomMessages.innerHTML = renderMessages(uiState.activeRandomMessages, room, true);
  getFormControl(elements.randomForm, "message").disabled = room.status !== "active";
  elements.randomForm.querySelector("button").disabled = room.status !== "active";
}

function renderProfile() {
  const profile = uiState.profile;
  getFormControl(elements.profileForm, "displayName").value = profile.display_name;
  getFormControl(elements.profileForm, "username").value = profile.username;
  getFormControl(elements.profileForm, "bio").value = profile.bio || "";
  getFormControl(elements.profileForm, "displayName").disabled = false;
  getFormControl(elements.profileForm, "username").disabled = isGuestMode();
  getFormControl(elements.profileForm, "bio").disabled = false;
  elements.profileForm.querySelector("button").disabled = false;

  elements.themeGrid.innerHTML = themeCatalog
    .map(
      (theme) => `
        <button class="theme-card ${theme.id === profile.theme_id ? "is-active" : ""}" type="button" data-theme-id="${theme.id}">
          <strong>${escapeHtml(theme.name)}</strong>
          <p>${escapeHtml(theme.description)}</p>
          <div class="theme-swatches">
            ${theme.swatches.map((color) => `<span style="background:${color}"></span>`).join("")}
          </div>
        </button>
      `,
    )
    .join("");

  elements.blockedList.innerHTML = uiState.blocks.length
    ? uiState.blocks
        .map((entry) => {
          const profileItem = getProfileById(entry.blocked_id);
          return `
            <article class="user-card">
              <div>
                <strong>${escapeHtml(profileItem?.display_name || "알 수 없는 사용자")}</strong>
                <small>@${escapeHtml(profileItem?.username || "unknown")}</small>
                <p>${escapeHtml(profileItem?.bio || "소개가 없습니다.")}</p>
              </div>
              <div class="user-actions">
                <button class="inline-button" type="button" data-unblock-user="${entry.blocked_id}">차단 해제</button>
              </div>
            </article>
          `;
        })
        .join("")
    : '<div class="empty-state">차단한 사용자가 없습니다.</div>';

  elements.reportList.innerHTML = uiState.reports.length
    ? uiState.reports
        .map((entry) => {
          const target = getProfileById(entry.reported_user_id);
          return `
            <article class="report-card">
              <div>
                <strong>${escapeHtml(target?.display_name || "알 수 없는 사용자")}</strong>
                <p>${escapeHtml(translateReportCategory(entry.category))}</p>
              </div>
              <div class="report-meta">
                <small>${formatDateTime(entry.created_at)}</small>
                <button class="inline-button" type="button" data-report-detail="${entry.id}">상세</button>
              </div>
            </article>
          `;
        })
        .join("")
    : '<div class="empty-state">신고 기록이 없습니다.</div>';
}

function updateViewVisibility() {
  for (const section of elements.views) {
    section.classList.toggle("is-active", section.dataset.view === uiState.currentView);
  }
}

function setView(view) {
  if (!uiState.profile) {
    uiState.currentView = view;
    updateViewVisibility();
    renderSidebarWaiting();
    return;
  }

  if (isGuestMode() && view === "general") {
    showToast("게스트 모드는 랜덤 채팅만 사용할 수 있습니다.");
    uiState.currentView = "random";
  } else {
    uiState.currentView = view;
  }
  updateViewVisibility();
  renderSidebar();
}

async function handleLogout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showToast(getReadableError(error));
    return;
  }
  showToast("로그아웃되었습니다.");
}

async function handleMemberAuthSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    showToast("Supabase 연결을 확인하세요.");
    return;
  }

  const email = getFormControl(elements.memberAuthForm, "email").value.trim().toLowerCase();
  const password = getFormControl(elements.memberAuthForm, "password").value.trim();
  if (!email || !password) {
    showToast("이메일과 비밀번호를 입력하세요.");
    return;
  }

  if (uiState.memberAuthMode === "signin") {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showToast(getReadableError(error));
      return;
    }
    elements.memberAuthForm.reset();
    showToast("회원 로그인되었습니다.");
    return;
  }

  const displayName = getFormControl(elements.memberAuthForm, "displayName").value.trim();
  const username = normalizeUsername(getFormControl(elements.memberAuthForm, "username").value);
  if (displayName.length < 2 || username.length < 3) {
    showToast("표시 이름과 사용자 아이디를 올바르게 입력하세요.");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        username,
      },
    },
  });

  if (error) {
    showToast(getReadableError(error));
    return;
  }

  elements.memberAuthForm.reset();
  if (!data.session) {
    showToast("회원가입이 접수되었습니다. 이메일 인증이 필요할 수 있습니다.");
    setMemberAuthMode("signin");
    renderMemberAuthCard();
    return;
  }
  showToast("회원가입과 로그인이 완료되었습니다.");
}

async function handleGeneralMessageSubmit(event) {
  event.preventDefault();
  if (!uiState.profile) {
    showToast("아직 실제 세션이 연결되지 않았습니다.");
    return;
  }

  const roomId = uiState.activeGeneralRoomId;
  const body = getFormControl(elements.generalForm, "message").value.trim();
  if (!roomId || !body) {
    return;
  }

  const { error } = await supabaseClient.from("chat_messages").insert({
    room_id: roomId,
    sender_id: uiState.profile.user_id,
    message_type: "text",
    body,
  });

  if (error) {
    showToast(getReadableError(error));
    return;
  }
  getFormControl(elements.generalForm, "message").value = "";
  await refreshAppData();
}

async function handleRandomMessageSubmit(event) {
  event.preventDefault();
  if (!uiState.profile) {
    showToast("아직 실제 세션이 연결되지 않았습니다.");
    return;
  }

  const roomId = uiState.activeRandomRoomId;
  const body = getFormControl(elements.randomForm, "message").value.trim();
  if (!roomId || !body) {
    return;
  }

  const { error } = await supabaseClient.from("chat_messages").insert({
    room_id: roomId,
    sender_id: uiState.profile.user_id,
    message_type: "text",
    body,
  });

  if (error) {
    showToast(getReadableError(error));
    return;
  }
  getFormControl(elements.randomForm, "message").value = "";
  await refreshAppData();
}

async function handleRandomQueueSubmit(event) {
  event.preventDefault();
  if (!uiState.profile) {
    showToast("게스트 세션 연결 후 매칭을 시작할 수 있습니다.");
    return;
  }

  if (uiState.randomQueue) {
    const { error } = await supabaseClient.rpc("chat_leave_random_queue");
    if (error) {
      showToast(getReadableError(error));
      return;
    }
    await refreshAppData();
    showToast("랜덤 매칭 대기를 취소했습니다.");
    return;
  }

  const { data, error } = await supabaseClient.rpc("chat_join_random_queue", { p_target_size: 2 });
  if (error) {
    showToast(getReadableError(error));
    return;
  }
  if (data) {
    uiState.activeRandomRoomId = data;
    await refreshAppData();
    showToast("랜덤 채팅방에 입장했습니다.");
    return;
  }
  await refreshAppData();
  showToast("매칭 대기열에 등록되었습니다.");
}

async function handleProfileSave(event) {
  event.preventDefault();
  const displayName = getFormControl(elements.profileForm, "displayName").value.trim();
  const username = normalizeUsername(getFormControl(elements.profileForm, "username").value);
  const bio = getFormControl(elements.profileForm, "bio").value.trim();

  if (displayName.length < 2) {
    showToast("표시 이름은 2자 이상이어야 합니다.");
    return;
  }

  const payload = {
    display_name: displayName,
    bio,
  };
  if (!isGuestMode()) {
    payload.username = username;
  }

  const { error } = await supabaseClient.from("chat_profiles").update(payload).eq("user_id", uiState.profile.user_id);
  if (error) {
    showToast(getReadableError(error));
    return;
  }
  await refreshAppData();
  showToast("프로필을 저장했습니다.");
}

async function handleThemeClick(event) {
  const button = event.target.closest("[data-theme-id]");
  if (!button) {
    return;
  }

  const themeId = button.dataset.themeId;
  const { error } = await supabaseClient.from("chat_profiles").update({ theme_id: themeId }).eq("user_id", uiState.profile.user_id);
  if (error) {
    showToast(getReadableError(error));
    return;
  }
  await refreshAppData();
  showToast("테마를 적용했습니다.");
}

async function handleFriendListClick(event) {
  const openButton = event.target.closest("[data-open-general]");
  if (!openButton) {
    return;
  }
  const { data, error } = await supabaseClient.rpc("chat_open_general_room", { p_other_user_id: openButton.dataset.openGeneral });
  if (error) {
    showToast(getReadableError(error));
    return;
  }
  uiState.activeGeneralRoomId = data;
  await refreshAppData();
  setView("general");
}

async function handleIncomingRequestClick(event) {
  const acceptButton = event.target.closest("[data-accept-friendship]");
  if (acceptButton) {
    await respondFriendship(acceptButton.dataset.acceptFriendship, "accepted");
    return;
  }

  const rejectButton = event.target.closest("[data-reject-friendship]");
  if (rejectButton) {
    await respondFriendship(rejectButton.dataset.rejectFriendship, "rejected");
  }
}

async function handleDirectoryClick(event) {
  const sendButton = event.target.closest("[data-send-request]");
  if (sendButton) {
    await sendFriendRequest(sendButton.dataset.sendRequest);
    return;
  }

  const openButton = event.target.closest("[data-open-general]");
  if (openButton) {
    const { data, error } = await supabaseClient.rpc("chat_open_general_room", { p_other_user_id: openButton.dataset.openGeneral });
    if (error) {
      showToast(getReadableError(error));
      return;
    }
    uiState.activeGeneralRoomId = data;
    await refreshAppData();
    setView("general");
  }
}

async function handleBlockedListClick(event) {
  const unblockButton = event.target.closest("[data-unblock-user]");
  if (!unblockButton) {
    return;
  }
  const { error } = await supabaseClient
    .from("chat_blocks")
    .delete()
    .eq("blocker_id", uiState.profile.user_id)
    .eq("blocked_id", unblockButton.dataset.unblockUser);
  if (error) {
    showToast(getReadableError(error));
    return;
  }
  await refreshAppData();
  showToast("차단을 해제했습니다.");
}

async function handleRandomHistoryClick(event) {
  const openButton = event.target.closest("[data-open-random-room]");
  if (openButton) {
    uiState.activeRandomRoomId = openButton.dataset.openRandomRoom;
    await refreshAppData();
    return;
  }

  const closeButton = event.target.closest("[data-close-room]");
  if (closeButton) {
    await closeRoom(closeButton.dataset.closeRoom);
  }
}

async function handleRoomHeaderClick(event) {
  const reportButton = event.target.closest("[data-open-report]");
  if (reportButton) {
    openReportModal(reportButton.dataset.openReport, reportButton.dataset.roomId);
    return;
  }

  const blockButton = event.target.closest("[data-block-user]");
  if (blockButton) {
    await blockUser(blockButton.dataset.blockUser);
    return;
  }

  const closeButton = event.target.closest("[data-close-room]");
  if (closeButton) {
    await closeRoom(closeButton.dataset.closeRoom);
  }
}

function handleReportListClick(event) {
  const button = event.target.closest("[data-report-detail]");
  if (!button) {
    return;
  }
  const report = uiState.reports.find((entry) => entry.id === button.dataset.reportDetail);
  if (!report) {
    return;
  }
  showToast(report.description || "상세 설명이 없는 신고입니다.");
}

function openReportModal(targetId, roomId) {
  const target = getProfileById(targetId);
  getFormControl(elements.reportForm, "targetId").value = targetId;
  getFormControl(elements.reportForm, "roomId").value = roomId || "";
  getFormControl(elements.reportForm, "targetLabel").value = target
    ? `${target.display_name} (@${target.username})`
    : "알 수 없는 사용자";
  elements.reportModal.hidden = false;
}

function closeReportModal() {
  elements.reportModal.hidden = true;
  elements.reportForm.reset();
}

async function handleReportSubmit(event) {
  event.preventDefault();
  const targetId = getFormControl(elements.reportForm, "targetId").value;
  if (!targetId) {
    return;
  }

  const payload = {
    reporter_id: uiState.profile.user_id,
    reported_user_id: targetId,
    room_id: getFormControl(elements.reportForm, "roomId").value || null,
    category: getFormControl(elements.reportForm, "category").value,
    description: getFormControl(elements.reportForm, "description").value.trim(),
  };

  const { error } = await supabaseClient.from("chat_reports").insert(payload);
  if (error) {
    showToast(getReadableError(error));
    return;
  }
  closeReportModal();
  await refreshAppData();
  showToast("신고가 접수되었습니다.");
}

async function sendFriendRequest(targetUserId) {
  const existing = getFriendshipWith(targetUserId);
  let error = null;

  if (existing) {
    ({ error } = await supabaseClient
      .from("chat_friendships")
      .update({ requester_id: uiState.profile.user_id, addressee_id: targetUserId, status: "pending" })
      .eq("id", existing.id));
  } else {
    ({ error } = await supabaseClient.from("chat_friendships").insert({
      requester_id: uiState.profile.user_id,
      addressee_id: targetUserId,
      status: "pending",
    }));
  }

  if (error) {
    showToast(getReadableError(error));
    return;
  }
  await refreshAppData();
  showToast("친구 요청을 보냈습니다.");
}

async function respondFriendship(friendshipId, status) {
  const { error } = await supabaseClient.from("chat_friendships").update({ status }).eq("id", friendshipId);
  if (error) {
    showToast(getReadableError(error));
    return;
  }
  await refreshAppData();
  showToast(status === "accepted" ? "친구 요청을 수락했습니다." : "친구 요청을 거절했습니다.");
}

async function blockUser(targetUserId) {
  const { error } = await supabaseClient.from("chat_blocks").insert({
    blocker_id: uiState.profile.user_id,
    blocked_id: targetUserId,
  });

  if (error && !isDuplicateError(error)) {
    showToast(getReadableError(error));
    return;
  }

  if (uiState.activeRandomRoomId) {
    const activeRandomPartner = getOtherMember(uiState.activeRandomRoomId);
    if (activeRandomPartner?.user_id === targetUserId) {
      await closeRoom(uiState.activeRandomRoomId, false);
    }
  }

  await refreshAppData();
  showToast("사용자를 차단했습니다.");
}

async function closeRoom(roomId, toast = true) {
  const { error } = await supabaseClient.rpc("chat_close_room", { p_room_id: roomId });
  if (error) {
    showToast(getReadableError(error));
    return;
  }
  await refreshAppData();
  if (toast) {
    showToast("채팅방을 종료했습니다.");
  }
}

async function fetchMyProfile(userId) {
  if (!supabaseClient) {
    return null;
  }
  const { data, error } = await supabaseClient.from("chat_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    showToast(getReadableError(error));
    return null;
  }
  return data;
}

async function ensureMyProfile(user) {
  const metadata = user.user_metadata || {};
  const usernameBase = normalizeUsername(metadata.username || metadata.user_name || user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`);
  const payload = {
    user_id: user.id,
    is_guest: Boolean(user.is_anonymous),
    display_name: buildDisplayName(user),
    username: usernameBase.length >= 3 ? usernameBase : buildFallbackUsername(user),
    bio: "",
    theme_id: "moon-violet",
  };

  const { error } = await supabaseClient.from("chat_profiles").upsert(payload, { onConflict: "user_id" });
  if (error) {
    showToast(getReadableError(error));
    return null;
  }

  return await fetchMyProfile(user.id);
}

async function fetchMyFriendships(userId) {
  if (!supabaseClient) {
    return [];
  }
  const { data, error } = await supabaseClient
    .from("chat_friendships")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) {
    showToast(getReadableError(error));
    return [];
  }
  return data || [];
}

async function fetchDirectoryProfiles(userId) {
  if (!supabaseClient) {
    return [];
  }
  const { data, error } = await supabaseClient
    .from("chat_profiles")
    .select("*")
    .eq("is_guest", false)
    .neq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    showToast(getReadableError(error));
    return [];
  }
  return data || [];
}

async function fetchMyBlocks(userId) {
  if (!supabaseClient) {
    return [];
  }
  const { data, error } = await supabaseClient
    .from("chat_blocks")
    .select("*")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    showToast(getReadableError(error));
    return [];
  }
  return data || [];
}

async function fetchMyReports(userId) {
  if (!supabaseClient) {
    return [];
  }
  const { data, error } = await supabaseClient
    .from("chat_reports")
    .select("*")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    showToast(getReadableError(error));
    return [];
  }
  return data || [];
}

async function fetchMyQueue(userId) {
  if (!supabaseClient) {
    return null;
  }
  const { data, error } = await supabaseClient.from("chat_random_queue").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    showToast(getReadableError(error));
    return null;
  }
  return data;
}

async function fetchMyRoomMemberships(userId) {
  if (!supabaseClient) {
    return [];
  }
  const { data, error } = await supabaseClient.from("chat_room_members").select("room_id, alias").eq("user_id", userId);
  if (error) {
    showToast(getReadableError(error));
    return [];
  }
  return data || [];
}

async function fetchRoomsByIds(roomIds) {
  if (!supabaseClient) {
    return [];
  }
  const { data, error } = await supabaseClient.from("chat_rooms").select("*").in("id", roomIds).order("created_at", { ascending: false });
  if (error) {
    showToast(getReadableError(error));
    return [];
  }
  return data || [];
}

async function fetchRoomMembersByRoomIds(roomIds) {
  if (!supabaseClient) {
    return [];
  }
  const { data, error } = await supabaseClient.from("chat_room_members").select("*").in("room_id", roomIds);
  if (error) {
    showToast(getReadableError(error));
    return [];
  }
  return data || [];
}

async function fetchRoomMessages(roomId) {
  if (!supabaseClient) {
    return [];
  }
  const { data, error } = await supabaseClient
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) {
    showToast(getReadableError(error));
    return [];
  }
  return data || [];
}

function startPolling() {
  stopPolling();
  uiState.pollTimer = window.setInterval(() => {
    refreshAppData();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (uiState.pollTimer) {
    window.clearInterval(uiState.pollTimer);
    uiState.pollTimer = null;
  }
}

function startRealtime() {
  if (!supabaseClient || !uiState.session?.user) {
    return;
  }

  stopRealtime();
  uiState.realtimeChannel = supabaseClient
    .channel(`chat-live-${uiState.session.user.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => refreshAppData())
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms" }, () => refreshAppData())
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_room_members" }, () => refreshAppData())
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_random_queue" }, () => refreshAppData())
    .subscribe();
}

function stopRealtime() {
  if (!supabaseClient || !uiState.realtimeChannel) {
    return;
  }
  supabaseClient.removeChannel(uiState.realtimeChannel);
  uiState.realtimeChannel = null;
}

function isGuestMode() {
  return Boolean(uiState.profile?.is_guest);
}

function getAcceptedFriendships() {
  return uiState.friendships.filter((entry) => entry.status === "accepted");
}

function getIncomingFriendships() {
  return uiState.friendships
    .filter((entry) => entry.status === "pending" && entry.addressee_id === uiState.profile.user_id)
    .map((entry) => ({
      ...entry,
      profile: getProfileById(entry.requester_id),
    }))
    .filter((entry) => entry.profile);
}

function getAcceptedFriendProfiles() {
  return getAcceptedFriendships()
    .map((entry) => getProfileById(otherFriendUserId(entry)))
    .filter(Boolean);
}

function getDirectoryCards() {
  return uiState.directoryProfiles.map((profile) => ({
    profile,
    friendship: getFriendshipWith(profile.user_id),
  }));
}

function getFriendshipWith(targetUserId) {
  return uiState.friendships.find(
    (entry) =>
      (entry.requester_id === uiState.profile.user_id && entry.addressee_id === targetUserId) ||
      (entry.requester_id === targetUserId && entry.addressee_id === uiState.profile.user_id),
  );
}

function buildDirectoryActions(entry) {
  if (!entry.friendship) {
    return `<button class="inline-button" type="button" data-send-request="${entry.profile.user_id}">친구 요청</button>`;
  }
  if (entry.friendship.status === "accepted") {
    return `<button class="inline-button" type="button" data-open-general="${entry.profile.user_id}">대화 열기</button>`;
  }
  if (entry.friendship.status === "pending") {
    return `<button class="ghost-button" type="button" disabled>요청 진행 중</button>`;
  }
  return `<button class="inline-button" type="button" data-send-request="${entry.profile.user_id}">다시 요청</button>`;
}

function otherFriendUserId(friendship) {
  return friendship.requester_id === uiState.profile.user_id ? friendship.addressee_id : friendship.requester_id;
}

function getGeneralRooms() {
  return uiState.rooms.filter((entry) => entry.room_type === "general");
}

function getRandomRooms() {
  return uiState.rooms.filter((entry) => entry.room_type === "random");
}

function getProfileById(userId) {
  if (!userId) {
    return null;
  }
  const allProfiles = [uiState.profile, ...uiState.directoryProfiles];
  return allProfiles.find((entry) => entry?.user_id === userId) || null;
}

function getRoomMembers(roomId) {
  return uiState.roomMembers.filter((entry) => entry.room_id === roomId);
}

function getOtherMember(roomId) {
  return getRoomMembers(roomId).find((entry) => entry.user_id !== uiState.profile.user_id) || null;
}

function getOtherMemberProfile(roomId) {
  const member = getOtherMember(roomId);
  return getProfileById(member?.user_id);
}

function getMyAlias(roomId) {
  return getRoomMembers(roomId).find((entry) => entry.user_id === uiState.profile.user_id)?.alias || null;
}

function renderRandomHistoryCard(room) {
  const partner = getOtherMember(room.id);
  return `
    <article class="user-card">
      <div>
        <strong>${escapeHtml(partner?.alias || "익명 상대")}</strong>
        <small>${escapeHtml(room.status === "active" ? "진행 중인 방" : "종료된 방")}</small>
        <p>${formatDateTime(room.created_at)}에 생성된 랜덤 채팅방입니다.</p>
      </div>
      <div class="user-actions">
        <button class="inline-button" type="button" data-open-random-room="${room.id}">열기</button>
        <button class="ghost-button" type="button" data-close-room="${room.id}">종료</button>
      </div>
    </article>
  `;
}

function renderMessages(messages, room, isRandomRoom) {
  if (!messages.length) {
    return '<div class="empty-state">아직 메시지가 없습니다.</div>';
  }

  return messages
    .map((message) => {
      const mine = message.sender_id === uiState.profile.user_id;
      const classes = ["message-bubble"];
      if (mine) {
        classes.push("me");
      }
      if (message.message_type === "system") {
        classes.push("system");
      }
      return `
        <article class="${classes.join(" ")}">
          <span class="message-author">${escapeHtml(resolveMessageAuthor(message, room, isRandomRoom))}</span>
          <div>${escapeHtml(message.body)}</div>
          <span class="message-time">${formatTime(message.created_at)}</span>
        </article>
      `;
    })
    .join("");
}

function resolveMessageAuthor(message, room, isRandomRoom) {
  if (message.message_type === "system") {
    return "System";
  }
  if (isRandomRoom) {
    return getRoomMembers(room.id).find((entry) => entry.user_id === message.sender_id)?.alias || "익명";
  }
  return getProfileById(message.sender_id)?.display_name || "사용자";
}

function buildRecentActivities() {
  const items = [];

  if (uiState.randomQueue) {
    items.push({
      title: "랜덤 매칭 대기 중",
      body: isGuestMode() ? "다른 게스트를 찾는 중입니다." : "다른 회원을 찾는 중입니다.",
      createdAt: uiState.randomQueue.queued_at,
    });
  }

  if (uiState.activeGeneralMessages.at(-1)) {
    items.push({
      title: "최근 일반 채팅 메시지",
      body: uiState.activeGeneralMessages.at(-1).body,
      createdAt: uiState.activeGeneralMessages.at(-1).created_at,
    });
  }

  if (uiState.activeRandomMessages.at(-1)) {
    items.push({
      title: "최근 랜덤 채팅 메시지",
      body: uiState.activeRandomMessages.at(-1).body,
      createdAt: uiState.activeRandomMessages.at(-1).created_at,
    });
  }

  if (uiState.reports[0]) {
    items.push({
      title: "신고 기록",
      body: `${translateReportCategory(uiState.reports[0].category)} 사유로 신고했습니다.`,
      createdAt: uiState.reports[0].created_at,
    });
  }

  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
}

function summaryCard(title, value, description) {
  return `
    <article class="summary-card">
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <p>${escapeHtml(description)}</p>
    </article>
  `;
}

function userCard(profile, actionsMarkup) {
  return `
    <article class="user-card">
      <div>
        <strong>${escapeHtml(profile.display_name)}</strong>
        <small>@${escapeHtml(profile.username)}</small>
        <p>${escapeHtml(profile.bio || "소개가 없습니다.")}</p>
      </div>
      <div class="user-actions">${actionsMarkup}</div>
    </article>
  `;
}

function applyThemeById(themeId) {
  const theme = getThemeById(themeId);
  for (const [key, value] of Object.entries(theme.vars)) {
    document.documentElement.style.setProperty(key, value);
  }
}

function getThemeById(themeId) {
  return themeCatalog.find((entry) => entry.id === themeId) || themeCatalog[0];
}

function getFormControl(form, name) {
  return form.elements.namedItem(name);
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 18);
}

function buildFallbackUsername(user) {
  return `${user.is_anonymous ? "guest" : "member"}_${String(user.id).replaceAll("-", "").slice(0, 8)}`;
}

function buildDisplayName(user) {
  const metadata = user.user_metadata || {};
  const raw = String(metadata.display_name || metadata.displayName || "").trim();
  if (raw.length >= 2) {
    return raw.slice(0, 30);
  }
  return `${user.is_anonymous ? "게스트" : "사용자"} ${String(user.id).replaceAll("-", "").slice(0, 4)}`;
}

function randomLabel() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function translateReportCategory(category) {
  switch (category) {
    case "abuse":
      return "욕설 / 괴롭힘";
    case "spam":
      return "스팸";
    case "sexual":
      return "부적절한 발언";
    default:
      return "기타";
  }
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRelativeTime(value) {
  const diffSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
  if (Math.abs(diffSeconds) < 60) {
    return formatter.format(diffSeconds, "second");
  }
  if (Math.abs(diffSeconds) < 3600) {
    return formatter.format(Math.round(diffSeconds / 60), "minute");
  }
  if (Math.abs(diffSeconds) < 86400) {
    return formatter.format(Math.round(diffSeconds / 3600), "hour");
  }
  return formatter.format(Math.round(diffSeconds / 86400), "day");
}

function getReadableError(error) {
  const message = error?.message || "알 수 없는 오류가 발생했습니다.";
  if (message.includes("Anonymous sign-ins are disabled")) {
    return "Supabase에서 Anonymous Sign-Ins를 켜야 게스트 모드를 사용할 수 있습니다.";
  }
  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("User already registered")) {
    return "이미 가입된 이메일입니다.";
  }
  if (message.includes("duplicate key value")) {
    return "이미 존재하는 값이 있어 저장하지 못했습니다.";
  }
  return message;
}

function isDuplicateError(error) {
  return error?.code === "23505";
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2800);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
