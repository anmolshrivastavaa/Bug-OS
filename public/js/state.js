export let S = {
  initialDataReceived: false,
  currentTheme: localStorage.getItem('theme') || 'light',
  auth: {
    loggedIn: false,
    user: null
  },
  role: null,
  view: 'dashboard',
  modules: [],
  testCases: [],
  bugs: [],
  auditLog: [],
  tcCounter: 0,
  bugCounter: 0,
  automationScripts: [],
  selectedAutomationModule: '',
  selectedAutomationTc: '',
  users: [],
  hmModFilter: [],
  hmModDropdownOpen: false,
  sidebarCollapsed: false
};