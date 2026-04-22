export function getNodeIcon(type) {
  const icons = {
    radar: '🎯',
    architect: '🏛️',
    writer: '✍️',
    audit_33d: '🔍',
    revise: '🔧',
    current_state: '📍',
    character_matrix: '👥',
    pending_hooks: '🎣',
    world_building: '🌍',
    character: '👤',
    chapter_generation: '📖'
  };
  return icons[type] || '📦';
}

export function getNodeCategory(type) {
  if (['radar', 'architect', 'writer'].includes(type)) return 'agent';
  if (['audit_33d', 'revise'].includes(type)) return 'audit';
  if (['current_state', 'character_matrix', 'pending_hooks'].includes(type)) return 'truth';
  return 'basic';
}