/**
 * Format access level for display in the UI
 */
export function formatAccessLevel(accessLevel: string): string {
  switch (accessLevel) {
    case 'team_member':
      return 'Team Member';
    case 'manager':
      return 'Manager';
    case 'administrator':
      return 'Administrator';
    default:
      return accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1);
  }
}