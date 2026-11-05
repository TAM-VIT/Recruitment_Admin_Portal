import { Router } from 'express';
import {
  setupAdminAccount,
  loginAdmin,
  getAllApplicants,
  getApplicantById,
  updateApplicantReview,
  createInterviewSlots,
  updateInterviewSlot,
  deleteSlot,
  getMySchedule,
  getDomainHeads,
  assignDomainHead,
  createSubsection,
  updateSubsection,
  deleteSubsection,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getDomainForm,
  getRound1Summary,
  getRound1Templates,
  sendRound1Emails,
  getRound2Summary,
  sendRound2Emails,
  getRecruitmentSettings,
  updateRecruitmentSettings,
} from '../controllers/adminController';
import { authorizeRole, limitLoginAttempts, verifyToken } from '../middleware/authMiddleware';

const router = Router();

// Public Auth Routes
router.post('/setup', limitLoginAttempts, setupAdminAccount);
router.post('/login', limitLoginAttempts, loginAdmin);

// Protect all routes below with verifyToken
router.use(verifyToken);

// Domain Heads & Root Admins can view, evaluate, and batch-release candidates
router.get('/applicants', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), getAllApplicants);
router.get('/applicants/:id', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), getApplicantById);
router.put('/applicants/:applicationId/review', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), updateApplicantReview);

// Domain Heads create their slots, update slots, delete slots, and view their schedules
router.post('/slots', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), createInterviewSlots);
router.patch('/slots/:id', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), updateInterviewSlot);
router.delete('/slots/:id', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), deleteSlot);
router.get('/schedule/:adminId', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), getMySchedule);

// Domain Heads build, view, edit, and delete their domain's application form questions & subsections
router.get('/form', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), getDomainForm);
router.post('/form/subsection', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), createSubsection);
router.put('/form/subsection/:id', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), updateSubsection);
router.delete('/form/subsection/:id', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), deleteSubsection);

router.post('/form/question', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), createQuestion);
router.put('/form/question/:id', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), updateQuestion);
router.delete('/form/question/:id', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), deleteQuestion);

// Round 1 Decisions & Email Workflow
router.get('/round1/summary', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), getRound1Summary);
router.get('/round1/templates', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), getRound1Templates);
router.post('/round1/send', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), sendRound1Emails);

// Round 2 (after the interview): Selected / Not selected lists and their emails
router.get('/round2/summary', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), getRound2Summary);
router.post('/round2/send', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), sendRound2Emails);

// Recruitment settings (open/closed, form deadline): everyone can view, only the Root Admin can change
router.get('/settings', authorizeRole(['DOMAIN_HEAD', 'ROOT_ADMIN']), getRecruitmentSettings);
router.put('/settings', authorizeRole(['ROOT_ADMIN']), updateRecruitmentSettings);

// Only the Root Admin can view and assign Domain Heads
router.get('/domain-heads', authorizeRole(['ROOT_ADMIN']), getDomainHeads);
router.post('/domain-heads', authorizeRole(['ROOT_ADMIN']), assignDomainHead);

export default router;
