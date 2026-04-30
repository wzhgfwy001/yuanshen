import os

os.chdir('C:/Users/DELL/.openclaw/workspace/storyflow/web/assets')
with open('index-DBUehojj.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# The old xE function content (abbreviated) - we need to find the exact boundary
# The properties panel shows inputs only for: radar, architect, writer, audit_33d
# We need to add: world_building, character, chapter_generation + generic inputs

# Find the position AFTER "e.data.type==="audit_33d"&&..." block
# and BEFORE "t==="storyflow"&&..." block

search_old = 'e.data.type==="audit_33d"&&O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Strict Mode"}),O.jsxs("select",{className:"prop-input",onChange:s=>o("strict_mode",s.target.value==="true"),children:[O.jsx("option",{value:"true",children:"Enabled"}),O.jsx("option",{value:"false",children:"Disabled"})]})]})'

idx = content.find(search_old)
if idx < 0:
    print('Could not find the exact pattern!')
    print('Searching for audit_33d...')
    idx2 = content.find('audit_33d')
    print(f'audit_33d found at {idx2}')
else:
    print(f'Found audit_33d block at {idx}')
    
    # Find the end of this block
    # The pattern ends with ]})]}), which is the closing of the audit_33d block
    # After that comes the loop config section
    
    # Find the closing ]})]}), of audit_33d section
    search_end = ']})]}),t==="storyflow"'
    idx_end = content.find(search_end, idx)
    if idx_end >= 0:
        print(f'Found end of audit_33d block at {idx_end}')
        
        # The new section to insert AFTER audit_33d block and BEFORE loop config
        new_sections = ',e.data.type==="world_building"&&O.jsxs(O.Fragment,{children:[O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Topic (主题)"}),O.jsx("input",{className:"prop-input",placeholder:"e.g., 星际探险, 古代修仙",onChange:s=>o("topic",s.target.value)})]}),O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Setting (设定)"}),O.jsx("input",{className:"prop-input",placeholder:"e.g., 未来宇宙, 中世纪欧洲",onChange:s=>o("setting",s.target.value)})]})]}),e.data.type==="character"&&O.jsxs(O.Fragment,{children:[O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Character Name (角色名)"}),O.jsx("input",{className:"prop-input",placeholder:"e.g., 李云",onChange:s=>o("character_name",s.target.value)})]}),O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Role (角色定位)"}),O.jsxs("select",{className:"prop-input",onChange:s=>o("role",s.target.value),children:[O.jsx("option",{value:"protagonist",children:"主角"}),O.jsx("option",{value:"supporting",children:"配角"}),O.jsx("option",{value:"antagonist",children:"反派"}),O.jsx("option",{value:"minor",children:"路人"})]})]}),O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Background (背景)"}),O.jsx("input",{className:"prop-input",placeholder:"角色背景描述...",onChange:s=>o("background",s.target.value)})]})]}),e.data.type==="chapter_generation"&&O.jsxs(O.Fragment,{children:[O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Chapter Number (章节号)"}),O.jsx("input",{className:"prop-input",type:"number",defaultValue:1,onChange:s=>o("chapter_number",parseInt(s.target.value))})]}),O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Target Words (目标字数)"}),O.jsx("input",{className:"prop-input",type:"number",defaultValue:3e3,onChange:s=>o("target_words",parseInt(s.target.value))})]}),O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Chapter Title (章节标题)"}),O.jsx("input",{className:"prop-input",placeholder:"章节标题...",onChange:s=>o("chapter_title",s.target.value)})]})]})'
        
        # Also add a GENERIC inputs section at the end for all nodes
        generic_inputs = ',O.jsxs("div",{className:"prop-group",children:[O.jsx("div",{className:"prop-label",children:"Node Inputs (节点输入)"}),O.jsx("textarea",{className:"prop-input",style:{minHeight:80,resize:"vertical",fontSize:11},placeholder:"JSON格式的输入参数...",value:JSON.stringify(e.data.inputs||{}),onChange:s=>{try{const inputs=JSON.parse(s.target.value);o("inputs",inputs)}catch(err){rr("Invalid JSON: "+err.message,"error")}}}])'
        
        # Insert the new sections
        insert_pos = idx_end + len(']})]}),')
        new_content = content[:insert_pos] + new_sections + generic_inputs + content[insert_pos:]
        
        with open('index-DBUehojj.js', 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print('SUCCESS: Added input fields for world_building, character, chapter_generation + generic inputs section')
    else:
        print('Could not find end of audit_33d block')