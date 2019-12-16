const express = require('express');
const passport = require('passport');
const auth = require('./auth');
const server = express.Router();

// admin controllers
const authController = require('../controllers/authentication.ctrl')
const cvisionController = require('../controllers/tools/computer-vision.ctrl');
const dashboardController = require('../controllers/dashboard.ctrl')
const entityController = require('../controllers/entity.ctrl');
const eventController = require('../controllers/event.ctrl');
const graphController = require('../controllers/graph.ctrl');
const languageCodesController = require('../controllers/language.codes.ctrl');
const organisationController = require('../controllers/organisation.ctrl');
const personController = require('../controllers/person.ctrl');
const resourceController = require('../controllers/resource.ctrl');
const referencesController = require('../controllers/references.ctrl');
const seedController = require('../seed/');
const settingsController = require('../controllers/settings.ctrl');
const taxonomyController = require('../controllers/taxonomy.ctrl');
const taxonomyTermController = require('../controllers/taxonomyTerm.ctrl');
const toolsParseController = require('../controllers/tools/meta-parse.ctrl');
const toolsIngestionController = require('../controllers/tools/prepare-ingestion.ctrl');
const userController = require('../controllers/user.ctrl');
const usergroupController = require('../controllers/usergroup.ctrl');

// ui constrollers
const analyticsController = require('../controllers/ui/analytics.ctrl')
const classpiecesController = require('../controllers/ui/classpieces.ctrl')

// ******* ui endpoints ******** //
server.get('/generic-stats', analyticsController.genericStats);
server.get('/classpieces', classpiecesController.getClasspieces);
server.get('/classpiece', classpiecesController.getClasspiece);


// ******* admin endpoints ******** //
// authentication
passport.use('local', authController.passportLocal);
server.post('/login', authController.loginUser);
server.post('/admin-login', authController.loginAdmin);
server.post('/admin-session', auth.checkAdminToken, authController.activeSession);
server.post('/register', authController.registerUser);

// dashboard
server.get('/dashboard', auth.checkAdminToken, dashboardController.dashboardStats);

// entity
server.put('/entity', auth.checkAdminToken, entityController.putEntity);
server.get('/entity', entityController.getEntity);
server.get('/entities', entityController.getEntities);
server.delete('/entity', auth.checkAdminToken, entityController.deleteEntity);

// events
server.put('/event', auth.checkAdminToken, eventController.putEvent);
server.get('/event', eventController.getEvent);
server.get('/events', eventController.getEvents);
server.delete('/event', auth.checkAdminToken, eventController.deleteEvent);

//graph
server.get('/graph', graphController.getGraphData);
server.get('/related-nodes', graphController.getRelatedNodes);

// languageCodes
server.get('/language-codes', languageCodesController.getLanguageCodes);

// person
server.put('/person', auth.checkAdminToken, personController.putPerson);
server.get('/person', personController.getPerson);
server.get('/people', personController.getPeople);
server.delete('/person', auth.checkAdminToken, personController.deletePerson);

// resources
server.put('/resource', auth.checkAdminToken, resourceController.putResource);
server.post('/upload-resource', auth.checkAdminToken, resourceController.uploadResource);
server.get('/resource', auth.checkAdminToken, resourceController.getResource);
server.get('/resources', resourceController.getResources);
server.delete('/resource', auth.checkAdminToken, resourceController.deleteResource);

// organisations
server.put('/organisation', auth.checkAdminToken, organisationController.putOrganisation);
server.get('/organisation', organisationController.getOrganisation);
server.get('/organisations', organisationController.getOrganisations);
server.delete('/organisation', auth.checkAdminToken, organisationController.deleteOrganisation);

// references
server.get('/references', auth.checkAdminToken, referencesController.getReferences);
server.put('/reference', auth.checkAdminToken, referencesController.putReference);
server.put('/references', auth.checkAdminToken, referencesController.putReferences);
server.delete('/reference', auth.checkAdminToken, referencesController.deleteReference);

// taxonomies
server.put('/taxonomy', auth.checkAdminToken, taxonomyController.putTaxonomy);
server.get('/taxonomy', taxonomyController.getTaxonomy);
server.get('/taxonomies', taxonomyController.getTaxonomies);
server.delete('/taxonomy', auth.checkAdminToken, taxonomyController.deleteTaxonomy);

// taxonomyTerms
server.put('/taxonomy-term', auth.checkAdminToken, taxonomyTermController.putTaxonomyTerm);
server.get('/taxonomy-term', taxonomyTermController.getTaxonomyTerm);
server.get('/taxonomy-terms', taxonomyTermController.getTaxonomyTerms);
server.delete('/taxonomy-term', auth.checkAdminToken, taxonomyTermController.deleteTaxonomyTerm);

// tools
server.get('/list-class-pieces', auth.checkAdminToken, toolsParseController.listClassPieces);
server.get('/list-class-piece', auth.checkAdminToken, toolsParseController.listClassPiece);
server.get('/meta-parse-class-piece', auth.checkAdminToken, toolsParseController.metaParseClassPiece);
server.post('/update-class-piece-faces', auth.checkAdminToken, toolsParseController.updateClassPieceFaces);
server.get('/prepare-classpiece-ingestion', auth.checkAdminToken, toolsIngestionController.preIngestionReportClassPiece);
server.put('/prepare-classpiece-identify-duplicates', auth.checkAdminToken, toolsIngestionController.classPieceIdentifyDuplicates);
server.put('/ingest-classpiece', auth.checkAdminToken, toolsIngestionController.ingestClasspiece);
server.get('/parse-class-piece', auth.checkAdminToken, cvisionController.parseClassPiece);
server.get('/create-thumbnails', auth.checkAdminToken, toolsParseController.createThumbnails);
server.post('/query-texts', auth.checkAdminToken, toolsParseController.queryTexts);

// users
server.get('/users', auth.checkAdminToken, userController.getUsers);
server.get('/user', auth.checkAdminToken, userController.getUser);
server.put('/user', auth.checkAdminToken, userController.putUser);
server.post('/user-password', auth.checkAdminToken, userController.updateUserPassword);
server.delete('/user', auth.checkAdminToken, userController.deleteUser);

// usergroups
server.get('/user-groups', auth.checkAdminToken, usergroupController.getUsergroups);
server.get('/user-group', auth.checkAdminToken, usergroupController.getUsergroup);
server.put('/user-group', auth.checkAdminToken, usergroupController.putUsergroup);
server.delete('/user-group', auth.checkAdminToken, usergroupController.deleteUsergroup);

// seed
server.post('/seed-db', seedController.seedData);

// settings
server.get('/settings', settingsController.getSettings);

module.exports = server;
