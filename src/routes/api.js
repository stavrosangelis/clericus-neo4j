const express = require('express');
const passport = require('passport');
const auth = require('./auth');
const server = express.Router();

// admin controllers
const articleController = require('../controllers/article.ctrl')
const articleCategoryController = require('../controllers/articleCategory.ctrl')
const authController = require('../controllers/authentication.ctrl')
const cvisionController = require('../controllers/tools/computer-vision.ctrl');
const dashboardController = require('../controllers/dashboard.ctrl')
const entityController = require('../controllers/entity.ctrl');
const eventController = require('../controllers/event.ctrl');
const graphController = require('../controllers/graph.ctrl');
const languageCodesController = require('../controllers/language.codes.ctrl');
const menuController = require('../controllers/menu.ctrl');
const menuItemController = require('../controllers/menuItem.ctrl');
const organisationController = require('../controllers/organisation.ctrl');
const personController = require('../controllers/person.ctrl');
const resourceController = require('../controllers/resource.ctrl');
const referencesController = require('../controllers/references.ctrl');
const seedController = require('../seed/');
const settingsController = require('../controllers/settings.ctrl');
const spatialController = require('../controllers/spatial.ctrl');
const slideshowController = require('../controllers/slideshow.ctrl');
const taxonomyController = require('../controllers/taxonomy.ctrl');
const taxonomyTermController = require('../controllers/taxonomyTerm.ctrl');
const temporalController = require('../controllers/temporal.ctrl');
const toolsParseController = require('../controllers/tools/meta-parse.ctrl');
const toolsIngestionController = require('../controllers/tools/prepare-ingestion.ctrl');
const uploadedFileController = require('../controllers/uploadedFile.ctrl')
const userController = require('../controllers/user.ctrl');
const usergroupController = require('../controllers/usergroup.ctrl');

// ui constrollers
const analyticsController = require('../controllers/ui/analytics.ctrl');
const classpiecesController = require('../controllers/ui/classpieces.ctrl');
const contentController = require('../controllers/ui/content.ctrl');

// ******* ui endpoints ******** //
server.get('/generic-stats', analyticsController.genericStats);
server.get('/classpieces', classpiecesController.getClasspieces);
server.post('/classpieces-active-filters', classpiecesController.getClasspiecesActiveFilters);
server.get('/classpiece', classpiecesController.getClasspiece);

// ******* ui content ******** //
server.get('/content-articles', contentController.getArticles);
server.get('/content-article', contentController.getArticle);
server.get('/content-category', contentController.getArticleCategory);

/**
* @apiDefine admin This endpoint is only available to users with administrator priviledges
*/
// ******* admin endpoints ******** //
// authentication
passport.use('local', authController.passportLocal);
//server.post('/login', authController.loginUser);
server.post('/admin-login', authController.loginAdmin);
server.post('/admin-session', auth.checkAdminToken, authController.activeSession);
//server.post('/register', authController.registerUser);

// article
server.put('/article', auth.checkAdminToken, articleController.putArticle);
server.get('/article', articleController.getArticle);
server.get('/articles', articleController.getArticles);
server.get('/articles-list', articleController.getArticlesList);
server.delete('/article', auth.checkAdminToken, articleController.deleteArticle);

// article categories
server.put('/article-category', auth.checkAdminToken, articleCategoryController.putArticleCategory);
server.get('/article-category', articleCategoryController.getArticleCategory);
server.get('/article-categories', articleCategoryController.getArticleCategories);
server.delete('/article-category', auth.checkAdminToken, articleCategoryController.deleteArticleCategory);

// dashboard
server.get('/dashboard', auth.checkAdminToken, dashboardController.dashboardStats);
server.get('/monthly-stats', auth.checkAdminToken, dashboardController.getMonthlyStats);

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
server.delete('/events', auth.checkAdminToken, eventController.deleteEvents);

//graph
server.get('/graph', graphController.getGraphData);
server.get('/related-nodes', graphController.getRelatedNodes);

// languageCodes
server.get('/language-codes', languageCodesController.getLanguageCodes);

// menu
server.put('/menu', auth.checkAdminToken, menuController.putMenu);
server.get('/menu', menuController.getMenu);
server.get('/menus', auth.checkAdminToken, menuController.getMenus);
server.delete('/menu', auth.checkAdminToken, menuController.deleteMenu);

// menu item
server.put('/menu-item', auth.checkAdminToken, menuItemController.putMenuItem);
server.get('/menu-item', auth.checkAdminToken, menuItemController.getMenuItem);
server.get('/menu-items', auth.checkAdminToken, menuItemController.getMenuItems);
server.delete('/menu-item', auth.checkAdminToken, menuItemController.deleteMenuItem);

// person
server.put('/person', auth.checkAdminToken, personController.putPerson);
server.get('/person', personController.getPerson);
server.get('/people', personController.getPeople);
server.delete('/person', auth.checkAdminToken, personController.deletePerson);
server.delete('/people', auth.checkAdminToken, personController.deletePeople);

// resources
server.put('/resource', auth.checkAdminToken, resourceController.putResource);
server.post('/upload-resource', auth.checkAdminToken, resourceController.uploadResource);
server.get('/resource',  resourceController.getResource);
server.get('/resources', resourceController.getResources);
server.delete('/resource', auth.checkAdminToken, resourceController.deleteResource);
server.delete('/resources', auth.checkAdminToken, resourceController.deleteResources);

// organisations
server.put('/organisation', auth.checkAdminToken, organisationController.putOrganisation);
server.get('/organisation', organisationController.getOrganisation);
server.get('/organisations', organisationController.getOrganisations);
server.delete('/organisation', auth.checkAdminToken, organisationController.deleteOrganisation);
server.delete('/organisations', auth.checkAdminToken, organisationController.deleteOrganisations);

// references
server.get('/references', auth.checkAdminToken, referencesController.getReferences);
server.put('/reference', auth.checkAdminToken, referencesController.putReference);
server.put('/references', auth.checkAdminToken, referencesController.putReferences);
server.delete('/reference', auth.checkAdminToken, referencesController.deleteReference);

// slideshow
server.put('/slideshow-item', auth.checkAdminToken, slideshowController.putSlideshowItem);
server.get('/slideshow-item', slideshowController.getSlideshowItem);
server.get('/slideshow-items', slideshowController.getSlideshowItems);
server.delete('/slideshow-item', auth.checkAdminToken, slideshowController.deleteSlideshowItem);

// spatial
server.put('/spatial', auth.checkAdminToken, spatialController.putSpatial);
server.get('/spatial', spatialController.getSpatial);
server.get('/spatials', spatialController.getSpatials);
server.delete('/spatial', auth.checkAdminToken, spatialController.deleteSpatial);

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

// temporal
server.put('/temporal', auth.checkAdminToken, temporalController.putTemporal);
server.get('/temporal', temporalController.getTemporal);
server.get('/temporals', temporalController.getTemporals);
server.delete('/temporal', auth.checkAdminToken, temporalController.deleteTemporal);

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

// uploaded file
server.post('/upload-file', auth.checkAdminToken, uploadedFileController.postUploadedFile);
server.get('/uploaded-file', uploadedFileController.getUploadedFile);
server.get('/uploaded-files', uploadedFileController.getUploadedFiles);
server.delete('/uploaded-file', auth.checkAdminToken, uploadedFileController.deleteUploadedFile);

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
