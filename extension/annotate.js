document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const statusMsg = document.getElementById('statusMsg');
  const btnSave = document.getElementById('btnSave');
  
  let currentTool = 'pen'; // 'pen' or 'rect'
  let currentColor = '#dc2626';
  
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  
  let captureInfo = null;
  let baseImage = null;
  let history = [];
  
  const SERVER_URL = 'https://www.bugos.app'; // Match popup.js
  let socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });

  chrome.storage.local.get(['captureInfo'], (result) => {
    if (result.captureInfo) {
      captureInfo = result.captureInfo;
      loadImage(captureInfo.dataUrl);
    } else {
      showError('No screenshot data found.');
    }
  });

  function loadImage(dataUrl) {
    baseImage = new Image();
    baseImage.onload = () => {
      canvas.width = baseImage.width;
      canvas.height = baseImage.height;
      ctx.drawImage(baseImage, 0, 0);
      saveState();
    };
    baseImage.src = dataUrl;
  }

  function saveState() {
    history.push(canvas.toDataURL());
  }

  function restoreState(dataUrl) {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }

  function showError(msg) {
    statusMsg.textContent = msg;
    statusMsg.className = 'status error';
  }

  document.getElementById('btnPen').addEventListener('click', (e) => {
    currentTool = 'pen';
    updateActiveTool(e.currentTarget);
  });

  document.getElementById('btnRect').addEventListener('click', (e) => {
    currentTool = 'rect';
    updateActiveTool(e.currentTarget);
  });

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentColor = e.currentTarget.dataset.color;
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });

  document.getElementById('btnUndo').addEventListener('click', () => {
    if (history.length > 1) {
      history.pop();
      restoreState(history[history.length - 1]);
    }
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    if (baseImage) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(baseImage, 0, 0);
      saveState();
    }
  });

  function updateActiveTool(btn) {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const pos = getMousePos(e);
    startX = pos.x;
    startY = pos.y;
    
    if (currentTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineWidth = 4;
      ctx.strokeStyle = currentColor;
      ctx.lineCap = 'round';
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);

    if (currentTool === 'pen') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'rect') {
      restoreState(history[history.length - 1]);
      ctx.beginPath();
      ctx.rect(startX, startY, pos.x - startX, pos.y - startY);
      ctx.lineWidth = 4;
      ctx.strokeStyle = currentColor;
      ctx.stroke();
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
      saveState();
    }
  });

  canvas.addEventListener('mouseout', () => {
    if (isDrawing) {
      isDrawing = false;
      saveState();
    }
  });

  btnSave.addEventListener('click', async () => {
    if (!captureInfo) {
      showError('Missing data. Please wait a moment.');
      return;
    }
    
    if (!captureInfo.draftTarget && !socket.connected) {
      showError('Not connected to server. Please wait a moment.');
      return;
    }
    
    btnSave.disabled = true;
    btnSave.innerHTML = 'Uploading...';
    statusMsg.className = 'status';
    statusMsg.textContent = '';

    const finalDataUrl = canvas.toDataURL('image/png');

    try {
      const response = await fetch(SERVER_URL + '/api/upload-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: finalDataUrl })
      });

      if (!response.ok) {
        throw new Error('Upload failed. Status: ' + response.status);
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;

      if (captureInfo.draftTarget) {
        chrome.tabs.query({url: ["*://localhost/*", "*://*.bugos.app/*"]}, (appTabs) => {
          if (appTabs.length > 0) {
            chrome.scripting.executeScript({
              target: {tabId: appTabs[0].id},
              args: [captureInfo.draftTarget, imageUrl],
              func: (targetId, url) => {
                const input = document.getElementById(targetId);
                if (input) {
                  input.value = url;
                  input.dispatchEvent(new Event('input'));
                }
                localStorage.removeItem('bugos_capture_target');
              }
            }, () => {
              statusMsg.className = 'status success';
              statusMsg.textContent = 'Filled successfully! Closing...';
              setTimeout(() => { window.close(); }, 1500);
            });
          } else {
            showError('Could not find BugOS tab to auto-fill.');
            btnSave.disabled = false;
            btnSave.innerHTML = 'Save & Attach';
          }
        });
        return;
      }

      const updatedTc = { ...captureInfo.testCase };
      updatedTc[captureInfo.slot] = imageUrl;
      
      const dateStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      updatedTc.history = [...(updatedTc.history || []), { 
        date: dateStr, 
        event: `Annotated screenshot attached to ${captureInfo.slot} via Extension by ${captureInfo.username}`
      }];

      socket.emit('updateData', {
        type: 'testCase',
        data: updatedTc
      });

      statusMsg.className = 'status success';
      statusMsg.textContent = 'Attached successfully! Closing...';
      
      setTimeout(() => {
        window.close();
      }, 1500);

    } catch (err) {
      showError(err.message);
      btnSave.disabled = false;
      btnSave.innerHTML = 'Save & Attach';
    }
  });
});
