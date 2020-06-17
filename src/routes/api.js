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
const toolsDiocesesLocationsController = require('../controllers/tools/dioceses-locations.ctrl');
const uploadedFileController = require('../controllers/uploadedFile.ctrl')
const userController = require('../controllers/user.ctrl');
const usergroupController = require('../controllers/usergroup.ctrl');

// ui constrollers
const analyticsController = require('../controllers/ui/analytics.ctrl');
const carouselController = require('../controllers/ui/carousel.ctrl');
const classpiecesController = require('../controllers/ui/classpieces.ctrl');
const contentController = require('../controllers/ui/content.ctrl');
const eventsUiController = require('../controllers/ui/events.ctrl');
const organisationsUiController = require('../controllers/ui/organisations.ctrl');
const peopleController = require('../controllers/ui/people.ctrl');
const searchController = require('../controllers/ui/search.ctrl');
const uiMenuController = require('../controllers/ui/menu.ctrl');
const visualisationsController = require('../controllers/ui/visualisations.ctrl');

// ******* ui endpoints ******** //
server.get('/generic-stats', analyticsController.genericStats);

// ******* ui carousel ******** //
server.get('/carousel', carouselController.getCarousel);

// ******* ui classpieces ******** //
server.get('/classpieces', classpiecesController.getClasspieces);
server.get('/classpieces-active-filters', classpiecesController.getClasspiecesActiveFilters);
server.get('/classpiece', classpiecesController.getClasspiece);

// ******* ui content ******** //
server.get('/content-articles', contentController.getArticles);
server.get('/content-article', contentController.getArticle);
server.get('/content-category', contentController.getArticleCategory);
server.get('/ui-highlights', contentController.getHighlights);

// ******* ui events ******** //
server.get('/ui-events', eventsUiController.getEvents);
server.get('/ui-event', eventsUiController.getEvent);
server.post('/ui-events-active-filters', eventsUiController.getEventsActiveFilters);

// ******* ui menu ******** //
server.get('/ui-menu', uiMenuController.getMenu);

// ******* ui organisations ******** //
server.get('/ui-organisations', organisationsUiController.getOrganisations);
server.get('/ui-organisation', organisationsUiController.getOrganisation);
server.post('/ui-organisations-active-filters', organisationsUiController.getOrganisationsActiveFilters);

// ******* ui people  ******** //
server.get('/ui-people', peopleController.getPeople);
server.get('/ui-person', peopleController.getPerson);
server.get('/ui-person-active-filters', peopleController.getPersonActiveFilters);

// ******* ui search ******** //
server.post('/search', searchController.search);

// ******* ui visualisations ******** //
server.get('/timeline', visualisationsController.getTimeline);
server.get('/item-timeline', visualisationsController.getItemTimeline);
server.get('/heatmap', visualisationsController.getHeatmap);
server.get('/graph-network', visualisationsController.getGraphNetwork);
server.get('/item-network', visualisationsController.getItemNetwork);
server.get('/item-network-related-nodes', visualisationsController.getRelatedNodes);
server.get('/item-network-related-paths', visualisationsController.getRelatedPaths);


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
server.get('/article', auth.checkAdminToken, articleController.getArticle);
server.get('/articles', auth.checkAdminToken, articleController.getArticles);
server.get('/articles-list', auth.checkAdminToken, articleController.getArticlesList);
server.delete('/article', auth.checkAdminToken, articleController.deleteArticle);
server.get('/highlights', auth.checkAdminToken, articleController.getHighlights);
server.put('/highlights', auth.checkAdminToken, articleController.updateHighlights);
server.put('/highlight', auth.checkAdminToken, articleController.addHighlight);
server.delete('/highlight', auth.checkAdminToken, articleController.removeHighlight);

// article categories
server.put('/article-category', auth.checkAdminToken, articleCategoryController.putArticleCategory);
server.get('/article-category', auth.checkAdminToken, articleCategoryController.getArticleCategory);
server.get('/article-categories', auth.checkAdminToken, articleCategoryController.getArticleCategories);
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
server.get('/event', auth.checkAdminToken, eventController.getEvent);
server.get('/events', auth.checkAdminToken, eventController.getEvents);
server.delete('/event', auth.checkAdminToken, eventController.deleteEvent);
server.delete('/events', auth.checkAdminToken, eventController.deleteEvents);
server.post('/event-update-status', auth.checkAdminToken, eventController.updateStatus);

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
server.post('/person-update-status', auth.checkAdminToken, personController.updateStatus);
//server.get('/patch-unknown', auth.checkAdminToken, personController.patchUnknown);

// resources
server.put('/resource', auth.checkAdminToken, resourceController.putResource);
server.post('/upload-resource', auth.checkAdminToken, resourceController.uploadResource);
server.get('/resource',  resourceController.getResource);
server.get('/resources', resourceController.getResources);
server.delete('/resource', auth.checkAdminToken, resourceController.deleteResource);
server.delete('/delete-classpiece', auth.checkAdminToken, resourceController.deleteClasspiece);
server.delete('/resources', auth.checkAdminToken, resourceController.deleteResources);
server.put('/update-annotation-image', auth.checkAdminToken, resourceController.updateAnnotationImage);
server.post('/resource-update-status', auth.checkAdminToken, resourceController.updateStatus);

// organisations
server.put('/organisation', auth.checkAdminToken, organisationController.putOrganisation);
server.get('/organisation', auth.checkAdminToken, organisationController.getOrganisation);
server.get('/organisations', auth.checkAdminToken, organisationController.getOrganisations);
server.delete('/organisation', auth.checkAdminToken, organisationController.deleteOrganisation);
server.delete('/organisations', auth.checkAdminToken, organisationController.deleteOrganisations);
server.post('/organisation-update-status', auth.checkAdminToken, organisationController.updateStatus);

// references
server.get('/references', auth.checkAdminToken, referencesController.getReferences);
server.put('/reference', auth.checkAdminToken, referencesController.putReference);
server.put('/references', auth.checkAdminToken, referencesController.putReferences);
server.delete('/reference', auth.checkAdminToken, referencesController.deleteReference);

// slideshow
server.put('/slideshow-item', auth.checkAdminToken, slideshowController.putSlideshowItem);
server.get('/slideshow-item', auth.checkAdminToken, slideshowController.getSlideshowItem);
server.get('/slideshow-items', auth.checkAdminToken, slideshowController.getSlideshowItems);
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
server.get('/patch-rotate', auth.checkAdminToken, toolsIngestionController.patchRotate);
server.get('/parse-class-piece', auth.checkAdminToken, cvisionController.parseClassPiece);
server.get('/create-thumbnails', auth.checkAdminToken, toolsParseController.createThumbnails);
server.post('/query-texts', auth.checkAdminToken, toolsParseController.queryTexts);
server.get('/prepare-dioceses-data', auth.checkAdminToken, toolsDiocesesLocationsController.prepareData);
server.get('/dioceses-allocate-locations', auth.checkAdminToken, toolsDiocesesLocationsController.allocateLocations);
server.get('/ocr-document', auth.checkAdminToken, cvisionController.analyseDocument);
server.get('/read-document', auth.checkAdminToken, cvisionController.readDocumentResults);
server.get('/get-document-columns', cvisionController.getColumns);
server.post('/update-document-columns', cvisionController.updateColumns);
server.get('/prepare-hamell-ingestion', auth.checkAdminToken, cvisionController.prepareForIngestion);
server.get('/after-hamell-ingestion', auth.checkAdminToken, cvisionController.afterIngestion);

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
