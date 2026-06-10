import re

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const scriptObj = S.automationScripts.find(s => s.testCaseId == tc.id && s.module === tc.module);\n        const hasScript = !!scriptObj;', 'const scriptObj = S.automationScripts.find(s => s.testCaseId == tc.id && s.module === tc.module);')

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
