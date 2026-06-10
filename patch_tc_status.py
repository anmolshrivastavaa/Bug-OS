import re

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = '''        if (tcBefore) {
          const status = result.result;
          const wasActive = oldStatus === 'Fail' || oldStatus === 'Hold';
          const isActive = status === 'Fail' || status === 'Hold';

          if (isActive && !wasActive) {
            autoCreateBug({ ...tcBefore, status });
          }
          if (!isActive && wasActive) {
            const linked = S.bugs.find(b => bugRefsTestCaseKeys(b, tcBefore.id, tcBefore.module) && (b.status === 'Open' || b.status === 'Retest Failed'));
            if (linked) {
              linked.status = 'Verified';
              linked.history = linked.history || [];
              linked.history.push({ date: now(), event: `Bug auto-closed — automated test passed`, actor: S.auth.user });
              socket.emit('updateData', { type: 'bug', data: linked });
              audit(`Bug ${linked.id} auto-closed (TC ${tcBefore.id} automated pass)`);
            }
          }
        }'''

new_logic = '''        if (tcBefore) {
          const status = result.result;
          const wasActive = oldStatus === 'Fail' || oldStatus === 'Hold';
          const isActive = status === 'Fail' || status === 'Hold';

          // Update test case status globally
          if (tcBefore.status !== status) {
            tcBefore.status = status;
            socket.emit('updateData', { type: 'tc', data: tcBefore });
            audit(`Automated test changed status of TC ${tcBefore.id} to ${status}`);
          }

          if (isActive && !wasActive) {
            autoCreateBug({ ...tcBefore, status });
          }
          if (!isActive && wasActive) {
            const linked = S.bugs.find(b => bugRefsTestCaseKeys(b, tcBefore.id, tcBefore.module) && (b.status === 'Open' || b.status === 'Retest Failed'));
            if (linked) {
              linked.status = 'Verified';
              linked.history = linked.history || [];
              linked.history.push({ date: now(), event: `Bug auto-closed — automated test passed`, actor: S.auth.user });
              socket.emit('updateData', { type: 'bug', data: linked });
              audit(`Bug ${linked.id} auto-closed (TC ${tcBefore.id} automated pass)`);
            }
          }
        }'''

content = content.replace(old_logic, new_logic)

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied!")
