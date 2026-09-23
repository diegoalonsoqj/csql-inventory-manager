import { Router } from 'express';
import {
  listProjects,
  listProjectsSimple,
  createProject,
  toggleProjectActive,
} from '../services/project.service.js';
import {
  validateQuery,
  validateBody,
  projectsQuerySchema,
  createProjectSchema,
} from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Escritura de proyectos: admin y operator. Lectura: cualquier autenticado.
const canManageProjects = requireRole('admin', 'operator');

// Simple list for dropdowns (used by InventoryPage filter)
router.get('/simple', async (req, res) => {
  const data = await listProjectsSimple();
  res.json(data);
});

// Paginated list for ProjectsPage
router.get('/', validateQuery(projectsQuerySchema), async (req, res) => {
  const result = await listProjects(req.validatedQuery);
  res.json(result);
});

router.post('/', canManageProjects, validateBody(createProjectSchema), async (req, res) => {
  const project = await createProject(req.validatedBody);
  res.status(201).json(project);
});

router.patch('/:projectId/toggle', canManageProjects, async (req, res) => {
  const project = await toggleProjectActive(req.params.projectId);
  res.json(project);
});

export default router;
