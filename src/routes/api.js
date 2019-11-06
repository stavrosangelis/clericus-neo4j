const express = require('express');
const passport = require('passport');
const auth = require('./auth');
const server = express.Router();

// import constrollers
const authController = require('../controllers/authentication.ctrl')
const dashboardController = require('../controllers/dashboard.ctrl')
const entityController = require('../controllers/entity.ctrl');
const eventController = require('../controllers/event.ctrl');
const taxonomyController = require('../controllers/taxonomy.ctrl');
const personController = require('../controllers/person.ctrl');
const resourceController = require('../controllers/resource.ctrl');
const organisationController = require('../controllers/organisation.ctrl');
const taxonomyTermController = require('../controllers/taxonomyTerm.ctrl');
const referencesController = require('../controllers/references.ctrl');
const seedController = require('../seed/');

// authentication
passport.use('local', authController.passportLocal);
server.post('/login', authController.loginUser);
server.post('/admin-login', authController.loginAdmin);
server.post('/admin-session', auth.checkAdminToken, authController.activeSession);
server.post('/register', authController.registerUser);

// dashboard
server.get('/dashboard', auth.checkAdminToken, dashboardController.dashboardStats);

// entity
server.put('/entity', entityController.putEntity);
server.get('/entity', entityController.getEntity);
server.get('/entities', entityController.getEntities);
server.delete('/entity', entityController.deleteEntity);

// events
server.put('/event', eventController.putEvent);
server.get('/event', eventController.getEvent);
server.get('/events', eventController.getEvents);
server.delete('/event', eventController.deleteEvent);

// person
server.put('/person', personController.putPerson);
server.get('/person', personController.getPerson);
server.get('/people', personController.getPeople);
server.delete('/person', personController.deletePerson);

// resources
server.put('/resource', resourceController.putResource);
server.post('/upload-resource', resourceController.uploadResource);
server.get('/resource', resourceController.getResource);
server.get('/resources', resourceController.getResources);
server.delete('/resource', resourceController.deleteResource);

// organisations
server.put('/organisation', organisationController.putOrganisation);
server.get('/organisation', organisationController.getOrganisation);
server.get('/organisations', organisationController.getOrganisations);
server.delete('/organisation', organisationController.deleteOrganisation);

// references
server.put('/reference', referencesController.putReference);
server.delete('/reference', referencesController.deleteReference);

// taxonomies
server.put('/taxonomy', taxonomyController.putTaxonomy);
server.get('/taxonomy', taxonomyController.getTaxonomy);
server.get('/taxonomies', taxonomyController.getTaxonomies);
server.delete('/taxonomy', taxonomyController.deleteTaxonomy);

// taxonomyTerms
server.put('/taxonomy-term', taxonomyTermController.putTaxonomyTerm);
server.get('/taxonomy-term', taxonomyTermController.getTaxonomyTerm);
server.get('/taxonomy-terms', taxonomyTermController.getTaxonomyTerms);
server.delete('/taxonomy-term', taxonomyTermController.deleteTaxonomyTerm);


// seed
server.get('/seed-db', seedController.seedData);

module.exports = server;
