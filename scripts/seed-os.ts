// By Red OS Seed Script
// Seeds tenants, projects, boards, and phases for initial migration
import { createAdminClient } from '../lib/supabase/admin';

// OS tables are not yet in generated types — any cast is intentional here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createAdminClient() as any;

const TENANT_NAME = 'By Red LLC';
const PROJECTS = [
  'HireWire',
  'By Red OfficeSpace',
  'RedLantern Studios Daily',
  'Paradise Property Services',
  'Authentic Hadith App Store Launch',
  'Beauty By Red Operations',
  'Clarity',
  'AdsEngine',
  'Daily OS Communication Layer',
  'By Red Team Pulse',
];
const HIREWIRE_PHASES = [
  'Phase 1 Foundation Reset',
  'Phase 2 Landing and Dashboard',
  'Phase 3 Onboarding Completion',
  'Phase 4 Job Flow Completion',
  'Phase 5 Billing and Launch',
  'Phase 6 Deferred',
];
const DEFAULT_PHASES = [
  'Backlog',
  'Active',
  'Blocked',
  'Done',
  'Deferred',
];

async function main() {
  // 1. Ensure tenant exists
  let { data: tenant, error: tenantErr } = await supabase
    .from('byred_tenants')
    .select('*')
    .eq('name', TENANT_NAME)
    .single();
  if (!tenant) {
    const { data, error } = await supabase
      .from('byred_tenants')
      .insert({ name: TENANT_NAME, type: 'organization', color: '#037f4c' })
      .select()
      .single();
    if (error) throw error;
    tenant = data;
  }
  const tenant_id = tenant.id;

  // 2. Create projects and boards
  for (const projectName of PROJECTS) {
    // Create project
    let { data: project, error: projectErr } = await supabase
      .from('os_projects')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('name', projectName)
      .single();
    if (!project) {
      const { data, error } = await supabase
        .from('os_projects')
        .insert({ tenant_id, name: projectName })
        .select()
        .single();
      if (error) throw error;
      project = data;
    }
    const project_id = project.id;

    // Create board
    const boardName = projectName.includes('HireWire') ? 'HireWire Execution Board' : `${projectName} Execution Board`;
    let { data: board, error: boardErr } = await supabase
      .from('os_boards')
      .select('*')
      .eq('project_id', project_id)
      .eq('name', boardName)
      .single();
    if (!board) {
      const { data, error } = await supabase
        .from('os_boards')
        .insert({ project_id, name: boardName })
        .select()
        .single();
      if (error) throw error;
      board = data;
    }
    const board_id = board.id;

    // Create phases
    const phases = projectName.includes('HireWire') ? HIREWIRE_PHASES : DEFAULT_PHASES;
    for (let i = 0; i < phases.length; i++) {
      const phaseName = phases[i];
      let { data: phase, error: phaseErr } = await supabase
        .from('os_phases')
        .select('*')
        .eq('board_id', board_id)
        .eq('name', phaseName)
        .single();
      if (!phase) {
        const { error } = await supabase
          .from('os_phases')
          .insert({ board_id, name: phaseName, order_index: i });
        if (error) throw error;
      }
    }
  }

  // 3. Create migration safety defaults
  // Default Project
  let { data: legacyProject } = await supabase
    .from('os_projects')
    .select('*')
    .eq('tenant_id', tenant_id)
    .eq('name', 'Legacy Imported Work')
    .single();
  if (!legacyProject) {
    const { data, error } = await supabase
      .from('os_projects')
      .insert({ tenant_id, name: 'Legacy Imported Work' })
      .select()
      .single();
    if (error) throw error;
    legacyProject = data;
  }
  const legacy_project_id = legacyProject.id;

  // Default Board
  let { data: legacyBoard } = await supabase
    .from('os_boards')
    .select('*')
    .eq('project_id', legacy_project_id)
    .eq('name', 'Legacy Task Board')
    .single();
  if (!legacyBoard) {
    const { data, error } = await supabase
      .from('os_boards')
      .insert({ project_id: legacy_project_id, name: 'Legacy Task Board' })
      .select()
      .single();
    if (error) throw error;
    legacyBoard = data;
  }
  const legacy_board_id = legacyBoard.id;

  // Default Phase
  let { data: legacyPhase } = await supabase
    .from('os_phases')
    .select('*')
    .eq('board_id', legacy_board_id)
    .eq('name', 'Backlog')
    .single();
  if (!legacyPhase) {
    const { error } = await supabase
      .from('os_phases')
      .insert({ board_id: legacy_board_id, name: 'Backlog', order_index: 0 });
    if (error) throw error;
  }

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
