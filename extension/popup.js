document.addEventListener('DOMContentLoaded', async () => {
  const viewLogin = document.getElementById('viewLogin');
  const viewMain = document.getElementById('viewMain');
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');
  const btnCapture = document.getElementById('btnCapture');
  const selModule = document.getElementById('selModule');
  const selTestCase = document.getElementById('selTestCase');
  const connectionError = document.getElementById('connectionError');
  const attachStatus = document.getElementById('attachStatus');
  const loginError = document.getElementById('loginError');
  const selMissingEvidence = document.getElementById('selMissingEvidence');
  const missingEvidenceGroup = document.getElementById('missingEvidenceGroup');
  const actionContainer = document.getElementById('actionContainer');
  const btnAttachNow = document.getElementById('btnAttachNow');
  const btnAnnotate = document.getElementById('btnAnnotate');
  
  const draftCaptureMode = document.getElementById('draftCaptureMode');
  const normalCaptureMode = document.getElementById('normalCaptureMode');
  const btnDraftCapture = document.getElementById('btnDraftCapture');
  const draftActionContainer = document.getElementById('draftActionContainer');
  const btnDraftFill = document.getElementById('btnDraftFill');
  const btnDraftAnnotate = document.getElementById('btnDraftAnnotate');
  const btnCancelDraft = document.getElementById('btnCancelDraft');
  
  let currentCaptureInfo = null;
  let currentDraftTarget = null;

  let socket = null;
  let serverData = { modules: [], testCases: [], users: [] };
  let currentUser = null;
  let currentUserRole = null;

  const SERVER_URL = 'https://www.bugos.app'; // Production URL

  // Load saved credentials
  chrome.storage.local.get(['bugos_username'], (result) => {
    if (result.bugos_username) {
      viewLogin.classList.add('hidden');
      const loader = document.createElement('div');
      loader.id = 'initLoader';
      loader.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:var(--bg);z-index:9999;font-weight:600;color:var(--text);';
      loader.textContent = 'Connecting...';
      document.body.appendChild(loader);
      
      // Try auto-login silently
      connectToServer(SERVER_URL, result.bugos_username, null, true);
    } else {
      viewLogin.classList.remove('hidden');
    }
  });

  btnLogin.addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
      showLoginError('Please fill all fields');
      return;
    }

    loginError.classList.add('hidden');
    btnLogin.disabled = true;
    btnLogin.textContent = 'Connecting...';
    
    connectToServer(SERVER_URL, username, password, false);
  });

  btnLogout.addEventListener('click', () => {
    chrome.storage.local.remove(['bugos_username']);
    if (socket) socket.disconnect();
    const loader = document.getElementById('initLoader');
    if (loader) loader.remove();
    showLoginView();
  });

  function resetActionContainer() {
    actionContainer.classList.add('hidden');
    btnCapture.classList.remove('hidden');
    btnAttachNow.disabled = false;
    btnAttachNow.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Attach Now';
    btnAnnotate.disabled = false;
    currentCaptureInfo = null;
    checkCaptureButtonState();
  }

  selModule.addEventListener('change', (e) => {
    resetActionContainer();
    const moduleName = e.target.value;
    selTestCase.innerHTML = '<option value="">-- Choose Test Case --</option>';
    
    if (moduleName) {
      const moduleTCs = serverData.testCases.filter(tc => tc.module === moduleName && (currentUserRole !== 'qa' || tc.createdBy === currentUser));
      moduleTCs.forEach(tc => {
        const opt = document.createElement('option');
        opt.value = tc.id;
        opt.textContent = `[${tc.id}] ${tc.testCase}`;
        selTestCase.appendChild(opt);
      });
      selTestCase.disabled = false;
    } else {
      selTestCase.disabled = true;
      btnCapture.disabled = true;
    }
    checkCaptureButtonState();
  });

  selMissingEvidence.addEventListener('change', (e) => {
    const combinedId = e.target.value;
    if (!combinedId) return;
    
    const [moduleName, tcId] = combinedId.split('||');
    
    selModule.value = moduleName;
    selModule.dispatchEvent(new Event('change'));
    
    selTestCase.value = tcId;
    selTestCase.dispatchEvent(new Event('change'));
  });

  selTestCase.addEventListener('change', () => {
    resetActionContainer();
    checkCaptureButtonState();
  });

  function checkCaptureButtonState() {
    if (selModule.value && selTestCase.value) {
      btnCapture.disabled = false;
    } else {
      btnCapture.disabled = true;
    }
  }

  btnCapture.addEventListener('click', () => {
    const moduleId = selModule.value;
    const tcId = selTestCase.value;
    const evidenceSlot = document.querySelector('input[name="evidenceSlot"]:checked').value;
    
    const selectedTc = serverData.testCases.find(tc => tc.id === tcId && tc.module === moduleId);
    if (!selectedTc) return;

    btnCapture.disabled = true;
    btnCapture.innerHTML = 'Capturing...';
    hideStatus();

    // Take screenshot via background script
    chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (response) => {
      if (chrome.runtime.lastError || response?.error) {
        showStatus('Error capturing screen: ' + (chrome.runtime.lastError?.message || response?.error), true);
        btnCapture.disabled = false;
        btnCapture.innerHTML = 'Capture Screen';
        return;
      }

      currentCaptureInfo = {
        testCase: selectedTc,
        slot: evidenceSlot,
        dataUrl: response.dataUrl
      };

      btnCapture.innerHTML = 'Capture Screen';
      btnCapture.classList.add('hidden');
      actionContainer.classList.remove('hidden');
    });
  });

  btnAttachNow.addEventListener('click', () => {
    if (!currentCaptureInfo) return;
    btnAttachNow.disabled = true;
    btnAttachNow.innerHTML = 'Attaching...';
    btnAnnotate.disabled = true;
    attachScreenshotToTc(currentCaptureInfo.testCase, currentCaptureInfo.slot, currentCaptureInfo.dataUrl);
  });

  btnAnnotate.addEventListener('click', () => {
    if (!currentCaptureInfo) return;
    chrome.storage.local.set({
      captureInfo: {
        testCase: currentCaptureInfo.testCase,
        slot: currentCaptureInfo.slot,
        dataUrl: currentCaptureInfo.dataUrl,
        username: currentUser
      }
    }, () => {
      chrome.tabs.create({ url: 'annotate.html' });
    });
  });

  btnCancelDraft.addEventListener('click', () => {
    chrome.tabs.query({}, (tabs) => {
      const bugosTab = tabs.find(t => t.url && (t.url.includes('localhost') || t.url.includes('bugos.app')));
      if (bugosTab) {
        chrome.scripting.executeScript({
          target: {tabId: bugosTab.id},
          func: () => localStorage.removeItem('bugos_capture_target')
        });
      }
    });
    currentDraftTarget = null;
    draftActionContainer.classList.add('hidden');
    btnDraftCapture.classList.remove('hidden');
    draftCaptureMode.classList.add('hidden');
    normalCaptureMode.classList.remove('hidden');
  });

  btnDraftCapture.addEventListener('click', () => {
    if (!currentDraftTarget) return;

    btnDraftCapture.disabled = true;
    btnDraftCapture.innerHTML = 'Capturing...';
    hideStatus();

    chrome.runtime.sendMessage({ action: "captureVisibleTab" }, async (response) => {
      btnDraftCapture.disabled = false;
      btnDraftCapture.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Capture Screen';

      if (chrome.runtime.lastError || response?.error) {
        showStatus('Error capturing screen: ' + (chrome.runtime.lastError?.message || response?.error), true);
        return;
      }

      currentCaptureInfo = { dataUrl: response.dataUrl };
      btnDraftCapture.classList.add('hidden');
      draftActionContainer.classList.remove('hidden');
    });
  });

  btnDraftFill.addEventListener('click', async () => {
    btnDraftFill.disabled = true;
    btnDraftFill.innerHTML = 'Uploading...';
    hideStatus();
    
    try {
      const res = await fetch(SERVER_URL + '/api/upload-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: currentCaptureInfo.dataUrl })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server returned non-JSON response. Ensure backend is deployed.`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload image');
      const imageUrl = data.imageUrl;

      chrome.tabs.query({}, (tabs) => {
        const bugosTab = tabs.find(t => t.url && (t.url.includes('localhost') || t.url.includes('bugos.app')));
        if (bugosTab) {
          chrome.scripting.executeScript({
            target: {tabId: bugosTab.id},
            args: [currentDraftTarget, imageUrl],
            func: (targetId, url) => {
              const input = document.getElementById(targetId);
              if (input) {
                input.value = url;
                input.dispatchEvent(new Event('input'));
              }
              localStorage.removeItem('bugos_capture_target');
            }
          }, () => {
            btnDraftFill.innerHTML = 'Filled successfully!';
            setTimeout(() => window.close(), 1000);
          });
        }
      });
    } catch (err) {
      showStatus(err.message, true);
      btnDraftFill.disabled = false;
      btnDraftFill.innerHTML = 'Fill Now';
    }
  });

  btnDraftAnnotate.addEventListener('click', () => {
    if (!currentCaptureInfo) return;
    chrome.storage.local.set({
      captureInfo: {
        draftTarget: currentDraftTarget,
        dataUrl: currentCaptureInfo.dataUrl,
        username: currentUser
      }
    }, () => {
      chrome.tabs.create({ url: 'annotate.html' });
    });
  });

  async function attachScreenshotToTc(testCase, slot, dataUrl) {
    if (!socket || !socket.connected) {
      showStatus('Not connected to server. Please log in again.', true);
      btnCapture.disabled = false;
      resetActionContainer();
      return;
    }

    try {
      const response = await fetch(SERVER_URL + '/api/upload-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response. Ensure backend is deployed. Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      const imageUrl = data.imageUrl;
      const updatedTc = { ...testCase };
      updatedTc[slot] = imageUrl;
      
      // History log
      const dateStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      updatedTc.history = [...(updatedTc.history || []), { 
        date: dateStr, 
        event: `Screenshot URL attached to ${slot} via Extension by ${currentUser}`
      }];

      // Emit update over socket
      socket.emit('updateData', {
        type: 'testCase',
        data: updatedTc
      });

      showStatus('Screenshot attached successfully!', false);
    } catch (err) {
      showStatus(err.message, true);
    } finally {
      btnCapture.disabled = false;
      resetActionContainer();
    }
  }

  function connectToServer(url, username, password, isAutoLogin) {
    if (socket) socket.disconnect();
    
    socket = io(url, {
      reconnectionAttempts: 3,
      timeout: 5000,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      connectionError.classList.add('hidden');
    });

    socket.on('initialData', (data) => {
      serverData = data;
      
      // Validate user
      const user = data.users.find(u => u.username === username);
      if (!user || (password && user.password !== password)) {
        if (!isAutoLogin) {
          showLoginError('Invalid username or password');
          socket.disconnect();
        } else {
          showLoginView();
        }
        return;
      }

      if (user.role !== 'qa') {
        if (!isAutoLogin) showLoginError('Only QA roles can use this extension.');
        socket.disconnect();
        return;
      }

      // Valid login
      currentUser = username;
      currentUserRole = user.role;
      chrome.storage.local.set({ bugos_username: username });
      
      populateMainView();
      showMainView();
    });

    socket.on('connect_error', (err) => {
      if (!isAutoLogin) {
        showLoginError('Could not connect to BugOS server.');
        btnLogin.disabled = false;
        btnLogin.textContent = 'Sign In';
      } else {
        const loader = document.getElementById('initLoader');
        if (loader) loader.remove();
        showLoginView();
        connectionError.classList.remove('hidden');
      }
    });

    socket.on('dataUpdate', (update) => {
      if (update.type === 'testCase') {
        const idx = serverData.testCases.findIndex(tc => tc.id === update.data.id && tc.module === update.data.module);
        if (idx !== -1) serverData.testCases[idx] = update.data;
        else serverData.testCases.push(update.data);
        populateMissingEvidence();
      }
    });
  }

  function populateMainView() {
    document.getElementById('lblUsername').textContent = currentUser;
    
    // Populate modules
    selModule.innerHTML = '<option value="">-- Choose Module --</option>';
    serverData.modules.forEach(mName => {
      const opt = document.createElement('option');
      opt.value = mName;
      opt.textContent = mName;
      selModule.appendChild(opt);
    });
    
    populateMissingEvidence();

    // Check for auto-select from web page
    chrome.tabs.query({}, (tabs) => {
      const bugosTab = tabs.find(t => t.url && (t.url.includes('localhost') || t.url.includes('bugos.app')));
      if (bugosTab) {
        chrome.scripting.executeScript({
          target: {tabId: bugosTab.id},
          func: () => {
            const draftTarget = localStorage.getItem('bugos_capture_target');
            if (draftTarget) {
              return { draftTarget };
            }
            const mod = localStorage.getItem('bugos_auto_select_module');
            const tc = localStorage.getItem('bugos_auto_select_tc');
            const slot = localStorage.getItem('bugos_auto_select_slot');
            if (tc && mod) {
              localStorage.removeItem('bugos_auto_select_module');
              localStorage.removeItem('bugos_auto_select_tc');
              localStorage.removeItem('bugos_auto_select_slot');
              return {mod, tc, slot};
            }
            return null;
          }
        }, (results) => {
          if (results && results[0] && results[0].result) {
            const {mod, tc, slot, draftTarget} = results[0].result;
            
            if (draftTarget) {
              currentDraftTarget = draftTarget;
              normalCaptureMode.classList.add('hidden');
              draftCaptureMode.classList.remove('hidden');
              return;
            }

            selModule.value = mod;
            selModule.dispatchEvent(new Event('change'));
            setTimeout(() => {
              selTestCase.value = tc;
              selTestCase.dispatchEvent(new Event('change'));
              if (slot === 'evidence2') {
                document.querySelector('input[name="evidenceSlot"][value="evidence2"]').checked = true;
              } else {
                document.querySelector('input[name="evidenceSlot"][value="evidence"]').checked = true;
              }
            }, 50);
          }
        });
      }
    });
  }

  function populateMissingEvidence() {
    const missingTCs = serverData.testCases.filter(tc => !tc.evidence && !tc.evidence2 && (currentUserRole !== 'qa' || tc.createdBy === currentUser));
    
    if (missingTCs.length > 0) {
      missingEvidenceGroup.style.display = 'block';
      selMissingEvidence.innerHTML = '<option value="">-- View Test Cases Needing Evidence --</option>';
      missingTCs.forEach(tc => {
        const opt = document.createElement('option');
        opt.value = `${tc.module}||${tc.id}`;
        opt.textContent = `[${tc.module}] ${tc.id}: ${tc.testCase}`;
        selMissingEvidence.appendChild(opt);
      });
    } else {
      missingEvidenceGroup.style.display = 'none';
      selMissingEvidence.innerHTML = '';
    }
  }

  function showMainView() {
    const loader = document.getElementById('initLoader');
    if (loader) loader.remove();
    viewLogin.classList.add('hidden');
    viewMain.classList.remove('hidden');
    btnLogout.classList.remove('hidden');
    hideStatus();
  }

  function showLoginView() {
    viewMain.classList.add('hidden');
    btnLogout.classList.add('hidden');
    viewLogin.classList.remove('hidden');
    btnLogin.disabled = false;
    btnLogin.textContent = 'Sign In';
    document.getElementById('password').value = '';
    hideStatus();
  }

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
    btnLogin.disabled = false;
    btnLogin.textContent = 'Sign In';
  }

  function showStatus(msg, isError) {
    attachStatus.textContent = msg;
    attachStatus.classList.remove('hidden', 'success', 'error');
    attachStatus.classList.add(isError ? 'error' : 'success');
  }

  function hideStatus() {
    attachStatus.classList.add('hidden');
  }
});
