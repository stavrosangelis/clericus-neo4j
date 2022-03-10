define({ "api": [
  {
    "type": "get",
    "url": "/generic-stats",
    "title": "Generic statistics",
    "name": "generic-stats",
    "group": "Analytics",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"people\":220,\"resources\":220,\"organisations\":80,\"events\":0},\"error\":false,\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/analytics.ctrl.js",
    "groupTitle": "Analytics"
  },
  {
    "type": "get",
    "url": "/article-categories",
    "title": "Get article categories",
    "name": "get_article_categories",
    "group": "Article_Categories",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"data\":[{\"createdAt\":\"2020-01-27T15:55:23.499Z\",\"templatePosition\":\"\",\"label\":\"Top Article\",\"_id\":\"2822\",\"updatedAt\":\"2020-01-27T17:55:15.742Z\",\"systemLabels\":[\"Article\"]},{\"createdAt\":\"2020-01-27T17:43:44.578Z\",\"label\":\"Bottom Article\",\"templatePosition\":\"bottom\",\"updatedAt\":\"2020-01-27T17:43:44.578Z\",\"_id\":\"2683\",\"systemLabels\":[\"Article\"]}]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/articleCategory.ctrl.js",
    "groupTitle": "Article_Categories"
  },
  {
    "type": "get",
    "url": "/article-category",
    "title": "Get article category",
    "name": "get_article_category",
    "group": "Article_Categories",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested article.category</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/articleCategory.ctrl.js",
    "groupTitle": "Article_Categories"
  },
  {
    "type": "delete",
    "url": "/article-category",
    "title": "Delete article category",
    "name": "delete_article_category",
    "group": "Articles_Categories",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the article for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Article) WHERE id(n)=2880 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":3,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/articleCategory.ctrl.js",
    "groupTitle": "Articles_Categories"
  },
  {
    "type": "put",
    "url": "/article-category",
    "title": "Put article category",
    "name": "put_article_category",
    "group": "Articles_Categories",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the article category. This should be undefined|null|blank in the creation of a new article category.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The article category's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "parentId",
            "description": "<p>The article category's parentId.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "status",
            "description": "<p>The article category's status.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\"createdAt\":\"2020-01-27T15:55:23.499Z\",\"templatePosition\":\"\",\"label\":\"Top Article\",\"_id\":\"2822\",\"updatedAt\":\"2020-01-27T17:55:15.742Z\"}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"createdAt\":\"2020-01-30T14:56:30.780Z\",\"updatedBy\":\"437\",\"createdBy\":\"437\",\"label\":\"test\",\"_id\":\"2880\",\"category\":0,\"content\":\"<p>test content</p>\",\"status\":\"private\",\"teaser\":\"<p>test teaser</p>\",\"updatedAt\":\"2020-01-30T15:00:44.721Z\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/articleCategory.ctrl.js",
    "groupTitle": "Articles_Categories"
  },
  {
    "type": "delete",
    "url": "/article",
    "title": "Delete article",
    "name": "delete_article",
    "group": "Articles",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the article for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Article) WHERE id(n)=2880 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":3,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/article.ctrl.js",
    "groupTitle": "Articles"
  },
  {
    "type": "get",
    "url": "/article",
    "title": "Get article",
    "name": "get_article",
    "group": "Articles",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the requested article.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "permalink",
            "description": "<p>The permalink of the requested article.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/article.ctrl.js",
    "groupTitle": "Articles"
  },
  {
    "type": "get",
    "url": "/articles",
    "title": "Get articles",
    "name": "get_articles",
    "group": "Articles",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"data\":[{\"createdAt\":\"2020-01-27T15:55:23.499Z\",\"templatePosition\":\"\",\"label\":\"Top Article\",\"_id\":\"2822\",\"updatedAt\":\"2020-01-27T17:55:15.742Z\",\"systemLabels\":[\"Article\"]},{\"createdAt\":\"2020-01-27T17:43:44.578Z\",\"label\":\"Bottom Article\",\"templatePosition\":\"bottom\",\"updatedAt\":\"2020-01-27T17:43:44.578Z\",\"_id\":\"2683\",\"systemLabels\":[\"Article\"]}]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/article.ctrl.js",
    "groupTitle": "Articles"
  },
  {
    "type": "get",
    "url": "/highlights",
    "title": "Get highlights",
    "name": "get_highlights",
    "group": "Articles",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "description": "<p>The page of the requested highlights.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "description": "<p>The number of the requested highlights.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/article.ctrl.js",
    "groupTitle": "Articles"
  },
  {
    "type": "get",
    "url": "/images-browser",
    "title": "Browse images",
    "name": "images_browser",
    "group": "Articles",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "dir",
            "defaultValue": "uploads",
            "description": "<p>The directory to browse.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/article.ctrl.js",
    "groupTitle": "Articles"
  },
  {
    "type": "put",
    "url": "/article",
    "title": "Put article",
    "name": "put_article",
    "group": "Articles",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the article. This should be undefined|null|blank in the creation of a new article.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The article's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "category",
            "description": "<p>The article's category.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "teaser",
            "description": "<p>The article's teaser.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "status",
            "description": "<p>The article's status.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "featuredImage",
            "description": "<p>The article's featuredImage.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\"createdAt\":\"2020-01-27T15:55:23.499Z\",\"templatePosition\":\"\",\"label\":\"Top Article\",\"_id\":\"2822\",\"updatedAt\":\"2020-01-27T17:55:15.742Z\"}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"createdAt\":\"2020-01-30T14:56:30.780Z\",\"updatedBy\":\"437\",\"createdBy\":\"437\",\"label\":\"test\",\"_id\":\"2880\",\"category\":0,\"content\":\"<p>test content</p>\",\"status\":\"private\",\"teaser\":\"<p>test teaser</p>\",\"updatedAt\":\"2020-01-30T15:00:44.721Z\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/article.ctrl.js",
    "groupTitle": "Articles"
  },
  {
    "type": "get",
    "url": "/carousel",
    "title": "Get carousel items",
    "name": "get_carousel_items",
    "group": "Carousel",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"data\":[{\"createdAt\":\"2020-02-19T12:11:02.733Z\",\"image\":\"3079\",\"updatedBy\":\"437\",\"createdBy\":\"437\",\"caption\":\"caption 2\",\"_id\":\"3046\",\"label\":\"test 2\",\"url\":\"http://google.com\",\"updatedAt\":\"2020-02-26T12:27:15.260Z\",\"status\":\"private\",\"order\":\"1\",\"systemLabels\":[\"Slideshow\"],\"imageDetails\":{\"_id\":\"3079\",\"filename\":\"slideshow.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"5889d821aae8cf508f1b12b030dc62fd.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/5889d821aae8cf508f1b12b030dc62fd.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/5889d821aae8cf508f1b12b030dc62fd.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T12:27:09.950Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T12:27:09.950Z\"}},{\"createdAt\":\"2020-02-19T12:10:43.691Z\",\"image\":\"2942\",\"updatedBy\":\"437\",\"createdBy\":\"437\",\"caption\":\"test caption\",\"label\":\"test\",\"url\":\"http://www.google.gr\",\"updatedAt\":\"2020-02-19T12:10:43.691Z\",\"order\":0,\"status\":\"private\",\"_id\":\"2876\",\"systemLabels\":[\"Slideshow\"],\"imageDetails\":{\"_id\":\"2942\",\"filename\":\"IMG_20200218_145701.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"64fead2233879c89f47d8358530d1d41.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/64fead2233879c89f47d8358530d1d41.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/64fead2233879c89f47d8358530d1d41.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-18T16:01:16.685Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-18T16:01:16.685Z\"}}],\"totalItems\":2},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/carousel.ctrl.js",
    "groupTitle": "Carousel"
  },
  {
    "type": "get",
    "url": "/classpiece",
    "title": "Classpiece",
    "name": "classpiece",
    "group": "Classpieces",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the requested classpiece</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "classpiece object": [
          {
            "group": "classpiece object",
            "type": "object",
            "optional": false,
            "field": "metadata",
            "description": "<p>The classpiece metadata</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "fileName",
            "description": "<p>The file name of the classpiece</p>"
          },
          {
            "group": "classpiece object",
            "type": "array",
            "optional": false,
            "field": "paths",
            "description": "<p>An array containing the path to the fullsize version of the classpiece and to the thumbnail of the classpiece</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "systemType",
            "description": "<p>The system type _id</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The label of the classpiece</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "resourceType",
            "description": "<p>The type of the classpiece, i.e. image</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "status",
            "description": "<p>If the classpiece is private or public</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The classpiece _id</p>"
          },
          {
            "group": "classpiece object",
            "type": "array",
            "optional": false,
            "field": "events",
            "description": "<p>A list of associated events</p>"
          },
          {
            "group": "classpiece object",
            "type": "array",
            "optional": false,
            "field": "organisations",
            "description": "<p>A list of associated organisations</p>"
          },
          {
            "group": "classpiece object",
            "type": "array",
            "optional": false,
            "field": "people",
            "description": "<p>A list of associated people</p>"
          },
          {
            "group": "classpiece object",
            "type": "array",
            "optional": false,
            "field": "resources",
            "description": "<p>A list of associated resources</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": {\n        \"metadata\": {},\n        \"fileName\": \"1969-1970.jpg\",\n        \"paths\": [\n            {\n                \"path\": \"images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\",\n                \"pathType\": \"source\"\n            },\n            {\n                \"path\": \"images/thumbnails/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\",\n                \"pathType\": \"thumbnail\"\n            }\n        ],\n        \"systemType\": \"{\\\"ref\\\":\\\"87\\\"}\",\n        \"label\": \"1969-1970\",\n        \"resourceType\": \"image\",\n        \"status\": false,\n        \"_id\": \"389\",\n        \"events\": [],\n        \"organisations\": [],\n        \"people\": [],\n        \"resources\": [],\n      },\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/classpiece?_id=389",
        "type": "request"
      }
    ],
    "version": "0.0.0",
    "filename": "src/controllers/ui/classpieces.ctrl.js",
    "groupTitle": "Classpieces"
  },
  {
    "type": "get",
    "url": "/classpieces",
    "title": "Classpieces",
    "name": "classpieces",
    "group": "Classpieces",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against a classpiece label</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>A string to match against a classpiece description</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "events",
            "description": "<p>An array of event ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "organisations",
            "description": "<p>An array of organisations ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "people",
            "description": "<p>An array of people ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "resources",
            "description": "<p>An array of resources ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "temporal",
            "description": "<p>An array of temporal ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "spatial",
            "description": "<p>An array of spatial ids</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "currentPage",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Success 200",
            "type": "array",
            "optional": false,
            "field": "data",
            "description": "<p>An array of classpieces objects</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "totalItems",
            "description": "<p>The total number of results</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "totalPages",
            "description": "<p>The total number of available pages of results</p>"
          }
        ],
        "classpiece object": [
          {
            "group": "classpiece object",
            "type": "object",
            "optional": false,
            "field": "Classpiece",
            "description": "<p>A classpiece object as part of the data array contains the following fields</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "Classpiece[metadata]",
            "description": "<p>A stringified JSON object containing the classpiece metadata</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "Classpiece[fileName]",
            "description": "<p>The file name of the classpiece</p>"
          },
          {
            "group": "classpiece object",
            "type": "array",
            "optional": false,
            "field": "Classpiece[paths]",
            "description": "<p>An array containing the path to the fullsize version of the classpiece and to the thumbnail of the classpiece</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "Classpiece[systemType]",
            "description": "<p>The system type _id</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "Classpiece[label]",
            "description": "<p>The label of the classpiece</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "Classpiece[resourceType]",
            "description": "<p>The type of the classpiece, i.e. image</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "Classpiece[status]",
            "description": "<p>If the classpiece is private or public.</p>"
          },
          {
            "group": "classpiece object",
            "type": "string",
            "optional": false,
            "field": "Classpiece[_id]",
            "description": "<p>The classpiece _id</p>"
          },
          {
            "group": "classpiece object",
            "type": "array",
            "optional": false,
            "field": "Classpiece[systemLabels]",
            "description": "<p>A list of system tags for the classpiece</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": {\n        \"currentPage\": 1,\n        \"data\": [\n            {\n                \"metadata\": \"\\\"{\\\\\\\"image\\\\\\\":{\\\\\\\"default\\\\\\\":{\\\\\\\"height\\\\\\\":6464,\\\\\\\"width\\\\\\\":4808,\\\\\\\"extension\\\\\\\":\\\\\\\"jpg\\\\\\\",\\\\\\\"x\\\\\\\":0,\\\\\\\"y\\\\\\\":0,\\\\\\\"rotate\\\\\\\":0},\\\\\\\"exif\\\\\\\":{\\\\\\\"image\\\\\\\":{\\\\\\\"XResolution\\\\\\\":240,\\\\\\\"YResolution\\\\\\\":240,\\\\\\\"ResolutionUnit\\\\\\\":2,\\\\\\\"Software\\\\\\\":\\\\\\\"Adobe Photoshop Lightroom Classic 7.3.1 (Windows)\\\\\\\",\\\\\\\"ModifyDate\\\\\\\":\\\\\\\"2018:07:02 12:56:59\\\\\\\",\\\\\\\"ExifOffset\\\\\\\":172},\\\\\\\"thumbnail\\\\\\\":{},\\\\\\\"exif\\\\\\\":{\\\\\\\"ExifVersion\\\\\\\":{\\\\\\\"type\\\\\\\":\\\\\\\"Buffer\\\\\\\",\\\\\\\"data\\\\\\\":[48,50,51,48]},\\\\\\\"ColorSpace\\\\\\\":1},\\\\\\\"gps\\\\\\\":{},\\\\\\\"interoperability\\\\\\\":{},\\\\\\\"makernote\\\\\\\":{}},\\\\\\\"iptc\\\\\\\":{}}}\\\"\",\n                \"fileName\": \"1969-1970.jpg\",\n                \"paths\": [\n                    \"{\\\"path\\\":\\\"images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\\\",\\\"pathType\\\":\\\"source\\\"}\",\n                    \"{\\\"path\\\":\\\"images/thumbnails/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\\\",\\\"pathType\\\":\\\"thumbnail\\\"}\"\n                ],\n                \"systemType\": \"{\\\"ref\\\":\\\"87\\\"}\",\n                \"label\": \"1969-1970\",\n                \"resourceType\": \"image\",\n                \"status\": false,\n                \"_id\": \"389\",\n                \"systemLabels\": [\n                    \"Resource\"\n                ]\n            }\n        ],\n        \"totalItems\": 1,\n        \"totalPages\": 1\n    },\n    \"error\": [],\n    \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/classpiece?label=1971&description=test&page=1&limit=25",
        "type": "request"
      }
    ],
    "version": "0.0.0",
    "filename": "src/controllers/ui/classpieces.ctrl.js",
    "groupTitle": "Classpieces"
  },
  {
    "type": "get",
    "url": "/classpieces-active-filters",
    "title": "Classpieces active filters",
    "name": "classpieces_active_filters",
    "group": "Classpieces",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "50",
            "description": "<p>The number of results per page</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "temporals",
            "description": "<p>An object to filter by date</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "temporals[startDate]",
            "description": "<p>A string containing a start date</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "temporals[endDate]",
            "description": "<p>An string containing an end date</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "temporals[dateType]",
            "description": "<p>An object to filter by date</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "[temporals[startDate]]",
          "content": "dd/mm/yyyy",
          "type": "json"
        },
        {
          "title": "[temporals[endDate]]",
          "content": "dd/mm/yyyy",
          "type": "json"
        },
        {
          "title": "Request-Example:",
          "content": "{\n  page: 1,\n  limit: 50,\n  temporals: {\n    startDate:\"28/2/2022\",\n    endDate:\"7/3/2022\",\n    dateType:\"range\"\n  }\n}",
          "type": "json"
        }
      ]
    },
    "examples": [
      {
        "title": "Example:",
        "content": "https://clericus.ie/api/classpieces-active-filters?page=1&limit=50&temporals=%7B%22startDate%22:%22%22,%22endDate%22:%22%22,%22dateType%22:%22exact%22%7D",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": {\n        \"events\": [\n            \"35050\",\n            \"529\"\n        ],\n        \"organisations\": [\n            \"22795\",\n            \"71977\"\n        ]\n    },\n    \"error\": [],\n    \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/classpieces.ctrl.js",
    "groupTitle": "Classpieces"
  },
  {
    "type": "get",
    "url": "/content-article",
    "title": "Get article",
    "name": "get_content_article",
    "group": "Content_Articles",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the requested article.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "permalink",
            "description": "<p>The permalink of the requested article.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/content.ctrl.js",
    "groupTitle": "Content_Articles"
  },
  {
    "type": "get",
    "url": "/content-articles",
    "title": "Get articles",
    "name": "get_content_articles",
    "group": "Content_Articles",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"createdAt\":\"2020-02-26T16:35:27.079Z\",\"updatedBy\":\"437\",\"featuredImage\":\"3138\",\"createdBy\":\"437\",\"_id\":\"3137\",\"label\":\"News item 1\",\"category\":\"3157\",\"permalink\":\"news-item-1\",\"content\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"updatedAt\":\"2020-02-27T14:29:13.915Z\",\"teaser\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"status\":\"public\",\"systemLabels\":[\"Article\"],\"featuredImageDetails\":{\"_id\":\"3138\",\"filename\":\"3.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T16:35:36.685Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T16:35:36.685Z\"}},{\"createdAt\":\"2020-02-26T16:36:18.249Z\",\"updatedBy\":\"437\",\"featuredImage\":\"3138\",\"createdBy\":\"437\",\"_id\":\"3139\",\"label\":\"News item 2\",\"permalink\":\"news-item-2\",\"category\":\"3157\",\"content\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"updatedAt\":\"2020-02-27T14:29:49.518Z\",\"teaser\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"status\":\"public\",\"systemLabels\":[\"Article\"],\"featuredImageDetails\":{\"_id\":\"3138\",\"filename\":\"3.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T16:35:36.685Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T16:35:36.685Z\"}},{\"createdAt\":\"2020-02-26T16:36:32.206Z\",\"updatedBy\":\"437\",\"featuredImage\":\"3138\",\"createdBy\":\"437\",\"_id\":\"3158\",\"label\":\"News item 3\",\"permalink\":\"news-item-3\",\"category\":\"3157\",\"content\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"updatedAt\":\"2020-02-27T14:29:56.433Z\",\"teaser\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"status\":\"public\",\"systemLabels\":[\"Article\"],\"featuredImageDetails\":{\"_id\":\"3138\",\"filename\":\"3.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T16:35:36.685Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T16:35:36.685Z\"}},{\"createdAt\":\"2020-02-26T16:36:53.153Z\",\"updatedBy\":\"437\",\"featuredImage\":\"3138\",\"createdBy\":\"437\",\"_id\":\"3159\",\"label\":\"News item 4\",\"category\":\"3157\",\"permalink\":\"news-item-4\",\"content\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"updatedAt\":\"2020-02-27T14:30:05.642Z\",\"teaser\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"status\":\"public\",\"systemLabels\":[\"Article\"],\"featuredImageDetails\":{\"_id\":\"3138\",\"filename\":\"3.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T16:35:36.685Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T16:35:36.685Z\"}},{\"createdAt\":\"2020-02-26T16:37:12.836Z\",\"updatedBy\":\"437\",\"featuredImage\":\"3138\",\"createdBy\":\"437\",\"_id\":\"3160\",\"label\":\"News item 5\",\"permalink\":\"news-item-5\",\"category\":\"3157\",\"content\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"updatedAt\":\"2020-02-27T14:30:11.697Z\",\"teaser\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"status\":\"public\",\"systemLabels\":[\"Article\"],\"featuredImageDetails\":{\"_id\":\"3138\",\"filename\":\"3.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T16:35:36.685Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T16:35:36.685Z\"}},{\"createdAt\":\"2020-02-26T16:37:29.104Z\",\"updatedBy\":\"437\",\"featuredImage\":\"3138\",\"createdBy\":\"437\",\"_id\":\"3140\",\"label\":\"News item 6\",\"permalink\":\"news-item-6\",\"category\":\"3157\",\"content\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"updatedAt\":\"2020-02-27T14:30:17.972Z\",\"teaser\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis sodales aliquet metus dictum viverra. Quisque bibendum, nisi id blandit lobortis.</p>\",\"status\":\"public\",\"systemLabels\":[\"Article\"],\"featuredImageDetails\":{\"_id\":\"3138\",\"filename\":\"3.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/27ab65d4be6f10e88e0b0ee4c533a3ca.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T16:35:36.685Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T16:35:36.685Z\"}}],\"totalItems\":6,\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/content.ctrl.js",
    "groupTitle": "Content_Articles"
  },
  {
    "type": "get",
    "url": "/dashboard",
    "title": "Dashboard",
    "name": "dashboard",
    "group": "Dashboard",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": {\n        \"people\": 220,\n        \"resources\": 220,\n        \"organisations\": 80,\n        \"events\": 0\n    },\n    \"error\": false,\n    \"msg\": \"\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/dashboard.ctrl.js",
    "groupTitle": "Dashboard"
  },
  {
    "type": "get",
    "url": "/monthly-stats",
    "title": "Monthly stats",
    "name": "monthly_stats",
    "group": "Dashboard",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "year",
            "defaultValue": "current",
            "description": "<p>year] The year for the requested data.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "month",
            "defaultValue": "current",
            "description": "<p>month] The month for the requested data.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/nmonthly-stats?year=2020&month=1",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"year\":2020,\"month\":1,\"items\":[{\"day\":10,\"count\":35},{\"day\":15,\"count\":3},{\"day\":16,\"count\":1},{\"day\":17,\"count\":3}]},\"error\":false,\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/dashboard.ctrl.js",
    "groupTitle": "Dashboard"
  },
  {
    "type": "delete",
    "url": "/data-cleaning-instance",
    "title": "Get Data cleaning / disambiguation",
    "name": "delete_data-cleaning_instance",
    "group": "DataCleanings",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the data cleaning instance for deletion.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/dataCleaning.ctrl.js",
    "groupTitle": "DataCleanings"
  },
  {
    "type": "get",
    "url": "/data-cleaning",
    "title": "Get Data cleaning / disambiguation",
    "name": "get_data-cleaning",
    "group": "DataCleanings",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "_id",
            "optional": true,
            "field": "_id",
            "description": "<p>A unique _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the data cleaning / disambiguations labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "type",
            "description": "<p>A string to match against the data cleaning / disambiguations type.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "importPlanId",
            "description": "<p>A string to match against the data cleaning / disambiguation related _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "completed",
            "description": "<p>The jobs' status.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "_id",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": [],\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/dataCleaning.ctrl.js",
    "groupTitle": "DataCleanings"
  },
  {
    "type": "get",
    "url": "/data-cleaning-instance",
    "title": "Get Data cleaning / disambiguation",
    "name": "get_data-cleaning_instance",
    "group": "DataCleanings",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested data cleaning instance.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/dataCleaning.ctrl.js",
    "groupTitle": "DataCleanings"
  },
  {
    "type": "get",
    "url": "/data-cleaning-unique",
    "title": "Get Data cleaning / disambiguation unique values",
    "name": "get_data-cleaning_unique_values",
    "group": "DataCleanings",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested import.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"error\":[],\"status\":true,\"data\":{\"createdAt\":\"2021-11-09T12:13:46.110Z\",\"updatedBy\":\"53930\",\"importPlanId\":\"93912\",\"createdBy\":\"53930\",\"rule\":\"{\\\"type\\\":\\\"unique\\\",\\\"columns\\\":[{\\\"value\\\":8,\\\"label\\\":\\\"[I] Diocese\\\"}],\\\"entityType\\\":\\\"\\\"}\",\"_id\":\"93958\",\"label\":\"date unique\",\"completed\":false,\"type\":\"unique\",\"updatedAt\":\"2021-11-09T12:14:03.991Z\"}}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/dataCleaning.ctrl.js",
    "groupTitle": "DataCleanings"
  },
  {
    "type": "get",
    "url": "/data-cleaning-db-entries",
    "title": "Get Data cleaning / disambiguation compare with values",
    "name": "get_data-cleaning_unique_values",
    "group": "DataCleanings",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested import.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": [\n    [null, \"O'Byrne\", \"O'Beirne\", \"Denis\", \"Dionysius\", \"Latin\", null, null,  null, null, null, null, null, null, \"L. W. B. Brockliss and Patrick Ferté (eds), 'Prosopography of Irish Clerics in the Universities of Paris and Toulouse, 1573-1792'\"],\n    [null, \"Brady\", null, \"Philip\", \"Philippus\", \"Latin\", null, null, \"Kilmore\", 737, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, \"University of Paris\", \"Paris\", null, null, null, null, null, null, null, \"Faculty of Law\", \"1703-10-??\", null, \"Bachelors in Canon Law\", \"1704-12-12\", \"Licentiate in Canon Law\", \"1705-08-29\", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, \"L. W. B. Brockliss and Patrick Ferté (eds), 'Prosopography of Irish Clerics in the Universities of Paris and Toulouse, 1573-1792'\"],\n  ],\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/dataCleaning.ctrl.js",
    "groupTitle": "DataCleanings"
  },
  {
    "type": "get",
    "url": "/data-cleaning-wf-dates",
    "title": "Get Data cleaning / disambiguation compare dates against expected format and return if dates are well formatted",
    "name": "get_data-cleaning_well_formatted_dates",
    "group": "DataCleanings",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested import.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": [],\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/dataCleaning.ctrl.js",
    "groupTitle": "DataCleanings"
  },
  {
    "type": "put",
    "url": "/data-cleaning-instance",
    "title": "Put Data cleaning /",
    "name": "put_data-cleaning_instance",
    "group": "DataCleanings",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the import. This should be undefined|null|blank in the creation of a new import.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>The label of the new import.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/dataCleaning.ctrl.js",
    "groupTitle": "DataCleanings"
  },
  {
    "type": "delete",
    "url": "/entity",
    "title": "Delete entity",
    "name": "delete_entity",
    "group": "Entities",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the entity for deletion. If labelId is provided _id can be omitted.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "labelId",
            "description": "<p>The labelId of the entity for deletion. If _id is provided labelId can be omitted.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/entity?_id=2256",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"relations\":{\"nodesCreated\":0,\"nodesDeleted\":0,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0},\"node\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/entity.ctrl.js",
    "groupTitle": "Entities"
  },
  {
    "type": "get",
    "url": "/entities",
    "title": "Get entities",
    "name": "get_entities",
    "group": "Entities",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/entity?page=1&limit=25",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"definition\":\"This is the model of an event.\",\"label\":\"Event\",\"labelId\":\"Event\",\"locked\":true,\"_id\":\"49\",\"systemLabels\":[\"Entity\"]},{\"definition\":\"This is the model of an organisation.\",\"label\":\"Organisation\",\"labelId\":\"Organisation\",\"locked\":true,\"_id\":\"450\",\"systemLabels\":[\"Entity\"]},{\"definition\":\"This is the model of a person.\",\"label\":\"Person\",\"labelId\":\"Person\",\"locked\":true,\"_id\":\"402\",\"systemLabels\":[\"Entity\"]},{\"definition\":\"This is the model of a resource.\",\"label\":\"Resource\",\"labelId\":\"Resource\",\"locked\":true,\"_id\":\"261\",\"systemLabels\":[\"Entity\"]},{\"definition\":\"This is the model of a spatial object.\",\"label\":\"Spatial\",\"labelId\":\"Spatial\",\"locked\":true,\"_id\":\"313\",\"systemLabels\":[\"Entity\"]},{\"definition\":\"This is the model of a temporal object.\",\"label\":\"Temporal\",\"labelId\":\"Temporal\",\"locked\":true,\"_id\":\"413\",\"systemLabels\":[\"Entity\"]},{\"createdAt\":\"2020-01-14T12:54:12.873Z\",\"updatedBy\":\"260\",\"labelId\":\"TestEntity\",\"createdBy\":\"260\",\"definition\":\"This is a test entity.\",\"label\":\"Test entity\",\"locked\":false,\"updatedAt\":\"2020-01-14T12:54:12.873Z\",\"_id\":\"2257\",\"systemLabels\":[\"Entity\"]}],\"totalItems\":\"7\",\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/entity.ctrl.js",
    "groupTitle": "Entities"
  },
  {
    "type": "get",
    "url": "/entity",
    "title": "Get entity",
    "name": "get_entity",
    "group": "Entities",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested entity. If labelId is provided _id can be omitted.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "labelId",
            "description": "<p>The labelId of the requested entity. If _id is provided labelId can be omitted.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/entity?_id=2256",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2257\",\"label\":\"Test entity\",\"labelId\":\"TestEntity\",\"locked\":false,\"definition\":\"This is a test entity.\",\"example\":null,\"parent\":null,\"createdBy\":\"260\",\"createdAt\":\"2020-01-14T12:54:12.873Z\",\"updatedBy\":\"260\",\"updatedAt\":\"2020-01-14T12:54:12.873Z\",\"properties\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/entity.ctrl.js",
    "groupTitle": "Entities"
  },
  {
    "type": "put",
    "url": "/entity",
    "title": "Put entity",
    "name": "put_entity",
    "group": "Entities",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the entity. This should be undefined|null|blank in the creation of a new entity.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The label of the new entity.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "locked",
            "defaultValue": "false",
            "description": "<p>If future updates are allowed for this entity. For the creation of a new entity this value must be set to false.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "definition",
            "description": "<p>The definition of the entity.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "example",
            "description": "<p>An example of use for this entity.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "parent",
            "description": "<p>A parent entity for this entity.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\n    \"example\": null,\n    \"label\": \"Test entity\",\n    \"labelId\": \"TestEntity\",\n    \"locked\": false,\n    \"definition\": \"This is a test entity.\",\n    \"parent\": null\n}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"createdAt\":\"2020-01-14T12:54:12.873Z\",\"updatedBy\":\"260\",\"labelId\":\"TestEntity\",\"createdBy\":\"260\",\"definition\":\"This is a test entity.\",\"label\":\"Test entity\",\"locked\":false,\"updatedAt\":\"2020-01-14T12:54:12.873Z\",\"_id\":\"2257\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/entity.ctrl.js",
    "groupTitle": "Entities"
  },
  {
    "type": "delete",
    "url": "/event",
    "title": "Delete event",
    "name": "delete_event",
    "group": "Events",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the event for deletion.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/event?_id=2255",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Event) WHERE id(n)=569 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":28,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/event.ctrl.js",
    "groupTitle": "Events"
  },
  {
    "type": "delete",
    "url": "/events",
    "title": "Delete events",
    "name": "delete_events",
    "group": "Events",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "array",
            "optional": false,
            "field": "_ids",
            "description": "<p>The ids of the events for deletion.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\n  \"_ids\":[\"2257\",\"2253\"]\n}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":[{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Event) WHERE id(n)=1149 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":6,\"high\":0}}}],\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/event.ctrl.js",
    "groupTitle": "Events"
  },
  {
    "type": "get",
    "url": "/event",
    "title": "Get event",
    "name": "get_event",
    "group": "Events",
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/event?_id=2255",
        "type": "request"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested event.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2255\",\"label\":\"Test event\",\"description\":\"test event description\",\"eventType\":\"293\",\"createdBy\":null,\"createdAt\":null,\"updatedBy\":\"260\",\"updatedAt\":\"2020-01-14T15:00:13.430Z\",\"events\":[],\"organisations\":[],\"people\":[],\"resources\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/event.ctrl.js",
    "groupTitle": "Events"
  },
  {
    "type": "get",
    "url": "/event",
    "title": "Get event",
    "name": "get_event",
    "group": "Events",
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/event?_id=2255",
        "type": "request"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested event.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2255\",\"label\":\"Test event\",\"description\":\"test event description\",\"eventType\":\"293\",\"createdBy\":null,\"createdAt\":null,\"updatedBy\":\"260\",\"updatedAt\":\"2020-01-14T15:00:13.430Z\",\"events\":[],\"organisations\":[],\"people\":[],\"resources\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/events.ctrl.js",
    "groupTitle": "Events"
  },
  {
    "type": "get",
    "url": "/events",
    "title": "Get events",
    "name": "get_events",
    "group": "Events",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "_id",
            "optional": true,
            "field": "_id",
            "description": "<p>An event unique _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the events labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "eventType",
            "optional": true,
            "field": "eventType",
            "description": "<p>An eventType _id .</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "temporal",
            "description": "<p>A temporal value.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "spatial",
            "description": "<p>A spatial label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/events?label=test&page=1&limit=25",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"createdAt\":\"2020-01-14T14:48:31.753Z\",\"updatedBy\":\"260\",\"createdBy\":\"260\",\"description\":\"test event description\",\"label\":\"Test event\",\"eventType\":\"293\",\"updatedAt\":\"2020-01-14T14:48:31.753Z\",\"_id\":\"2255\",\"systemLabels\":[\"Event\"]}],\"totalItems\":\"1\",\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/event.ctrl.js",
    "groupTitle": "Events"
  },
  {
    "type": "get",
    "url": "/events",
    "title": "Get events",
    "name": "get_events",
    "group": "Events",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the events labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "temporal",
            "description": "<p>A temporal value.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "spatial",
            "description": "<p>A spatial label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/events?label=test&page=1&limit=25",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"createdAt\":\"2020-01-14T14:48:31.753Z\",\"updatedBy\":\"260\",\"createdBy\":\"260\",\"description\":\"test event description\",\"label\":\"Test event\",\"eventType\":\"293\",\"updatedAt\":\"2020-01-14T14:48:31.753Z\",\"_id\":\"2255\",\"systemLabels\":[\"Event\"]}],\"totalItems\":\"1\",\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/events.ctrl.js",
    "groupTitle": "Events"
  },
  {
    "type": "put",
    "url": "/event",
    "title": "Put event",
    "name": "put_event",
    "group": "Events",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the event. This should be undefined|null|blank in the creation of a new event.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The label of the event.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>The description of the event.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "eventType",
            "description": "<p>The event type.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\n  \"label\":\"Test event\",\n  \"description\":\"test event description\",\n  \"eventType\":\"293\",\n  \"temporal\":null,\n  \"spatial\":null,\n  \"_id\":\"2255\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"createdAt\":\"2020-01-14T14:48:31.753Z\",\"updatedBy\":\"260\",\"createdBy\":\"260\",\"description\":\"test event descriptiomn\",\"label\":\"Test event\",\"eventType\":\"293\",\"updatedAt\":\"2020-01-14T14:48:31.753Z\",\"_id\":\"2255\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/event.ctrl.js",
    "groupTitle": "Events"
  },
  {
    "type": "delete",
    "url": "/import-plan",
    "title": "Delete import",
    "name": "delete_import",
    "group": "ImportPlans",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the import for deletion.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "delete",
    "url": "/import-file-delete",
    "title": "Delete import file",
    "name": "delete_import_file",
    "group": "ImportPlans",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the import file for deletion.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "delete",
    "url": "/import-plan-relation",
    "title": "Delete import plan relation",
    "name": "delete_import_plan_relation",
    "group": "ImportPlans",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "importId",
            "description": "<p>The _id of the import.</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "index",
            "description": "<p>The index of the relation in the relations list.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  importId: \"96991\",\n  index: 0,\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "get",
    "url": "/import-plan-status",
    "title": "Get import plan ingestion status",
    "name": "get_import_plan_ingestion_status",
    "group": "ImportPlans",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the import plan.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "get",
    "url": "/import-plan-preview-results",
    "title": "Get import plan results preview",
    "name": "get_import_plan_preview_results",
    "group": "ImportPlans",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the import plan.</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "rows",
            "description": "<p>A list of rows from the data file to match against. If left blank it defaults to rows 1-10.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "get",
    "url": "/import-plans",
    "title": "Get imports",
    "name": "get_imports",
    "group": "ImportPlans",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "_id",
            "optional": true,
            "field": "_id",
            "description": "<p>A unique _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the peoples' labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "label",
            "description": "<p>The field to order the results by.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "put",
    "url": "/import-plan",
    "title": "Put import",
    "name": "put_import",
    "group": "ImportPlans",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the import. This should be undefined|null|blank in the creation of a new import.</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "label",
            "description": "<p>The label of the new import.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "put",
    "url": "/import-plan-ingest",
    "title": "Start ingestion according to import plan",
    "name": "put_import_plan_ingest",
    "group": "ImportPlans",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the import plan.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "put",
    "url": "/import-plan-relation",
    "title": "Put import plan relation",
    "name": "put_import_plan_relation",
    "group": "ImportPlans",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "importId",
            "description": "<p>The _id of the import.</p>"
          },
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "index",
            "description": "<p>The index of the relation in the relations list. -1 for new relations.</p>"
          },
          {
            "group": "Parameter",
            "type": "Object",
            "optional": false,
            "field": "relation",
            "description": "<p>An object that contains the relation data.</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n  importId: \"96991\",\n  index: -1,\n  relation: {\n    relationLabel: \"hasAffiliation\",\n    srcId: \"96995\",\n    srcType: \"Person\",\n    targetId: \"96994\",\n    targetType: \"Organisation\"\n  }\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "post",
    "url": "/import-file-upload",
    "title": "Upload file to an import",
    "name": "upload_file_to_an_import",
    "group": "ImportPlans",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "formData",
            "optional": true,
            "field": "file",
            "description": "<p>A form data object with the name &quot;file&quot; containing the filename and the file blob.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "Content-Disposition: form-data; name=\"file\"; filename=\"some-file.csv\"\nContent-Type: image/jpeg",
        "type": "formData"
      }
    ],
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "ImportPlans"
  },
  {
    "type": "delete",
    "url": "/import-rule",
    "title": "Delete import rule",
    "name": "delete_import_rule",
    "group": "Import_rules",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the import rule for deletion.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importRules.ctrl.js",
    "groupTitle": "Import_rules"
  },
  {
    "type": "get",
    "url": "/import-rule",
    "title": "Get import rule",
    "name": "get_import_rule",
    "group": "Import_rules",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested import rule.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importRules.ctrl.js",
    "groupTitle": "Import_rules"
  },
  {
    "type": "get",
    "url": "/import-rules",
    "title": "Get import rules",
    "name": "get_import_rules",
    "group": "Import_rules",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "importPlanId",
            "optional": true,
            "field": "_id",
            "description": "<p>An import unique _id.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importRules.ctrl.js",
    "groupTitle": "Import_rules"
  },
  {
    "type": "put",
    "url": "/import-rule",
    "title": "Put import rule",
    "name": "put_import_rule",
    "group": "Import_rules",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the import rule. This should be undefined|null|blank in the creation of a new import.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>The label of the new import rule.</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "rule",
            "description": "<p>An array containing the import rule details.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "importPlanId",
            "description": "<p>The _id of the an associated import.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "completed",
            "description": "<p>If the rule execution has completed or not.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importRules.ctrl.js",
    "groupTitle": "Import_rules"
  },
  {
    "type": "get",
    "url": "/jobs",
    "title": "Get jobs",
    "name": "get_jobs",
    "group": "Jobs",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "_id",
            "optional": true,
            "field": "_id",
            "description": "<p>A unique _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the jobs' labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "type",
            "description": "<p>A string to match against the jobs' type.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "relId",
            "description": "<p>A string to match against the jobs' related _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "completed",
            "description": "<p>The jobs' status.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "_id",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": [],\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/jobs.ctrl.js",
    "groupTitle": "Jobs"
  },
  {
    "type": "get",
    "url": "/language-codes",
    "title": "Get language codes",
    "name": "get_language-codes",
    "group": "Language_codes",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": [{English: \"Afar\", alpha2: \"aa\", alpha3-b: \"aar\"},…],\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/language.codes.ctrl.js",
    "groupTitle": "Language_codes"
  },
  {
    "type": "delete",
    "url": "/menuItem",
    "title": "Delete menuItem",
    "name": "delete_menuItem",
    "group": "MenuItems",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the menuItem for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:MenuItem) WHERE id(n)=2480 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":1,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/menuItem.ctrl.js",
    "groupTitle": "MenuItems"
  },
  {
    "type": "get",
    "url": "/menuItem",
    "title": "Get menuItem",
    "name": "get_menuItem",
    "group": "MenuItems",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested menuItem. Either the _id or the systemType should be provided.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2855\",\"menuId\":\"2822\",\"label\":\"Home\",\"order\":0,\"parentId\":0,\"type\":\"link\",\"objectId\":0,\"link\":\"/\",\"target\":\"\",\"status\":\"private\",\"createdBy\":null,\"createdAt\":null,\"updatedBy\":null,\"updatedAt\":\"2020-01-28T15:51:33.266Z\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/menuItem.ctrl.js",
    "groupTitle": "MenuItems"
  },
  {
    "type": "get",
    "url": "/menuItems",
    "title": "Get menuItems",
    "name": "get_menuItems",
    "group": "MenuItems",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":[{\"link\":\"/\",\"menuId\":\"2822\",\"label\":\"Home\",\"_id\":\"2855\",\"type\":\"link\",\"objectId\":0,\"parentId\":0,\"updatedAt\":\"2020-01-28T15:51:33.266Z\",\"order\":0,\"target\":\"\",\"status\":\"private\",\"systemLabels\":[\"MenuItem\"]},{\"link\":\"\",\"menuId\":\"2822\",\"_id\":\"2877\",\"label\":\"Test\",\"type\":\"link\",\"objectId\":0,\"parentId\":2837,\"updatedAt\":\"2020-01-29T14:23:21.702Z\",\"order\":0,\"target\":\"\",\"status\":\"private\",\"systemLabels\":[\"MenuItem\"]},{\"link\":\"\",\"menuId\":\"2822\",\"_id\":\"2897\",\"label\":\"Research\",\"type\":\"link\",\"objectId\":0,\"parentId\":0,\"updatedAt\":\"2020-01-29T14:23:37.715Z\",\"order\":0,\"target\":\"\",\"status\":\"private\",\"systemLabels\":[\"MenuItem\"]},{\"createdAt\":\"2020-01-29T11:39:59.209Z\",\"link\":\"\",\"menuId\":\"2822\",\"label\":\"test 2\",\"type\":\"link\",\"objectId\":0,\"parentId\":2877,\"updatedAt\":\"2020-01-29T11:39:59.209Z\",\"order\":0,\"target\":\"\",\"status\":\"private\",\"_id\":\"2935\",\"systemLabels\":[\"MenuItem\"]},{\"link\":\"\",\"menuId\":\"2822\",\"_id\":\"2837\",\"label\":\"About\",\"type\":\"link\",\"objectId\":0,\"parentId\":2855,\"updatedAt\":\"2020-01-29T12:40:10.551Z\",\"order\":1,\"target\":\"\",\"status\":\"private\",\"systemLabels\":[\"MenuItem\"]}],\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/menuItem.ctrl.js",
    "groupTitle": "MenuItems"
  },
  {
    "type": "put",
    "url": "/menuItem",
    "title": "Put menuItem",
    "name": "put_menuItem",
    "group": "MenuItems",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the menu item. This should be undefined|null|blank in the creation of a new menu item.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "menuId",
            "description": "<p>The _id of the menu this menu item belongs to.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The menuItem's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "order",
            "defaultValue": "0",
            "description": "<p>The order of the menu item.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "parentId",
            "defaultValue": "0",
            "description": "<p>The hierarchical parent menu item of this menu item.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "type",
            "defaultValue": "article|category|link",
            "description": "<p>The type of the menu item.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "objectId",
            "description": "<p>If the type of the menu item is article or category, the article or category id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "link",
            "description": "<p>If the type of the menu item is link the link URL.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "target",
            "description": "<p>If the type of the menu item is link and the link is an external link target should be set to &quot;_blank&quot;.</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "accessGroup",
            "description": "<p>If the menu item is only visible to certain access groups.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "status",
            "defaultValue": "private",
            "description": "<p>The status of the  menu item.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\n  \"label\":\"Test\",\n  \"description\":\"test description\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"createdAt\":\"2020-01-15T12:56:39.387Z\",\"updatedBy\":\"260\",\"labelId\":\"Test\",\"createdBy\":\"260\",\"systemType\":\"test\",\"description\":\"\",\"label\":\"Test\",\"locked\":false,\"updatedAt\":\"2020-01-15T12:56:39.387Z\",\"_id\":\"2480\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/menuItem.ctrl.js",
    "groupTitle": "MenuItems"
  },
  {
    "type": "delete",
    "url": "/menu",
    "title": "Delete menu",
    "name": "delete_menu",
    "group": "Menus",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the menu for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Menu) WHERE id(n)=2480 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":1,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/menu.ctrl.js",
    "groupTitle": "Menus"
  },
  {
    "type": "get",
    "url": "/menu",
    "title": "Get menu",
    "name": "get_menu",
    "group": "Menus",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested menu. Either the _id or the systemType should be provided.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/menu.ctrl.js",
    "groupTitle": "Menus"
  },
  {
    "type": "get",
    "url": "/menu",
    "title": "Get menu",
    "name": "get_menu",
    "group": "Menus",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested menu. Either the _id or the systemType should be provided.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/menu.ctrl.js",
    "groupTitle": "Menus"
  },
  {
    "type": "get",
    "url": "/menus",
    "title": "Get menus",
    "name": "get_menus",
    "group": "Menus",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"data\":[{\"createdAt\":\"2020-01-27T15:55:23.499Z\",\"templatePosition\":\"\",\"label\":\"Top Menu\",\"_id\":\"2822\",\"updatedAt\":\"2020-01-27T17:55:15.742Z\",\"systemLabels\":[\"Menu\"]},{\"createdAt\":\"2020-01-27T17:43:44.578Z\",\"label\":\"Bottom Menu\",\"templatePosition\":\"bottom\",\"updatedAt\":\"2020-01-27T17:43:44.578Z\",\"_id\":\"2683\",\"systemLabels\":[\"Menu\"]}]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/menu.ctrl.js",
    "groupTitle": "Menus"
  },
  {
    "type": "put",
    "url": "/menu",
    "title": "Put menu",
    "name": "put_menu",
    "group": "Menus",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the menu. This should be undefined|null|blank in the creation of a new menu.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The menu's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "templatePosition",
            "description": "<p>The name of the position in the UI template that will hold the menu.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\"createdAt\":\"2020-01-27T15:55:23.499Z\",\"templatePosition\":\"\",\"label\":\"Top Menu\",\"_id\":\"2822\",\"updatedAt\":\"2020-01-27T17:55:15.742Z\"}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"createdAt\":\"2020-01-27T15:55:23.499Z\",\"label\":\"Top Menu\",\"_id\":\"2822\",\"templatePosition\":\"\",\"updatedAt\":\"2020-01-28T09:39:20.981Z\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/menu.ctrl.js",
    "groupTitle": "Menus"
  },
  {
    "type": "get",
    "url": "/graph",
    "title": "Get graph",
    "name": "get_graph",
    "group": "Network_graph",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "events",
            "defaultValue": "true",
            "description": "<p>Whether to load events data.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "organisations",
            "defaultValue": "true",
            "description": "<p>Whether to load organisations data.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "people",
            "defaultValue": "true",
            "description": "<p>Whether to load people data.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "resources",
            "defaultValue": "true",
            "description": "<p>Whether to load resources data.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/graph?events=true&organisations=true&people=true&resources=true",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n\t\"status\": true,\n\t\"data\": {\n\t\t\"nodes\": [...],\n\t\t\"links\": [...]\n\t},\n\t\"error\": [],\n\t\"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/graph.ctrl.js",
    "groupTitle": "Network_graph"
  },
  {
    "type": "get",
    "url": "/related-nodes",
    "title": "Get related nodes",
    "name": "get_related-nodes",
    "group": "Network_graph",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the source node.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "allowedValues": [
              "1..6"
            ],
            "optional": true,
            "field": "steps",
            "description": "<p>The number of steps to take in the graph to get the related nodes*</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/related-nodes?_id=34&steps=1",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":[{\"lastName\":\"Alamain\",\"firstName\":\"Colm\",\"honorificPrefix\":[\"\"],\"middleName\":\"\",\"label\":\"Colm  Alamain\",\"alternateAppelations\":[],\"status\":false,\"_id\":\"45\",\"systemLabels\":[\"Person\"]},{\"firstName\":\"Tomas\",\"lastName\":\"O Hogain\",\"honorificPrefix\":[\"\"],\"middleName\":\"\",\"label\":\"Tomas  O Hogain\",\"alternateAppelations\":[],\"status\":false,\"_id\":\"187\",\"systemLabels\":[\"Person\"]}],\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/graph.ctrl.js",
    "groupTitle": "Network_graph"
  },
  {
    "type": "delete",
    "url": "/organisation",
    "title": "Delete organisation",
    "name": "delete_organisation",
    "group": "Organisations",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the organisation for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Organisation) WHERE id(n)=2069 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":17,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/organisation.ctrl.js",
    "groupTitle": "Organisations"
  },
  {
    "type": "delete",
    "url": "/organisations",
    "title": "Delete organisations",
    "name": "delete_organisations",
    "group": "Organisations",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "array",
            "optional": false,
            "field": "_ids",
            "description": "<p>The ids of the organisations for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":[{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Organisation) WHERE id(n)=2109 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":5,\"high\":0}}}],\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/organisation.ctrl.js",
    "groupTitle": "Organisations"
  },
  {
    "type": "get",
    "url": "/organisation",
    "title": "Get organisation",
    "name": "get_organisation",
    "group": "Organisations",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested organisation.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"375\",\"label\":\"Cill Da Lua\",\"labelSoundex\":\"C434\",\"description\":null,\"organisationType\":\"Diocese\",\"status\":false,\"alternateAppelations\":[],\"createdBy\":null,\"createdAt\":null,\"updatedBy\":null,\"updatedAt\":null,\"events\":[],\"organisations\":[],\"people\":[],\"resources\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/organisation.ctrl.js",
    "groupTitle": "Organisations"
  },
  {
    "type": "get",
    "url": "/organisation",
    "title": "Get organisation",
    "name": "get_organisation",
    "group": "Organisations",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested organisation.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"375\",\"label\":\"Cill Da Lua\",\"labelSoundex\":\"C434\",\"description\":null,\"organisationType\":\"Diocese\",\"status\":false,\"alternateAppelations\":[],\"createdBy\":null,\"createdAt\":null,\"updatedBy\":null,\"updatedAt\":null,\"events\":[],\"organisations\":[],\"people\":[],\"resources\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/organisations.ctrl.js",
    "groupTitle": "Organisations"
  },
  {
    "type": "get",
    "url": "/organisations",
    "title": "Get organisations",
    "name": "get_organisations",
    "group": "Organisations",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "_id",
            "optional": true,
            "field": "_id",
            "description": "<p>A unique _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the organisations' labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "organisationType",
            "description": "<p>An organisation type label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": {\n    \"currentPage\": 1,\n    \"data\": [{\n      \"label\": \"Achadh Conaire\",\n      \"labelSoundex\": \"A232\",\n      \"alternateAppelations\": [],\n      \"organisationType\": \"Diocese\",\n      \"status\": false,\n      \"_id\": \"135\",\n      \"systemLabels\": [\"Organisation\"],\n      \"resources\": []\n    }],\n    \"totalItems\": 80,\n    \"totalPages\": 4\n  },\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/organisation.ctrl.js",
    "groupTitle": "Organisations"
  },
  {
    "type": "get",
    "url": "/organisations",
    "title": "Get organisations",
    "name": "get_organisations",
    "group": "Organisations",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the organisations' labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "organisationType",
            "description": "<p>An organisation type label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": {\n    \"currentPage\": 1,\n    \"data\": [{\n      \"label\": \"Achadh Conaire\",\n      \"labelSoundex\": \"A232\",\n      \"alternateAppelations\": [],\n      \"organisationType\": \"Diocese\",\n      \"status\": false,\n      \"_id\": \"135\",\n      \"systemLabels\": [\"Organisation\"],\n      \"resources\": []\n    }],\n    \"totalItems\": 80,\n    \"totalPages\": 4\n  },\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/organisations.ctrl.js",
    "groupTitle": "Organisations"
  },
  {
    "type": "put",
    "url": "/organisation",
    "title": "Put organisation",
    "name": "put_organisation",
    "group": "Organisations",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the organisation. This should be undefined|null|blank in the creation of a new organisation.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The organisation's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>A description about the organisation.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "organisationType",
            "description": "<p>The type of the organisation. The available values come from the Organisation types taxonomy.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "status",
            "defaultValue": "private",
            "description": "<p>The status of the person.</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "alternateAppelations",
            "description": "<p>The organisation's alternate appelations.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "alternateAppelation[label]",
            "description": "<p>The organisation's alternate appelation label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "alternateAppelation[note]",
            "description": "<p>The organisation's alternate appelation note.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "alternateAppelation[language]",
            "description": "<p>The organisation's alternate appelation language.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"error\":[],\"status\":true,\"data\":{\"updatedBy\":\"260\",\"labelSoundex\":\"A232\",\"description\":\"\",\"_id\":\"135\",\"label\":\"Achadh Conaire\",\"alternateAppelations\":[],\"updatedAt\":\"2020-01-15T11:05:14.136Z\",\"organisationType\":\"Diocese\",\"status\":false}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/organisation.ctrl.js",
    "groupTitle": "Organisations"
  },
  {
    "type": "delete",
    "url": "/people",
    "title": "Delete people",
    "name": "delete_people",
    "group": "People",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "array",
            "optional": false,
            "field": "_ids",
            "description": "<p>The ids of the people for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":[{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Event) WHERE id(n)=1149 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":6,\"high\":0}}}],\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/person.ctrl.js",
    "groupTitle": "People"
  },
  {
    "type": "delete",
    "url": "/person",
    "title": "Delete person",
    "name": "delete_person",
    "group": "People",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the person for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Person) WHERE id(n)=2069 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":17,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/person.ctrl.js",
    "groupTitle": "People"
  },
  {
    "type": "get",
    "url": "/people",
    "title": "Get people",
    "name": "get_people",
    "group": "People",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "_id",
            "optional": true,
            "field": "_id",
            "description": "<p>A unique _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the peoples' labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "firstName",
            "description": "<p>A string to match against the peoples' first names.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "lastName",
            "description": "<p>A string to match against the peoples' last names.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "fnameSoundex",
            "description": "<p>A string to match against the peoples' first name soundex.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "lnameSoundex",
            "description": "<p>A string to match against the peoples' last name soundex.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>A string to match against the peoples' description.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "classpieceId",
            "description": "<p>The id of a related classpiece.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": {\n    \"currentPage\": 1,\n    \"data\": [\n      {\"lastName\": \"Fox\", \"firstName\": \"Aidan\", \"honorificPrefix\": [\"\"], \"middleName\": \"\", \"label\": \"Aidan Fox\",…},\n    …],\n    \"totalItems\": \"221\",\n    \"totalPages\": 9\n  },\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/person.ctrl.js",
    "groupTitle": "People"
  },
  {
    "type": "post",
    "url": "/people",
    "title": "Get people",
    "name": "get_people",
    "group": "People",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the peoples' labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "firstName",
            "description": "<p>A string to match against the peoples' first names.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "lastName",
            "description": "<p>A string to match against the peoples' last names.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "fnameSoundex",
            "description": "<p>A string to match against the peoples' first name soundex.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "lnameSoundex",
            "description": "<p>A string to match against the peoples' last name soundex.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>A string to match against the peoples' description.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "personType",
            "description": "<p>The person type.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": {\n    \"currentPage\": 1,\n    \"data\": [\n      {\"lastName\": \"Fox\", \"firstName\": \"Aidan\", \"honorificPrefix\": [\"\"], \"middleName\": \"\", \"label\": \"Aidan Fox\",…},\n    …],\n    \"totalItems\": \"221\",\n    \"totalPages\": 9\n  },\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/people.ctrl.js",
    "groupTitle": "People"
  },
  {
    "type": "get",
    "url": "/person",
    "title": "Get person",
    "name": "get_person",
    "group": "People",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested person.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2069\",\"honorificPrefix\":[\"My\"],\"firstName\":\"fname\",\"middleName\":\"mname\",\"lastName\":\"lname\",\"label\":\"fname mname lname\",\"fnameSoundex\":\"F550\",\"lnameSoundex\":\"L550\",\"description\":\"description\",\"status\":\"private\",\"alternateAppelations\":[{\"appelation\":\"\",\"firstName\":\"altfname\",\"middleName\":\"altmname\",\"lastName\":\"altlname\",\"note\":\"note\",\"language\":{\"value\":\"en\",\"label\":\"English\"}}],\"createdBy\":\"260\",\"createdAt\":\"2020-01-14T15:39:10.638Z\",\"updatedBy\":\"260\",\"updatedAt\":\"2020-01-14T15:42:42.939Z\",\"events\":[],\"organisations\":[],\"people\":[],\"resources\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/person.ctrl.js",
    "groupTitle": "People"
  },
  {
    "type": "get",
    "url": "/person",
    "title": "Get person",
    "name": "get_person",
    "group": "People",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested person.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2069\",\"honorificPrefix\":[\"My\"],\"firstName\":\"fname\",\"middleName\":\"mname\",\"lastName\":\"lname\",\"label\":\"fname mname lname\",\"fnameSoundex\":\"F550\",\"lnameSoundex\":\"L550\",\"description\":\"description\",\"status\":\"private\",\"alternateAppelations\":[{\"appelation\":\"\",\"firstName\":\"altfname\",\"middleName\":\"altmname\",\"lastName\":\"altlname\",\"note\":\"note\",\"language\":{\"value\":\"en\",\"label\":\"English\"}}],\"createdBy\":\"260\",\"createdAt\":\"2020-01-14T15:39:10.638Z\",\"updatedBy\":\"260\",\"updatedAt\":\"2020-01-14T15:42:42.939Z\",\"events\":[],\"organisations\":[],\"people\":[],\"resources\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/people.ctrl.js",
    "groupTitle": "People"
  },
  {
    "type": "put",
    "url": "/person",
    "title": "Put person",
    "name": "put_person",
    "group": "People",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the person. This should be undefined|null|blank in the creation of a new person.</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "honorificPrefix",
            "description": "<p>The various honorific prefixes a person has.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "firstName",
            "description": "<p>The person's first name.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "middleName",
            "description": "<p>The person's middle name.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "lastName",
            "description": "<p>The person's lastName name.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>A description about the person.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "status",
            "defaultValue": "private",
            "description": "<p>The status of the person.</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "alternateAppelations",
            "description": "<p>The person's alternate appelations.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "alternateAppelation[appelation]",
            "description": "<p>The person's alternate appelation label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "alternateAppelation[firstName]",
            "description": "<p>The person's alternate appelation first name.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "alternateAppelation[middleName]",
            "description": "<p>The person's alternate appelation middle name.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "alternateAppelation[lastName]",
            "description": "<p>The person's alternate appelation lastName name.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "alternateAppelation[note]",
            "description": "<p>The person's alternate appelation note.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": true,
            "field": "alternateAppelation[language]",
            "description": "<p>The person's alternate appelation language.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"error\":[],\"status\":true,\"data\":{\"lastName\":\"lname\",\"updatedBy\":\"260\",\"description\":\"description\",\"honorificPrefix\":[\"Mr\"],\"label\":\"fname mname lname\",\"alternateAppelations\":[],\"firstName\":\"fname\",\"createdAt\":\"2020-01-14T15:39:10.638Z\",\"createdBy\":\"260\",\"middleName\":\"mname\",\"lnameSoundex\":\"L550\",\"fnameSoundex\":\"F550\",\"status\":\"private\",\"updatedAt\":\"2020-01-14T15:39:10.638Z\",\"_id\":\"2069\"}}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/person.ctrl.js",
    "groupTitle": "People"
  },
  {
    "type": "delete",
    "url": "/reference",
    "title": "Delete reference",
    "name": "delete_reference",
    "group": "References",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "array",
            "optional": false,
            "field": "items",
            "description": "<p>The entities that will be related.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "items[item]",
            "description": "<p>Two items need to be provided: i) the source entity, ii) the target entity</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "item[_id]",
            "description": "<p>The source/target entity id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "item[type]",
            "description": "<p>The source/target entity type.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "item[role]",
            "description": "<p>The source/target entity role in the relationship if any.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "taxonomyTermId",
            "description": "<p>The relation taxonomy term id. Either the taxonomyTermId or the taxonomyTermLabel must be provided.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "taxonomyTermLabel",
            "description": "<p>The relation taxonomy term labelId. Either the taxonomyTermId or the taxonomyTermLabel must be provided.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example usage",
        "content": "{\n  \"items\": [{\n    \"_id\": \"2069\",\n    \"type\": \"Organisation\"\n  }, {\n    \"_id\": \"2255\",\n    \"type\": \"Event\"\n  }],\n  \"taxonomyTermLabel\": \"hasRelation\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"nodesCreated\":0,\"nodesDeleted\":0,\"relationshipsCreated\":0,\"relationshipsDeleted\":2,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/references.ctrl.js",
    "groupTitle": "References"
  },
  {
    "type": "get",
    "url": "/references",
    "title": "Get references",
    "name": "get_references",
    "group": "References",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the source node.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "allowedValues": [
              "1..6"
            ],
            "optional": true,
            "field": "steps",
            "description": "<p>The number of steps to take in the graph to get the related nodes</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":[{\"lastName\":\"Alamain\",\"firstName\":\"Colm\",\"honorificPrefix\":[\"\"],\"middleName\":\"\",\"label\":\"Colm  Alamain\",\"alternateAppelations\":[],\"status\":false,\"_id\":\"45\",\"systemLabels\":[\"Person\"]},{\"firstName\":\"Tomas\",\"lastName\":\"O Hogain\",\"honorificPrefix\":[\"\"],\"middleName\":\"\",\"label\":\"Tomas  O Hogain\",\"alternateAppelations\":[],\"status\":false,\"_id\":\"187\",\"systemLabels\":[\"Person\"]}],\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/references.ctrl.js",
    "groupTitle": "References"
  },
  {
    "type": "put",
    "url": "/reference",
    "title": "Put reference",
    "name": "put_reference",
    "group": "References",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "array",
            "optional": false,
            "field": "items",
            "description": "<p>The entities that will be related.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "items[item]",
            "description": "<p>Two items need to be provided: i) the source entity, ii) the target entity</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "item[_id]",
            "description": "<p>The source/target entity id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "item[type]",
            "description": "<p>The source/target entity type.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "item[role]",
            "description": "<p>The source/target entity role in the relationship if any.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "taxonomyTermId",
            "description": "<p>The relation taxonomy term id. Either the taxonomyTermId or the taxonomyTermLabel must be provided.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "taxonomyTermLabel",
            "description": "<p>The relation taxonomy term labelId. Either the taxonomyTermId or the taxonomyTermLabel must be provided.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example usage",
        "content": "{\n  \"items\": [{\n    \"_id\": \"2069\",\n    \"type\": \"Organisation\"\n  }, {\n    \"_id\": \"337\",\n    \"type\": \"Person\"\n  }],\n  \"taxonomyTermLabel\": \"hasMember\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"nodesCreated\":0,\"nodesDeleted\":0,\"relationshipsCreated\":2,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/references.ctrl.js",
    "groupTitle": "References"
  },
  {
    "type": "put",
    "url": "/references",
    "title": "Put references",
    "name": "put_references",
    "group": "References",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "array",
            "optional": false,
            "field": "items",
            "description": "<p>An array of reference items.</p>"
          },
          {
            "group": "Parameter",
            "type": "object",
            "optional": false,
            "field": "items[item]",
            "description": "<p>Two items need to be provided: i) the source entity, ii) the target entity</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "item[_id]",
            "description": "<p>The source/target entity id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "item[type]",
            "description": "<p>The source/target entity type.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "item[role]",
            "description": "<p>The source/target entity role in the relationship if any.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "taxonomyTermId",
            "description": "<p>The relation taxonomy term id. Either the taxonomyTermId or the taxonomyTermLabel must be provided.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "taxonomyTermLabel",
            "description": "<p>The relation taxonomy term labelId. Either the taxonomyTermId or the taxonomyTermLabel must be provided.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example usage",
        "content": "[{\n  \"items\": [{\n    \"_id\": \"2069\",\n    \"type\": \"Organisation\"\n  }, {\n    \"_id\": \"2255\",\n    \"type\": \"Event\"\n  }],\n  \"taxonomyTermLabel\": \"hasRelation\"\n}, {\n  \"items\": [{\n    \"_id\": \"2460\",\n    \"type\": \"Organisation\"\n  }, {\n    \"_id\": \"2255\",\n    \"type\": \"Event\"\n  }],\n  \"taxonomyTermLabel\": \"hasRelation\"\n}]",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"nodesCreated\":0,\"nodesDeleted\":0,\"relationshipsCreated\":2,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/references.ctrl.js",
    "groupTitle": "References"
  },
  {
    "type": "delete",
    "url": "/resource",
    "title": "Delete classpiece",
    "name": "delete_classpiece",
    "group": "Resources",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the classpiece for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Resource) WHERE id(n)=2069 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":11,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/resource.ctrl.js",
    "groupTitle": "Resources"
  },
  {
    "type": "delete",
    "url": "/resource",
    "title": "Delete resource",
    "name": "delete_resource",
    "group": "Resources",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the resource for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Resource) WHERE id(n)=2069 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":11,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/resource.ctrl.js",
    "groupTitle": "Resources"
  },
  {
    "type": "delete",
    "url": "/resources",
    "title": "Delete resources",
    "name": "delete_resources",
    "group": "Resources",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "array",
            "optional": false,
            "field": "_ids",
            "description": "<p>The ids of the resources for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":[{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Resource) WHERE id(n)=2404 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":5,\"high\":0}}}],\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/resource.ctrl.js",
    "groupTitle": "Resources"
  },
  {
    "type": "get",
    "url": "/resource",
    "title": "Get resource",
    "name": "get_resource",
    "group": "Resources",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested resource.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": {\n    \"_id\": \"389\",\n    \"label\": \"1969-1970\",\n    \"description\": null,\n    \"fileName\": \"1969-1970.jpg\",\n    \"metadata\": {\"image\": {\"default\": {\"height\": 6464, \"width\": 4808, \"extension\": \"jpg\", \"x\": 0, \"y\": 0, \"rotate\": 0},…}},\n    \"paths\": [{\"path\":\"images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\",\"pathType\":\"source\"},…],\n    \"resourceType\": \"image\",\n    \"systemType\": {\"ref\":\"87\"},\n    \"uploadedFile\": null,\n    \"status\": false,\n    \"createdBy\": null,\n    \"createdAt\": null,\n    \"updatedBy\": null,\n    \"updatedAt\": null,\n    \"events\": [],\n    \"organisations\": [],\n    \"people\": [{\"_id\": \"894\", \"term\": {\"label\": \"depicts\", \"role\": \"student\", \"roleLabel\": \"student\"},…},…],\n    \"resources\": [{\"_id\": \"916\", \"term\": {\"label\": \"hasPart\"}, \"ref\": {\"fileName\": \"52.jpg\",…}},…]\n  },\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/resource.ctrl.js",
    "groupTitle": "Resources"
  },
  {
    "type": "get",
    "url": "/resources",
    "title": "Get resources",
    "name": "get_resources",
    "group": "Resources",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "_id",
            "optional": true,
            "field": "_id",
            "description": "<p>An unique _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the resources' labels.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "systemType",
            "description": "<p>A system type id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "resourceType",
            "description": "<p>A resource Type label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>A string to match against the peoples' description.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": {\n    \"currentPage\": 1,\n    \"data\": [{,…}, {\"fileName\": \"1971.jpg\",…}, {\"fileName\": \"1972.jpg\",…}, {\"fileName\": \"1974.jpg\",…}],\n    \"totalItems\": \"4\",\n    \"totalPages\": 1\n  },\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/resource.ctrl.js",
    "groupTitle": "Resources"
  },
  {
    "type": "post",
    "url": "/upload-resource",
    "title": "Upload resource",
    "name": "post_upload_resource",
    "group": "Resources",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "description": "<p>This is a file upload, the parameters should be posted as FormData (<a href=\"https://developer.mozilla.org/en-US/docs/Web/API/FormData\" target=\"_blank\">https://developer.mozilla.org/en-US/docs/Web/API/FormData</a>)</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "file",
            "optional": false,
            "field": "file",
            "description": "<p>The file to be uploaded.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The resource _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>The resource label. If none is provided the file name is used instead.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "systemType",
            "description": "<p>The resource systemType.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"fileName\":\"logo-transparent.png\",\"metadata\":\"{\\\"image\\\":{\\\"default\\\":{\\\"height\\\":275,\\\"width\\\":269,\\\"extension\\\":\\\"png\\\",\\\"x\\\":0,\\\"y\\\":0,\\\"rotate\\\":0}}}\",\"paths\":[\"{\\\"path\\\":\\\"images/fullsize/9e57922b92487c30424595d16df57b8f.png\\\",\\\"pathType\\\":\\\"source\\\"}\",\"{\\\"path\\\":\\\"images/thumbnails/9e57922b92487c30424595d16df57b8f.png\\\",\\\"pathType\\\":\\\"thumbnail\\\"}\"],\"systemType\":\"{\\\"ref\\\":\\\"295\\\"}\",\"label\":\"logo-transparent.png\",\"resourceType\":\"image\",\"status\":false,\"_id\":\"2069\"},\"error\":[],\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/resource.ctrl.js",
    "groupTitle": "Resources"
  },
  {
    "type": "put",
    "url": "/resource",
    "title": "Put resource",
    "name": "put_resource",
    "group": "Resources",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the resource. This should be undefined|null|blank in the creation of a new resource.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The label of the resource.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>The description of the resource.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "filename",
            "description": "<p>The filename of the resource. This value is automatically extracted from the uploaded file during the <a href=\"#api-Resources-post_upload_resource\">upload resource</a> step.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "metadata",
            "description": "<p>The metadata of the resource. This value is automatically extracted from the uploaded file during the <a href=\"#api-Resources-post_upload_resource\">upload resource</a> step.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "paths",
            "description": "<p>The paths of the resource. This value is automatically extracted from the uploaded file during the <a href=\"#api-Resources-post_upload_resource\">upload resource</a> step.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "resourceType",
            "description": "<p>The resourceType of the resource. This value is automatically extracted from the uploaded file during the <a href=\"#api-Resources-post_upload_resource\">upload resource</a> step.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "systemType",
            "description": "<p>The systemType of the resource. The value is selected from the Resource system types taxonomy.</p>"
          },
          {
            "group": "Parameter",
            "type": "file",
            "optional": true,
            "field": "uploadedFile",
            "description": "<p>The uploadedFile of the resource. This should be undefined|null|blank in the creation/update of a resource.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "status",
            "defaultValue": "private",
            "description": "<p>The status of the resource.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"error\":[],\"status\":true,\"data\":{\"fileName\":\"logo-transparent.png\",\"metadata\":\"{\\\"image\\\":{\\\"default\\\":{\\\"height\\\":275,\\\"width\\\":269,\\\"extension\\\":\\\"png\\\",\\\"x\\\":0,\\\"y\\\":0,\\\"rotate\\\":0}}}\",\"updatedBy\":\"260\",\"paths\":[\"{\\\"path\\\":\\\"images/fullsize/9e57922b92487c30424595d16df57b8f.png\\\",\\\"pathType\\\":\\\"source\\\"}\",\"{\\\"path\\\":\\\"images/thumbnails/9e57922b92487c30424595d16df57b8f.png\\\",\\\"pathType\\\":\\\"thumbnail\\\"}\"],\"systemType\":\"{\\\"ref\\\":\\\"295\\\"}\",\"description\":\"\",\"_id\":\"2069\",\"label\":\"logo-transparent.png\",\"updatedAt\":\"2020-01-14T16:30:00.338Z\",\"resourceType\":\"image\",\"status\":false}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/resource.ctrl.js",
    "groupTitle": "Resources"
  },
  {
    "type": "get",
    "url": "/resource",
    "title": "Resource",
    "name": "resource",
    "group": "Resources",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the requested resource</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "resource object": [
          {
            "group": "resource object",
            "type": "object",
            "optional": false,
            "field": "metadata",
            "description": "<p>The resource metadata</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "fileName",
            "description": "<p>The file name of the resource</p>"
          },
          {
            "group": "resource object",
            "type": "array",
            "optional": false,
            "field": "paths",
            "description": "<p>An array containing the path to the fullsize version of the resource and to the thumbnail of the resource</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "systemType",
            "description": "<p>The system type _id</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The label of the resource</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "resourceType",
            "description": "<p>The type of the resource, i.e. image</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "status",
            "description": "<p>If the resource is private or public</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The resource _id</p>"
          },
          {
            "group": "resource object",
            "type": "array",
            "optional": false,
            "field": "events",
            "description": "<p>A list of associated events</p>"
          },
          {
            "group": "resource object",
            "type": "array",
            "optional": false,
            "field": "organisations",
            "description": "<p>A list of associated organisations</p>"
          },
          {
            "group": "resource object",
            "type": "array",
            "optional": false,
            "field": "people",
            "description": "<p>A list of associated people</p>"
          },
          {
            "group": "resource object",
            "type": "array",
            "optional": false,
            "field": "resources",
            "description": "<p>A list of associated resources</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": {\n        \"metadata\": {},\n        \"fileName\": \"1969-1970.jpg\",\n        \"paths\": [\n            {\n                \"path\": \"images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\",\n                \"pathType\": \"source\"\n            },\n            {\n                \"path\": \"images/thumbnails/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\",\n                \"pathType\": \"thumbnail\"\n            }\n        ],\n        \"systemType\": \"{\\\"ref\\\":\\\"87\\\"}\",\n        \"label\": \"1969-1970\",\n        \"resourceType\": \"image\",\n        \"status\": false,\n        \"_id\": \"389\",\n        \"events\": [],\n        \"organisations\": [],\n        \"people\": [],\n        \"resources\": [],\n      },\n  \"error\": [],\n  \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/resource?_id=389",
        "type": "request"
      }
    ],
    "version": "0.0.0",
    "filename": "src/controllers/ui/resources.ctrl.js",
    "groupTitle": "Resources"
  },
  {
    "type": "get",
    "url": "/resources",
    "title": "Resources",
    "name": "resources",
    "group": "Resources",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against a resource label</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>A string to match against a resource description</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "events",
            "description": "<p>An array of event ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "organisations",
            "description": "<p>An array of organisations ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "people",
            "description": "<p>An array of people ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "resources",
            "description": "<p>An array of resources ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "temporal",
            "description": "<p>An array of temporal ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "spatial",
            "description": "<p>An array of spatial ids</p>"
          },
          {
            "group": "Parameter",
            "type": "array",
            "optional": true,
            "field": "resourcesTypes",
            "description": "<p>An array of resource types</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "currentPage",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Success 200",
            "type": "array",
            "optional": false,
            "field": "data",
            "description": "<p>An array of resources objects</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "totalItems",
            "description": "<p>The total number of results</p>"
          },
          {
            "group": "Success 200",
            "type": "number",
            "optional": false,
            "field": "totalPages",
            "description": "<p>The total number of available pages of results</p>"
          }
        ],
        "resource object": [
          {
            "group": "resource object",
            "type": "object",
            "optional": false,
            "field": "Resource",
            "description": "<p>A resource object as part of the data array contains the following fields</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "Resource[metadata]",
            "description": "<p>A stringified JSON object containing the resource metadata</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "Resource[fileName]",
            "description": "<p>The file name of the resource</p>"
          },
          {
            "group": "resource object",
            "type": "array",
            "optional": false,
            "field": "Resource[paths]",
            "description": "<p>An array containing the path to the fullsize version of the resource and to the thumbnail of the resource</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "Resource[systemType]",
            "description": "<p>The system type _id</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "Resource[label]",
            "description": "<p>The label of the resource</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "Resource[resourceType]",
            "description": "<p>The type of the resource, i.e. image</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "Resource[status]",
            "description": "<p>If the resource is private or public.</p>"
          },
          {
            "group": "resource object",
            "type": "string",
            "optional": false,
            "field": "Resource[_id]",
            "description": "<p>The resource _id</p>"
          },
          {
            "group": "resource object",
            "type": "array",
            "optional": false,
            "field": "Resource[systemLabels]",
            "description": "<p>A list of system tags for the resource</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": {\n        \"currentPage\": 1,\n        \"data\": [\n            {\n                \"metadata\": \"\\\"{\\\\\\\"image\\\\\\\":{\\\\\\\"default\\\\\\\":{\\\\\\\"height\\\\\\\":6464,\\\\\\\"width\\\\\\\":4808,\\\\\\\"extension\\\\\\\":\\\\\\\"jpg\\\\\\\",\\\\\\\"x\\\\\\\":0,\\\\\\\"y\\\\\\\":0,\\\\\\\"rotate\\\\\\\":0},\\\\\\\"exif\\\\\\\":{\\\\\\\"image\\\\\\\":{\\\\\\\"XResolution\\\\\\\":240,\\\\\\\"YResolution\\\\\\\":240,\\\\\\\"ResolutionUnit\\\\\\\":2,\\\\\\\"Software\\\\\\\":\\\\\\\"Adobe Photoshop Lightroom Classic 7.3.1 (Windows)\\\\\\\",\\\\\\\"ModifyDate\\\\\\\":\\\\\\\"2018:07:02 12:56:59\\\\\\\",\\\\\\\"ExifOffset\\\\\\\":172},\\\\\\\"thumbnail\\\\\\\":{},\\\\\\\"exif\\\\\\\":{\\\\\\\"ExifVersion\\\\\\\":{\\\\\\\"type\\\\\\\":\\\\\\\"Buffer\\\\\\\",\\\\\\\"data\\\\\\\":[48,50,51,48]},\\\\\\\"ColorSpace\\\\\\\":1},\\\\\\\"gps\\\\\\\":{},\\\\\\\"interoperability\\\\\\\":{},\\\\\\\"makernote\\\\\\\":{}},\\\\\\\"iptc\\\\\\\":{}}}\\\"\",\n                \"fileName\": \"1969-1970.jpg\",\n                \"paths\": [\n                    \"{\\\"path\\\":\\\"images/fullsize/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\\\",\\\"pathType\\\":\\\"source\\\"}\",\n                    \"{\\\"path\\\":\\\"images/thumbnails/46aa1dc4cfa9bf4c4d774b9121b2cd38.jpg\\\",\\\"pathType\\\":\\\"thumbnail\\\"}\"\n                ],\n                \"systemType\": \"{\\\"ref\\\":\\\"87\\\"}\",\n                \"label\": \"1969-1970\",\n                \"resourceType\": \"image\",\n                \"status\": false,\n                \"_id\": \"389\",\n                \"systemLabels\": [\n                    \"Resource\"\n                ]\n            }\n        ],\n        \"totalItems\": 1,\n        \"totalPages\": 1\n    },\n    \"error\": [],\n    \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/resource?label=1971&description=test&page=1&limit=25",
        "type": "request"
      }
    ],
    "version": "0.0.0",
    "filename": "src/controllers/ui/resources.ctrl.js",
    "groupTitle": "Resources"
  },
  {
    "type": "post",
    "url": "/search",
    "title": "Generic search",
    "name": "generic-search",
    "group": "Search",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"people\":220,\"resources\":220,\"organisations\":80,\"events\":0},\"error\":false,\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/search.ctrl.js",
    "groupTitle": "Search"
  },
  {
    "type": "post",
    "url": "/seed-db",
    "title": "Post seed db",
    "name": "post_seed_db",
    "group": "Seed",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>The admin user email.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "password",
            "description": "<p>The admin user password.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/seed/index.js",
    "groupTitle": "Seed"
  },
  {
    "type": "post",
    "url": "/admin-login",
    "title": "Admin login",
    "name": "admin-login",
    "group": "Session",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>The user email</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "password",
            "description": "<p>The user password</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": {\n        \"_id\": \"260\",\n        \"firstName\": \"Admin\",\n        \"lastName\": \"\",\n        \"email\": \"admin@test.com\",\n        \"usergroup\": {\n            \"description\": \"This group has access to the back-end\",\n            \"isDefault\": false,\n            \"isAdmin\": true,\n            \"label\": \"Administrator\",\n            \"_id\": \"401\"\n        },\n        \"token\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3N1ZXIiOiJDbGVyaWN1cyBhcHAiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwiaWQiOiIyNjAiLCJleHBpcmVzSW4iOiIyMDIwLTAxLTE1VDExOjQ1OjM5LjYwOVoiLCJhbGdvcml0aG0iOiJSUzI1NiIsImlzQWRtaW4iOnRydWUsImlhdCI6MTU3OTAwMjMzOX0.LJsBRcM3J5d_wvm4wneQCRDeN3mBRArmCgaosMQzl-0\",\n        \"createdBy\": null,\n        \"createdAt\": null,\n        \"updatedBy\": null,\n        \"updatedAt\": null\n    },\n    \"error\": [],\n    \"msg\": \"\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/authentication.ctrl.js",
    "groupTitle": "Session"
  },
  {
    "type": "post",
    "url": "/admin-session",
    "title": "Admin session",
    "name": "admin-session",
    "group": "Session",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "token",
            "description": "<p>An active jwt token</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\":true,\n  \"data\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3N1ZXIiOiJDbGVyaWN1cyBhcHAiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwiaWQiOiIyNjAiLCJleHBpcmVzSW4iOiIyMDIwLTAxLTE1VDExOjU2OjEwLjQ3OFoiLCJhbGdvcml0aG0iOiJSUzI1NiIsImlzQWRtaW4iOnRydWUsImlhdCI6MTU3OTAwMjk3MH0.O1i9yxQDjeBt0XMaqNzLnAiuBQvtoA3GEo0JDEAdn3M\",\n  \"error\":false,\n  \"msg\":\"Token successfully verified\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/authentication.ctrl.js",
    "groupTitle": "Session"
  },
  {
    "type": "get",
    "url": "/settings",
    "title": "Get settings",
    "name": "get_settings",
    "group": "Settings",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": {\n        \"seedingAllowed\": false\n    },\n    \"error\": [],\n    \"msg\": \"Settings loaded successfully\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/settings.ctrl.js",
    "groupTitle": "Settings"
  },
  {
    "type": "delete",
    "url": "/slideshow-item",
    "title": "Delete slideshow item",
    "name": "delete_slideshow_item",
    "group": "Slideshow",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the slideshow item for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Slideshow) WHERE id(n)=3193 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":50,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/slideshow.ctrl.js",
    "groupTitle": "Slideshow"
  },
  {
    "type": "get",
    "url": "/slideshow-item",
    "title": "Get slideshow item",
    "name": "get_slideshow_item",
    "group": "Slideshow",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"3046\",\"label\":\"test 2\",\"caption\":\"caption 2\",\"order\":\"1\",\"url\":\"http://google.com\",\"status\":\"private\",\"image\":\"3079\",\"imageDetails\":{\"_id\":\"3079\",\"filename\":\"slideshow.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"5889d821aae8cf508f1b12b030dc62fd.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/5889d821aae8cf508f1b12b030dc62fd.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/5889d821aae8cf508f1b12b030dc62fd.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T12:27:09.950Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T12:27:09.950Z\"},\"createdBy\":\"437\",\"createdAt\":\"2020-02-19T12:11:02.733Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T12:27:15.260Z\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested slideshow item.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/slideshow.ctrl.js",
    "groupTitle": "Slideshow"
  },
  {
    "type": "get",
    "url": "/slideshow-items",
    "title": "Get slideshow items",
    "name": "get_slideshow_items",
    "group": "Slideshow",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"data\":[{\"createdAt\":\"2020-02-19T12:11:02.733Z\",\"image\":\"3079\",\"updatedBy\":\"437\",\"createdBy\":\"437\",\"caption\":\"caption 2\",\"_id\":\"3046\",\"label\":\"test 2\",\"url\":\"http://google.com\",\"updatedAt\":\"2020-02-26T12:27:15.260Z\",\"status\":\"private\",\"order\":\"1\",\"systemLabels\":[\"Slideshow\"],\"imageDetails\":{\"_id\":\"3079\",\"filename\":\"slideshow.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"5889d821aae8cf508f1b12b030dc62fd.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/5889d821aae8cf508f1b12b030dc62fd.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/5889d821aae8cf508f1b12b030dc62fd.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T12:27:09.950Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T12:27:09.950Z\"}},{\"createdAt\":\"2020-02-19T12:10:43.691Z\",\"image\":\"2942\",\"updatedBy\":\"437\",\"createdBy\":\"437\",\"caption\":\"test caption\",\"label\":\"test\",\"url\":\"http://www.google.gr\",\"updatedAt\":\"2020-02-19T12:10:43.691Z\",\"order\":0,\"status\":\"private\",\"_id\":\"2876\",\"systemLabels\":[\"Slideshow\"],\"imageDetails\":{\"_id\":\"2942\",\"filename\":\"IMG_20200218_145701.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"64fead2233879c89f47d8358530d1d41.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/64fead2233879c89f47d8358530d1d41.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/64fead2233879c89f47d8358530d1d41.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-18T16:01:16.685Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-18T16:01:16.685Z\"}}],\"totalItems\":2},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/slideshow.ctrl.js",
    "groupTitle": "Slideshow"
  },
  {
    "type": "put",
    "url": "/slideshow-item",
    "title": "Put slideshow item",
    "name": "put_slideshow_item",
    "group": "Slideshow",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the slideshow item. This should be undefined|null|blank in the creation of a new slideshow item.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The slideshow item's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "caption",
            "description": "<p>The slideshow item's caption.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "url",
            "description": "<p>The slideshow item's url.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "order",
            "description": "<p>The slideshow item's order.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "status",
            "defaultValue": "private",
            "description": "<p>The slideshow item's status.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "image",
            "description": "<p>The slideshow item's image id.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\"_id\":\"3046\",\"label\":\"test 2\",\"caption\":\"caption 2\",\"order\":\"1\",\"url\":\"http://google.com\",\"status\":\"private\",\"image\":\"3079\"}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"3046\",\"label\":\"test 2\",\"caption\":\"caption 2\",\"order\":\"1\",\"url\":\"http://google.com\",\"status\":\"private\",\"image\":\"3079\",\"imageDetails\":{\"_id\":\"3079\",\"filename\":\"slideshow.jpg\",\"year\":2020,\"month\":2,\"hashedName\":\"5889d821aae8cf508f1b12b030dc62fd.jpg\",\"paths\":[{\"path\":\"http://localhost:5100/uploads/2020/2/images/5889d821aae8cf508f1b12b030dc62fd.jpg\",\"pathType\":\"source\"},{\"path\":\"http://localhost:5100/uploads/2020/2/thumbnails/5889d821aae8cf508f1b12b030dc62fd.jpg\",\"pathType\":\"thumbnail\"}],\"createdBy\":\"437\",\"createdAt\":\"2020-02-26T12:27:09.950Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-02-26T12:27:09.950Z\"},\"createdBy\":\"437\",\"createdAt\":\"2020-02-19T12:11:02.733Z\",\"updatedBy\":\"437\",\"updatedAt\":\"2020-03-03T11:07:37.507Z\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/slideshow.ctrl.js",
    "groupTitle": "Slideshow"
  },
  {
    "type": "delete",
    "url": "/spatial",
    "title": "Delete spatial",
    "name": "delete_spatial",
    "group": "Spatials",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the spatial for deletion.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/spatial?_id=2514",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Spatial) WHERE id(n)=2514 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":30,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/spatial.ctrl.js",
    "groupTitle": "Spatials"
  },
  {
    "type": "get",
    "url": "/spatial",
    "title": "Get spatial",
    "name": "get_spatial",
    "group": "Spatials",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested spatial</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/spatial?_id=2514",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2514\",\"label\":\"test\",\"streetAddress\":\"address\",\"locality\":\"loc\",\"region\":\"reg\",\"postalCode\":\"pc\",\"country\":\"count\",\"latitude\":\"lat\",\"longitude\":\"lon\",\"locationType\":\"type\",\"note\":\"note\",\"createdBy\":null,\"createdAt\":null,\"updatedBy\":\"260\",\"updatedAt\":\"2020-01-17T10:43:13.764Z\",\"events\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/spatial.ctrl.js",
    "groupTitle": "Spatials"
  },
  {
    "type": "get",
    "url": "/spatials",
    "title": "Get spatials",
    "name": "get_spatials",
    "group": "Spatials",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "_id",
            "optional": true,
            "field": "_id",
            "description": "<p>A unique _id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A label to match against the spatials' label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "country",
            "description": "<p>A country to match against the spatials' countries.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "locationType",
            "description": "<p>A locationType to match against the spatials' locationTypes.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "label",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/spatials?page=1&limit=25",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"note\":\"note\",\"country\":\"count\",\"updatedBy\":\"260\",\"latitude\":\"lat\",\"postalCode\":\"pc\",\"locality\":\"loc\",\"locationType\":\"type\",\"label\":\"test\",\"streetAddress\":\"address\",\"_id\":\"2514\",\"region\":\"reg\",\"longitude\":\"lon\",\"updatedAt\":\"2020-01-17T10:43:13.764Z\",\"systemLabels\":[\"Spatial\"]}],\"totalItems\":\"1\",\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/spatial.ctrl.js",
    "groupTitle": "Spatials"
  },
  {
    "type": "put",
    "url": "/spatial",
    "title": "Put spatial",
    "name": "put_spatial",
    "group": "Spatials",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the spatial. This should be undefined|null|blank in the creation of a new spatial.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The spatial's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "streetAddress",
            "description": "<p>The spatial's street address.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "locality",
            "description": "<p>The spatial's locality.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "region",
            "description": "<p>The spatial's region.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "postalCode",
            "description": "<p>The spatial's region.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "country",
            "description": "<p>The spatial's country.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "latitude",
            "description": "<p>The spatial's latitude.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "longitude",
            "description": "<p>The spatial's longitude.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "locationType",
            "description": "<p>The spatial's locationType.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "note",
            "description": "<p>The spatial's note.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "rawData",
            "description": "<p>The geonames raw data.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\"label\":\"test\",\"streetAddress\":\"address\",\"locality\":\"loc\",\"region\":\"reg\",\"postalCode\":\"pc\",\"country\":\"count\",\"latitude\":\"lat\",\"longitude\":\"lon\",\"locationType\":\"type\",\"note\":\"note\",\"_id\":\"2514\"}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"error\":[],\"status\":true,\"data\":{\"note\":\"note\",\"country\":\"count\",\"updatedBy\":\"260\",\"latitude\":\"lat\",\"postalCode\":\"pc\",\"locality\":\"loc\",\"locationType\":\"type\",\"label\":\"test\",\"streetAddress\":\"address\",\"_id\":\"2514\",\"region\":\"reg\",\"updatedAt\":\"2020-01-17T11:23:02.934Z\",\"longitude\":\"lon\"}}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/spatial.ctrl.js",
    "groupTitle": "Spatials"
  },
  {
    "type": "delete",
    "url": "/taxonomy",
    "title": "Delete taxonomy",
    "name": "delete_taxonomy",
    "group": "Taxonomies",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the taxonomy for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Taxonomy) WHERE id(n)=2480 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":1,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/taxonomy.ctrl.js",
    "groupTitle": "Taxonomies"
  },
  {
    "type": "get",
    "url": "/taxonomies",
    "title": "Get taxonomies",
    "name": "get_taxonomies",
    "group": "Taxonomies",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "systemType",
            "description": "<p>A systemType to match against the taxonomies' systemType.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"systemType\":\"eventTypes\",\"description\":\"The Event types taxonomy contains a list of all the possible event types\",\"label\":\"Event types\",\"labelId\":\"EventTypes\",\"locked\":true,\"_id\":\"81\",\"systemLabels\":[\"Taxonomy\"]},{\"systemType\":\"organisationTypes\",\"description\":\"\",\"label\":\"Organisation types\",\"labelId\":\"OrganisationTypes\",\"locked\":true,\"_id\":\"140\",\"systemLabels\":[\"Taxonomy\"]},{\"systemType\":\"peopleRoles\",\"description\":\"\",\"label\":\"People roles\",\"labelId\":\"PeopleRoles\",\"locked\":true,\"_id\":\"1\",\"systemLabels\":[\"Taxonomy\"]},{\"systemType\":\"relationsTypes\",\"description\":\"The Relations types taxonomy contains the possible relations between the data model entities e.g. [entity]Resource [relation]depicts [entity]Person.\",\"label\":\"Relations types\",\"labelId\":\"RelationsTypes\",\"locked\":true,\"_id\":\"178\",\"systemLabels\":[\"Taxonomy\"]},{\"systemType\":\"resourceSystemTypes\",\"description\":\"\",\"label\":\"Resource system types\",\"labelId\":\"ResourceSystemTypes\",\"locked\":true,\"_id\":\"0\",\"systemLabels\":[\"Taxonomy\"]},{\"systemType\":\"userGroups\",\"description\":\"The available user groups relations to users\",\"label\":\"User groups\",\"labelId\":\"UserGroups\",\"locked\":true,\"_id\":\"101\",\"systemLabels\":[\"Taxonomy\"]}],\"totalItems\":\"6\",\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/taxonomy.ctrl.js",
    "groupTitle": "Taxonomies"
  },
  {
    "type": "get",
    "url": "/taxonomy",
    "title": "Get taxonomy",
    "name": "get_taxonomy",
    "group": "Taxonomies",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested taxonomy. Either the _id or the systemType should be provided.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "systemType",
            "description": "<p>The systemType of the requested taxonomy. Either the _id or the systemType should be provided.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"140\",\"label\":\"Organisation types\",\"locked\":true,\"description\":\"\",\"systemType\":\"organisationTypes\",\"createdBy\":null,\"createdAt\":null,\"updatedBy\":null,\"updatedAt\":null,\"labelId\":\"OrganisationTypes\",\"taxonomyterms\":[{\"inverseLabel\":\"Administrative area\",\"inverseLabelId\":\"AdministrativeArea\",\"labelId\":\"AdministrativeArea\",\"count\":0,\"label\":\"Administrative area\",\"locked\":false,\"scopeNote\":\"This is an organisation that can be viewed as an administrative location division e.g. a diocese, a municipality etc.\",\"_id\":\"179\",\"systemLabels\":[\"TaxonomyTerm\"]},{\"inverseLabel\":\"Diocese\",\"inverseLabelId\":\"Diocese\",\"labelId\":\"Diocese\",\"count\":0,\"label\":\"Diocese\",\"locked\":false,\"scopeNote\":\"A Diocese is a religious administrative location division\",\"_id\":\"20\",\"systemLabels\":[\"TaxonomyTerm\"]},{\"inverseLabel\":\"Religious Order\",\"inverseLabelId\":\"ReligiousOrder\",\"labelId\":\"ReligiousOrder\",\"count\":0,\"label\":\"Religious order\",\"locked\":false,\"scopeNote\":\"A religious order is a religious organisation\",\"_id\":\"141\",\"systemLabels\":[\"TaxonomyTerm\"]}]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/taxonomy.ctrl.js",
    "groupTitle": "Taxonomies"
  },
  {
    "type": "put",
    "url": "/taxonomy",
    "title": "Put taxonomy",
    "name": "put_taxonomy",
    "group": "Taxonomies",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the taxonomy. This should be undefined|null|blank in the creation of a new taxonomy.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The taxonomy's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "locked",
            "defaultValue": "false",
            "description": "<p>If the taxonomy can be updated or not.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "description",
            "description": "<p>A description about the taxonomy.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\n  \"label\":\"Test\",\n  \"description\":\"test description\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"createdAt\":\"2020-01-15T12:56:39.387Z\",\"updatedBy\":\"260\",\"labelId\":\"Test\",\"createdBy\":\"260\",\"systemType\":\"test\",\"description\":\"\",\"label\":\"Test\",\"locked\":false,\"updatedAt\":\"2020-01-15T12:56:39.387Z\",\"_id\":\"2480\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/taxonomy.ctrl.js",
    "groupTitle": "Taxonomies"
  },
  {
    "type": "delete",
    "url": "/taxonomy-term",
    "title": "Delete taxonomy term",
    "name": "delete_taxonomy_term",
    "group": "Taxonomy_terms",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the taxonomy term for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:TaxonomyTerm) WHERE id(n)=2500 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":1,\"high\":0},\"resultAvailableAfter\":{\"low\":9,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/taxonomyTerm.ctrl.js",
    "groupTitle": "Taxonomy_terms"
  },
  {
    "type": "get",
    "url": "/taxonomy-term",
    "title": "Get taxonomy term",
    "name": "get_taxonomy_term",
    "group": "Taxonomy_terms",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested taxonomy term. Either the _id or the labelId or the inverseLabelId should be provided.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "labelId",
            "description": "<p>The labelId of the requested taxonomy term. Either the _id or the labelId or the inverseLabelId should be provided.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "inverseLabelId",
            "description": "<p>The inverseLabelId of the requested taxonomy term. Either the _id or the labelId or the inverseLabelId should be provided.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "entityType",
            "description": "<p>If entityType is provided an entityCount will be returned with a count of all entities associated with the term. One of Event | Organisation | Person | Resource</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"87\",\"label\":\"Classpiece\",\"labelId\":\"Classpiece\",\"locked\":false,\"inverseLabel\":\"Classpiece\",\"inverseLabelId\":\"Classpiece\",\"scopeNote\":null,\"count\":\"0\",\"createdBy\":null,\"createdAt\":null,\"updatedBy\":null,\"updatedAt\":null},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/taxonomyTerm.ctrl.js",
    "groupTitle": "Taxonomy_terms"
  },
  {
    "type": "get",
    "url": "/taxonomy-terms",
    "title": "Get taxonomy terms",
    "name": "get_taxonomy_terms",
    "group": "Taxonomy_terms",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": {\n        \"currentPage\": 1,\n        \"data\": [\n            {\n                \"inverseLabel\": \"Diocese\",\n                \"inverseLabelId\": \"Diocese\",\n                \"labelId\": \"Diocese\",\n                \"count\": 0,\n                \"label\": \"Diocese\",\n                \"locked\": false,\n                \"scopeNote\": \"A Diocese is a religious administrative location division\",\n                \"_id\": \"20\",\n                \"systemLabels\": [\n                    \"TaxonomyTerm\"\n                ]\n            }\n        ],\n        \"totalItems\": 60,\n        \"totalPages\": 3\n    },\n    \"error\": [],\n    \"msg\": \"Query results\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/taxonomyTerm.ctrl.js",
    "groupTitle": "Taxonomy_terms"
  },
  {
    "type": "put",
    "url": "/taxonomy-term",
    "title": "Put taxonomy term",
    "name": "put_taxonomy_term",
    "group": "Taxonomy_terms",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the taxonomy term. This should be undefined|null|blank in the creation of a new taxonomy term.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The taxonomy term's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "locked",
            "defaultValue": "false",
            "description": "<p>If the taxonomy term can be updated or not.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "inverseLabel",
            "description": "<p>The taxonomy term's inverseLabel.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "scopeNote",
            "description": "<p>A scopeNote about the taxonomy term.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\n  \"label\":\"Test\",\n  \"description\":\"test description\"\n}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"error\":[],\"status\":true,\"data\":{\"inverseLabel\":\"enteredSchool\",\"inverseLabelId\":\"enteredSchool\",\"updatedBy\":\"260\",\"labelId\":\"enteredSchool\",\"count\":\"0\",\"_id\":\"102\",\"label\":\"enteredSchool\",\"locked\":false,\"updatedAt\":\"2020-01-15T15:02:48.163Z\"}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/taxonomyTerm.ctrl.js",
    "groupTitle": "Taxonomy_terms"
  },
  {
    "type": "delete",
    "url": "/temporal",
    "title": "Delete temporal",
    "name": "delete_temporal",
    "group": "Temporals",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the temporal for deletion.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/temporal?_id=2514",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Temporal) WHERE id(n)=2514 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":1,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/temporal.ctrl.js",
    "groupTitle": "Temporals"
  },
  {
    "type": "get",
    "url": "/temporal",
    "title": "Get temporal",
    "name": "get_temporal",
    "group": "Temporals",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested temporal</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/temporal?_id=2514",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2514\",\"label\":\"00s\",\"startDate\":\"1990\",\"endDate\":\"1999\",\"format\":\"\",\"createdBy\":\"260\",\"createdAt\":\"2020-01-17T10:07:49.237Z\",\"updatedBy\":\"260\",\"updatedAt\":\"2020-01-17T10:07:49.237Z\",\"events\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/temporal.ctrl.js",
    "groupTitle": "Temporals"
  },
  {
    "type": "get",
    "url": "/temporal",
    "title": "Get temporal",
    "name": "get_temporal",
    "group": "Temporals",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested temporal</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/temporal?_id=2514",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2514\",\"label\":\"00s\",\"startDate\":\"1990\",\"endDate\":\"1999\",\"format\":\"\",\"createdBy\":\"260\",\"createdAt\":\"2020-01-17T10:07:49.237Z\",\"updatedBy\":\"260\",\"updatedAt\":\"2020-01-17T10:07:49.237Z\",\"events\":[]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/temporals.ctrl.js",
    "groupTitle": "Temporals"
  },
  {
    "type": "get",
    "url": "/temporals",
    "title": "Get temporals",
    "name": "get_temporals",
    "group": "Temporals",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A label to match against the temporals' label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/temporals?page=1&limit=25",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"createdAt\":\"2020-01-17T10:07:49.237Z\",\"updatedBy\":\"260\",\"createdBy\":\"260\",\"endDate\":\"1999\",\"format\":\"\",\"label\":\"00s\",\"startDate\":\"1990\",\"updatedAt\":\"2020-01-17T10:07:49.237Z\",\"_id\":\"2514\",\"systemLabels\":[\"Temporal\"]}],\"totalItems\":\"1\",\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/temporal.ctrl.js",
    "groupTitle": "Temporals"
  },
  {
    "type": "get",
    "url": "/temporals",
    "title": "Get temporals",
    "name": "get_temporals",
    "group": "Temporals",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A label to match against the temporals' label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "http://localhost:5100/api/temporals?page=1&limit=25",
        "type": "request"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"createdAt\":\"2020-01-17T10:07:49.237Z\",\"updatedBy\":\"260\",\"createdBy\":\"260\",\"endDate\":\"1999\",\"format\":\"\",\"label\":\"00s\",\"startDate\":\"1990\",\"updatedAt\":\"2020-01-17T10:07:49.237Z\",\"_id\":\"2514\",\"systemLabels\":[\"Temporal\"]}],\"totalItems\":\"1\",\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/ui/temporals.ctrl.js",
    "groupTitle": "Temporals"
  },
  {
    "type": "put",
    "url": "/temporal",
    "title": "Put temporal",
    "name": "put_temporal",
    "group": "Temporals",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the temporal. This should be undefined|null|blank in the creation of a new temporal.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The temporal's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "startDate",
            "description": "<p>The temporal's start date.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "endDate",
            "description": "<p>The temporal's end date.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "format",
            "description": "<p>The temporal's date format.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "{\"label\":\"00s\",\"startDate\":\"1990\",\"endDate\":\"1999\",\"format\":\"\"}",
        "type": "json"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"error\":[],\"status\":true,\"data\":{\"createdAt\":\"2020-01-17T10:07:49.237Z\",\"updatedBy\":\"260\",\"createdBy\":\"260\",\"endDate\":\"1999\",\"format\":\"\",\"label\":\"00s\",\"startDate\":\"1990\",\"updatedAt\":\"2020-01-17T10:07:49.237Z\",\"_id\":\"2514\"}}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/temporal.ctrl.js",
    "groupTitle": "Temporals"
  },
  {
    "type": "get",
    "url": "/create-thumbnails",
    "title": "Create thumbnails",
    "name": "create_thumbnails",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "test",
            "defaultValue": "false",
            "description": "<p>If test is true it returns 200 and stops execution.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":\"Image analysis complete\",\"error\":\"\",\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/meta-parse.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "put",
    "url": "/ingest-classpiece",
    "title": "Ingest classpiece",
    "name": "ingest_classpiece",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "examples": [
      {
        "title": "Example:",
        "content": "{\"data\":\"{\\\"file\\\":\\\"1977.jpg\\\",\\\"classpiece\\\":{\\\"default\\\":{\\\"height\\\":6464,\\\"width\\\":4715,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":0,\\\"y\\\":0,\\\"rotate\\\":0},\\\"exif\\\":{\\\"image\\\":{\\\"XResolution\\\":240,\\\"YResolution\\\":240,\\\"ResolutionUnit\\\":2,\\\"Software\\\":\\\"Adobe Photoshop Lightroom Classic 7.3.1 (Windows)\\\",\\\"ModifyDate\\\":\\\"2018:07:02 12:56:58\\\",\\\"ExifOffset\\\":172},\\\"thumbnail\\\":{},\\\"exif\\\":{\\\"ExifVersion\\\":{\\\"type\\\":\\\"Buffer\\\",\\\"data\\\":[48,50,51,48]},\\\"ColorSpace\\\":1},\\\"gps\\\":{},\\\"interoperability\\\":{},\\\"makernote\\\":{}},\\\"iptc\\\":{},\\\"label\\\":\\\"1977\\\",\\\"fileName\\\":\\\"1977.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/images/processed/thumbnails/1977.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/images/processed/thumbnails/1977.jpg\\\"},\\\"checked\\\":true},\\\"faces\\\":[{\\\"fileName\\\":\\\"0.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/0.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/0.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":112,\\\"width\\\":112,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":813,\\\"y\\\":817},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"1.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/1.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/1.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":79,\\\"width\\\":79,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":115,\\\"y\\\":1910},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"2.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/2.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/2.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":76,\\\"width\\\":76,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":418,\\\"y\\\":1497},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"3.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/3.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/3.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":75,\\\"width\\\":75,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":116,\\\"y\\\":589},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"4.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/4.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/4.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":75,\\\"width\\\":75,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1549,\\\"y\\\":238},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"5.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/5.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/5.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":74,\\\"width\\\":74,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1353,\\\"y\\\":953},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"6.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/6.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/6.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":74,\\\"width\\\":74,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":700,\\\"y\\\":1250},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"7.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/7.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/7.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":74,\\\"width\\\":74,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":603,\\\"y\\\":2132},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"8.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/8.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/8.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":74,\\\"width\\\":74,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1054,\\\"y\\\":408},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"9.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/9.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/9.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":72,\\\"width\\\":72,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":116,\\\"y\\\":213},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"10.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/10.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/10.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":72,\\\"width\\\":72,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":345,\\\"y\\\":346},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"11.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/11.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/11.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":72,\\\"width\\\":72,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":148,\\\"y\\\":1671},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"12.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/12.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/12.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":960,\\\"y\\\":1252},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"13.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/13.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/13.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":833,\\\"y\\\":490},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"14.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/14.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/14.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":618,\\\"y\\\":407},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"15.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/15.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/15.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":632,\\\"y\\\":1508},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"16.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/16.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/16.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1392,\\\"y\\\":1186},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"17.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/17.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/17.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1150,\\\"y\\\":691},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"18.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/18.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/18.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1557,\\\"y\\\":593},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"19.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/19.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/19.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":469,\\\"y\\\":1194},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"20.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/20.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/20.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1319,\\\"y\\\":336},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"21.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/21.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/21.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1564,\\\"y\\\":954},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"22.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/22.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/22.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1056,\\\"y\\\":2149},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"23.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/23.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/23.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":124,\\\"y\\\":2147},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"24.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/24.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/24.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1152,\\\"y\\\":1825},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"25.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/25.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/25.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1453,\\\"y\\\":1437},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"26.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/26.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/26.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1205,\\\"y\\\":1193},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"27.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/27.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/27.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1552,\\\"y\\\":1926},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"28.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/28.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/28.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":530,\\\"y\\\":692},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"29.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/29.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/29.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1552,\\\"y\\\":2161},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"30.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/30.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/30.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":329,\\\"y\\\":1872},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"31.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/31.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/31.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":327,\\\"y\\\":2117},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"32.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/32.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/32.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":106,\\\"y\\\":933},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"33.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/33.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/33.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":518,\\\"y\\\":1819},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"34.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/34.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/34.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":322,\\\"y\\\":943},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"35.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/35.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/35.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":511,\\\"y\\\":938},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"36.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/36.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/36.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1252,\\\"y\\\":1516},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"37.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/37.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/37.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":836,\\\"y\\\":2155},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"38.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/38.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/38.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1344,\\\"y\\\":2127},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"39.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/39.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/39.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":323,\\\"y\\\":648},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"40.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/40.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/40.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1526,\\\"y\\\":1685},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"41.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/41.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/41.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":844,\\\"y\\\":1577},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"42.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/42.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/42.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1338,\\\"y\\\":1870},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"43.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/43.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/43.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":278,\\\"y\\\":1189},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"44.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/44.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/44.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1348,\\\"y\\\":637},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"45.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/45.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/45.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":213,\\\"y\\\":1437},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"46.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/46.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/46.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":64,\\\"width\\\":64,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1029,\\\"y\\\":1515},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"47.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/47.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/47.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":63,\\\"width\\\":63,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1149,\\\"y\\\":960},\\\"type\\\":\\\"\\\",\\\"checked\\\":true},{\\\"fileName\\\":\\\"48.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/48.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/48.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":57,\\\"width\\\":57,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":833,\\\"y\\\":1833},\\\"type\\\":\\\"\\\",\\\"checked\\\":true}]}\"}",
        "type": "json"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "data",
            "description": "<p>A stringified JSON containing all available information about the classpiece.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"classpiece\":{\"error\":[],\"status\":true,\"data\":{\"fileName\":\"1977.jpg\",\"metadata\":\"\\\"{\\\\\\\"image\\\\\\\":{\\\\\\\"default\\\\\\\":{\\\\\\\"height\\\\\\\":6464,\\\\\\\"width\\\\\\\":4715,\\\\\\\"extension\\\\\\\":\\\\\\\"jpg\\\\\\\",\\\\\\\"x\\\\\\\":0,\\\\\\\"y\\\\\\\":0,\\\\\\\"rotate\\\\\\\":0},\\\\\\\"exif\\\\\\\":{\\\\\\\"image\\\\\\\":{\\\\\\\"XResolution\\\\\\\":240,\\\\\\\"YResolution\\\\\\\":240,\\\\\\\"ResolutionUnit\\\\\\\":2,\\\\\\\"Software\\\\\\\":\\\\\\\"Adobe Photoshop Lightroom Classic 7.3.1 (Windows)\\\\\\\",\\\\\\\"ModifyDate\\\\\\\":\\\\\\\"2018:07:02 12:56:58\\\\\\\",\\\\\\\"ExifOffset\\\\\\\":172},\\\\\\\"thumbnail\\\\\\\":{},\\\\\\\"exif\\\\\\\":{\\\\\\\"ExifVersion\\\\\\\":{\\\\\\\"type\\\\\\\":\\\\\\\"Buffer\\\\\\\",\\\\\\\"data\\\\\\\":[48,50,51,48]},\\\\\\\"ColorSpace\\\\\\\":1},\\\\\\\"gps\\\\\\\":{},\\\\\\\"interoperability\\\\\\\":{},\\\\\\\"makernote\\\\\\\":{}},\\\\\\\"iptc\\\\\\\":{}}}\\\"\",\"paths\":[\"\\\"{\\\\\\\"path\\\\\\\":\\\\\\\"images/fullsize/125aafc838d8a62ab579148adf01fe41.jpg\\\\\\\",\\\\\\\"pathType\\\\\\\":\\\\\\\"source\\\\\\\"}\\\"\",\"\\\"{\\\\\\\"path\\\\\\\":\\\\\\\"images/thumbnails/125aafc838d8a62ab579148adf01fe41.jpg\\\\\\\",\\\\\\\"pathType\\\\\\\":\\\\\\\"thumbnail\\\\\\\"}\\\"\"],\"systemType\":\"{\\\"ref\\\":\\\"87\\\"}\",\"label\":\"1977\",\"resourceType\":\"image\",\"status\":\"private\",\"_id\":\"2536\"}},\"faces\":[]},\"error\":false,\"msg\":[]}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/prepare-ingestion.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "get",
    "url": "/meta-parse-class-piece",
    "title": "List classpiece",
    "name": "list_classpiece",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "file",
            "description": "<p>The filename of the requested classpiece.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":\"Image analysis complete\",\"error\":\"\",\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/computer-vision.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "get",
    "url": "/meta-parse-class-piece",
    "title": "Meta-parse classpiece",
    "name": "list_classpiece",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "file",
            "description": "<p>The filename of the requested classpiece.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":\"Face thumbnails created successfully\",\"error\":\"\",\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/meta-parse.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "get",
    "url": "/list-class-piece",
    "title": "List classpiece",
    "name": "list_classpiece",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "file",
            "description": "<p>The filename of the requested classpiece.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":[{\"name\":\"1969-1970.jpg\",\"thumbnail\":\"http://localhost:5100/images/processed/thumbnails/1969-1970.jpg\",\"fullsize\":\"http://localhost:5100/images/processed/fullsize/1969-1970.jpg\",\"compressed\":\"http://localhost:5100/images/processed/compressed/1969-1970.jpg\",\"facesThumbnails\":true,\"faces\":\"http://localhost:5100/output/1969-1970/json/1969-1970-faces.json\",\"text\":\"http://localhost:5100/output/1969-1970/json/1969-1970-text.json\"}],\"error\":false,\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/meta-parse.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "get",
    "url": "/list-class-pieces",
    "title": "List classpieces",
    "name": "list_classpieces",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n    \"status\": true,\n    \"data\": [\n        {\n            \"name\": \"1969-1970.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1969-1970.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1969-1970.jpg\"\n        },\n        {\n            \"name\": \"1971.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1971.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1971.jpg\"\n        },\n        {\n            \"name\": \"1972.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1972.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1972.jpg\"\n        },\n        {\n            \"name\": \"1973.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1973.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1973.jpg\"\n        },\n        {\n            \"name\": \"1974.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1974.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1974.jpg\"\n        },\n        {\n            \"name\": \"1975.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1975.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1975.jpg\"\n        },\n        {\n            \"name\": \"1976.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1976.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1976.jpg\"\n        },\n        {\n            \"name\": \"1977.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1977.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1977.jpg\"\n        },\n        {\n            \"name\": \"1978.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1978.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1978.jpg\"\n        },\n        {\n            \"name\": \"1979.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1979.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1979.jpg\"\n        },\n        {\n            \"name\": \"1980.jpg\",\n            \"thumbnail\": \"http://localhost:5100/images/processed/thumbnails/1980.jpg\",\n            \"fullsize\": \"http://localhost:5100/images/processed/fullsize/1980.jpg\"\n        }\n    ],\n    \"error\": false,\n    \"msg\": \"\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/meta-parse.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "put",
    "url": "/prepare-classpiece-identify-duplicates",
    "title": "Prepare classpiece identify duplicates",
    "name": "prepare_classpiece_identify_duplicates",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "faces",
            "description": "<p>A stringified JSON containing all available information about a classpiece faces.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\n  \"status\": true,\n  \"data\": \"[{\\\"fileName\\\":\\\"0.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/0.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/0.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":112,\\\"width\\\":112,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":813,\\\"y\\\":817},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"1.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/1.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/1.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":79,\\\"width\\\":79,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":115,\\\"y\\\":1910},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"2.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/2.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/2.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":76,\\\"width\\\":76,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":418,\\\"y\\\":1497},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"3.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/3.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/3.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":75,\\\"width\\\":75,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":116,\\\"y\\\":589},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"4.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/4.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/4.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":75,\\\"width\\\":75,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1549,\\\"y\\\":238},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"5.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/5.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/5.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":74,\\\"width\\\":74,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1353,\\\"y\\\":953},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"6.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/6.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/6.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":74,\\\"width\\\":74,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":700,\\\"y\\\":1250},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"7.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/7.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/7.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":74,\\\"width\\\":74,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":603,\\\"y\\\":2132},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"8.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/8.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/8.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":74,\\\"width\\\":74,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1054,\\\"y\\\":408},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"9.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/9.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/9.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":72,\\\"width\\\":72,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":116,\\\"y\\\":213},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"10.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/10.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/10.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":72,\\\"width\\\":72,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":345,\\\"y\\\":346},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"11.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/11.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/11.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":72,\\\"width\\\":72,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":148,\\\"y\\\":1671},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"12.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/12.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/12.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":960,\\\"y\\\":1252},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"13.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/13.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/13.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":833,\\\"y\\\":490},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"14.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/14.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/14.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":618,\\\"y\\\":407},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"15.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/15.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/15.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":632,\\\"y\\\":1508},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"16.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/16.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/16.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1392,\\\"y\\\":1186},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"17.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/17.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/17.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1150,\\\"y\\\":691},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"18.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/18.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/18.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1557,\\\"y\\\":593},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"19.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/19.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/19.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":71,\\\"width\\\":71,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":469,\\\"y\\\":1194},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"20.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/20.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/20.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1319,\\\"y\\\":336},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"21.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/21.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/21.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1564,\\\"y\\\":954},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"22.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/22.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/22.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1056,\\\"y\\\":2149},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"23.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/23.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/23.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":124,\\\"y\\\":2147},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"24.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/24.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/24.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1152,\\\"y\\\":1825},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"25.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/25.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/25.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1453,\\\"y\\\":1437},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"26.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/26.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/26.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1205,\\\"y\\\":1193},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"27.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/27.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/27.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":69,\\\"width\\\":69,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1552,\\\"y\\\":1926},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"28.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/28.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/28.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":530,\\\"y\\\":692},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"29.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/29.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/29.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1552,\\\"y\\\":2161},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"30.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/30.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/30.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":329,\\\"y\\\":1872},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"31.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/31.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/31.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":327,\\\"y\\\":2117},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"32.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/32.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/32.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":68,\\\"width\\\":68,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":106,\\\"y\\\":933},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"33.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/33.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/33.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":518,\\\"y\\\":1819},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"34.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/34.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/34.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":322,\\\"y\\\":943},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"35.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/35.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/35.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":511,\\\"y\\\":938},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"36.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/36.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/36.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1252,\\\"y\\\":1516},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"37.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/37.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/37.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":836,\\\"y\\\":2155},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"38.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/38.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/38.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1344,\\\"y\\\":2127},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"39.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/39.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/39.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":323,\\\"y\\\":648},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"40.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/40.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/40.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":67,\\\"width\\\":67,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1526,\\\"y\\\":1685},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"41.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/41.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/41.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":844,\\\"y\\\":1577},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"42.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/42.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/42.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1338,\\\"y\\\":1870},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"43.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/43.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/43.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":278,\\\"y\\\":1189},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"44.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/44.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/44.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1348,\\\"y\\\":637},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"45.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/45.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/45.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":65,\\\"width\\\":65,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":213,\\\"y\\\":1437},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"46.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/46.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/46.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":64,\\\"width\\\":64,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1029,\\\"y\\\":1515},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"47.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/47.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/47.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":63,\\\"width\\\":63,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":1149,\\\"y\\\":960},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]},{\\\"fileName\\\":\\\"48.jpg\\\",\\\"thumbnail\\\":{\\\"path\\\":\\\"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/48.jpg\\\",\\\"src\\\":\\\"http://localhost:5100/output/1977/thumbnails/48.jpg\\\"},\\\"honorificPrefix\\\":\\\"\\\",\\\"firstName\\\":\\\"\\\",\\\"middleName\\\":\\\"\\\",\\\"lastName\\\":\\\"\\\",\\\"diocese\\\":\\\"\\\",\\\"dioceseType\\\":\\\"\\\",\\\"default\\\":{\\\"height\\\":57,\\\"width\\\":57,\\\"extension\\\":\\\"jpg\\\",\\\"x\\\":833,\\\"y\\\":1833},\\\"type\\\":\\\"\\\",\\\"checked\\\":true,\\\"matches\\\":[]}]\",\n  \"error\": false,\n  \"msg\": \"\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/prepare-ingestion.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "get",
    "url": "/prepare-classpiece-ingestion",
    "title": "Prepare classpiece ingestion",
    "name": "prepare_classpiece_ingestion",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "file",
            "description": "<p>The filename of the requested classpiece.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "\"status\": true, \"data\": {\n  \"classpiece\": {\n    \"default\": {\n      \"height\": 6464,\n      \"width\": 4715,\n      \"extension\": \"jpg\",\n      \"x\": 0,\n      \"y\": 0,\n      \"rotate\": 0\n    },\n    \"exif\": {\n      \"image\": {\n        \"XResolution\": 240,\n        \"YResolution\": 240,\n        \"ResolutionUnit\": 2,\n        \"Software\": \"Adobe Photoshop Lightroom Classic 7.3.1 (Windows)\",\n        \"ModifyDate\": \"2018:07:02 12:56:58\",\n        \"ExifOffset\": 172\n      },\n      \"thumbnail\": {},\n      \"exif\": {\n        \"ExifVersion\": {\n          \"type\": \"Buffer\",\n          \"data\": [48, 50, 51, 48]\n        },\n        \"ColorSpace\": 1\n      },\n      \"gps\": {},\n      \"interoperability\": {},\n      \"makernote\": {}\n    },\n    \"iptc\": {},\n    \"label\": \"1977\",\n    \"fileName\": \"1977.jpg\",\n    \"thumbnail\": {\n      \"path\": \"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/images/processed/thumbnails/1977.jpg\",\n      \"src\": \"http://localhost:5100/images/processed/thumbnails/1977.jpg\"\n    }\n  },\n  \"faces\": [{\n    \"fileName\": \"0.jpg\",\n    \"thumbnail\": {\n      \"path\": \"/Users/stavrosangelis/htdocs/ahi/clericus-neo4j/resources/output/1977/thumbnails/0.jpg\",\n      \"src\": \"http://localhost:5100/output/1977/thumbnails/0.jpg\"\n    },\n    \"honorificPrefix\": \"\",\n    \"firstName\": \"\",\n    \"middleName\": \"\",\n    \"lastName\": \"\",\n    \"diocese\": \"\",\n    \"dioceseType\": \"\",\n    \"default\": {\n      \"height\": 112,\n      \"width\": 112,\n      \"extension\": \"jpg\",\n      \"x\": 813,\n      \"y\": 817\n    },\n    \"type\": \"\"\n  }, ],\n  \"db_classpiece\": \"0\"\n}, \"error\": false, \"msg\": \"\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/prepare-ingestion.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "post",
    "url": "/query-texts",
    "title": "Query texts",
    "name": "query_texts",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "array",
            "optional": false,
            "field": "texts",
            "description": "<p>An array of strings.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":[{\"word\":\"Chanting\",\"type\":null,\"count\":null},{\"word\":\"Ocaling\",\"type\":null,\"count\":null},{\"word\":\"ARD\",\"type\":\"firstName\",\"count\":9},{\"word\":\"MACHA\",\"type\":\"lastName\",\"count\":2}],\"error\":[],\"msg\":\"Word counts results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/meta-parse.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "post",
    "url": "/update-class-piece-faces",
    "title": "Update classpiece faces",
    "name": "update_classpiece_faces",
    "group": "Tools",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "file",
            "description": "<p>The filename of the requested classpiece.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "faces",
            "description": "<p>A stringified JSON containing all available information about a classpiece faces.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":\"Face selections have been saved successfully\",\"error\":\"\",\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/tools/meta-parse.ctrl.js",
    "groupTitle": "Tools"
  },
  {
    "type": "delete",
    "url": "/uploaded-file",
    "title": "Delete uploaded-file",
    "name": "delete_uploaded-file",
    "group": "Uploaded_Files",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the article for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Article) WHERE id(n)=2880 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":3,\"high\":0}}},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/uploadedFile.ctrl.js",
    "groupTitle": "Uploaded_Files"
  },
  {
    "type": "get",
    "url": "/uploaded-file",
    "title": "Get uploaded-file",
    "name": "get_uploaded-file",
    "group": "Uploaded_Files",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested uploaded-file.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/uploadedFile.ctrl.js",
    "groupTitle": "Uploaded_Files"
  },
  {
    "type": "get",
    "url": "/uploaded-files",
    "title": "Get uploaded files",
    "name": "get_uploaded_files",
    "group": "Uploaded_Files",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"data\":[{\"createdAt\":\"2020-01-27T15:55:23.499Z\",\"templatePosition\":\"\",\"label\":\"Top Article\",\"_id\":\"2822\",\"updatedAt\":\"2020-01-27T17:55:15.742Z\",\"systemLabels\":[\"Article\"]},{\"createdAt\":\"2020-01-27T17:43:44.578Z\",\"label\":\"Bottom Article\",\"templatePosition\":\"bottom\",\"updatedAt\":\"2020-01-27T17:43:44.578Z\",\"_id\":\"2683\",\"systemLabels\":[\"Article\"]}]},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/uploadedFile.ctrl.js",
    "groupTitle": "Uploaded_Files"
  },
  {
    "type": "post",
    "url": "/uploaded-file",
    "title": "Put uploaded-file",
    "name": "post_uploaded-file",
    "group": "Uploaded_Files",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "formData",
            "optional": true,
            "field": "file",
            "description": "<p>A form data object with the name &quot;file&quot; containing the filename and the file blob.</p>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example:",
        "content": "Content-Disposition: form-data; name=\"file\"; filename=\"some-file.jpg\"\nContent-Type: image/jpeg",
        "type": "formData"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"image\":\"http://localhost:5100/2020/2/images/fac02fb4bfcaabccd3653dc5a5e68e0b.jpg\",\"thumbnail\":\"http://localhost:5100/2020/2/thumbnails/fac02fb4bfcaabccd3653dc5a5e68e0b.jpg\"},\"error\":false,\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/uploadedFile.ctrl.js",
    "groupTitle": "Uploaded_Files"
  },
  {
    "type": "delete",
    "url": "/usergroup",
    "title": "Delete usergroup",
    "name": "delete_usergroup",
    "group": "Usergroups",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the usergroup for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"error\":[],\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:Usergroup) WHERE id(n)=2656 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":11,\"high\":0}}}}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/usergroup.ctrl.js",
    "groupTitle": "Usergroups"
  },
  {
    "type": "get",
    "url": "/user-group",
    "title": "Get usergroup",
    "name": "get_usergroup",
    "group": "Usergroups",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested usergroup.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"240\",\"label\":\"Public\",\"description\":\"This group has only access to the front-end\",\"isAdmin\":false,\"isDefault\":true,\"createdBy\":null,\"createdAt\":null,\"updatedBy\":null,\"updatedAt\":null},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/usergroup.ctrl.js",
    "groupTitle": "Usergroups"
  },
  {
    "type": "get",
    "url": "/user-groups",
    "title": "Get usergroups",
    "name": "get_usergroups",
    "group": "Usergroups",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the usergroup's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "label",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"description\":\"This group has only access to the front-end\",\"isDefault\":true,\"isAdmin\":false,\"label\":\"Public\",\"_id\":\"240\",\"systemLabels\":[\"Usergroup\"]},{\"description\":\"This group has access to the back-end\",\"isDefault\":false,\"isAdmin\":true,\"label\":\"Administrator\",\"_id\":\"401\",\"systemLabels\":[\"Usergroup\"]}],\"totalItems\":2,\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/usergroup.ctrl.js",
    "groupTitle": "Usergroups"
  },
  {
    "type": "put",
    "url": "/user-group",
    "title": "Put usergroup",
    "name": "put_usergroup",
    "group": "Usergroups",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the usergroup. This should be undefined|null|blank in the creation of a new usergroup.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "label",
            "description": "<p>The usergroup's label.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "isAdmin",
            "defaultValue": "false",
            "description": "<p>If the usergroup has access to the administration back-end.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "isDefault",
            "defaultValue": "false",
            "description": "<p>If this is the default usergroup.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"2656\",\"label\":\"test\",\"description\":\"\",\"isAdmin\":false,\"isDefault\":false,\"createdBy\":\"260\",\"createdAt\":\"2020-01-15T17:03:23.588Z\",\"updatedBy\":\"260\",\"updatedAt\":\"2020-01-15T17:03:23.588Z\"},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/usergroup.ctrl.js",
    "groupTitle": "Usergroups"
  },
  {
    "type": "delete",
    "url": "/user",
    "title": "Delete user",
    "name": "delete_user",
    "group": "Users",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The id of the user for deletion.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"error\":[],\"data\":{\"records\":[],\"summary\":{\"statement\":{\"text\":\"MATCH (n:User) WHERE id(n)=2656 DELETE n\",\"parameters\":{}},\"statementType\":\"w\",\"counters\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"updateStatistics\":{\"_stats\":{\"nodesCreated\":0,\"nodesDeleted\":1,\"relationshipsCreated\":0,\"relationshipsDeleted\":0,\"propertiesSet\":0,\"labelsAdded\":0,\"labelsRemoved\":0,\"indexesAdded\":0,\"indexesRemoved\":0,\"constraintsAdded\":0,\"constraintsRemoved\":0}},\"plan\":false,\"profile\":false,\"notifications\":[],\"server\":{\"address\":\"localhost:7687\",\"version\":\"Neo4j/3.5.12\"},\"resultConsumedAfter\":{\"low\":0,\"high\":0},\"resultAvailableAfter\":{\"low\":20,\"high\":0}}}}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/user.ctrl.js",
    "groupTitle": "Users"
  },
  {
    "type": "get",
    "url": "/user",
    "title": "Get user",
    "name": "get_user",
    "group": "Users",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested user.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"_id\":\"260\",\"firstName\":\"Admin\",\"lastName\":\"\",\"email\":\"admin@test.com\",\"usergroup\":{\"description\":\"This group has access to the back-end\",\"isDefault\":false,\"isAdmin\":true,\"label\":\"Administrator\",\"_id\":\"401\"},\"createdBy\":null,\"createdAt\":null,\"updatedBy\":null,\"updatedAt\":null,\"hasPassword\":true},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/user.ctrl.js",
    "groupTitle": "Users"
  },
  {
    "type": "get",
    "url": "/users",
    "title": "Get users",
    "name": "get_users",
    "group": "Users",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "label",
            "description": "<p>A string to match against the users' first and last name.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "orderField",
            "defaultValue": "firstName",
            "description": "<p>The field to order the results by.</p>"
          },
          {
            "group": "Parameter",
            "type": "boolean",
            "optional": true,
            "field": "orderDesc",
            "defaultValue": "false",
            "description": "<p>If the results should be ordered in a descending order.</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "page",
            "defaultValue": "1",
            "description": "<p>The current page of results</p>"
          },
          {
            "group": "Parameter",
            "type": "number",
            "optional": true,
            "field": "limit",
            "defaultValue": "25",
            "description": "<p>The number of results per page</p>"
          },
          {
            "group": "Parameter",
            "type": "usergroup",
            "optional": true,
            "field": "string",
            "description": "<p>A string with the label of the corresponding usergroup</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"currentPage\":1,\"data\":[{\"firstName\":\"Admin\",\"lastName\":\"\",\"email\":\"admin@test.com\",\"_id\":\"260\",\"systemLabels\":[\"User\"]}],\"totalItems\":1,\"totalPages\":1},\"error\":[],\"msg\":\"Query results\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/user.ctrl.js",
    "groupTitle": "Users"
  },
  {
    "type": "post",
    "url": "/user-password",
    "title": "Post user password",
    "name": "post_user_password",
    "group": "Users",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the user.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "password",
            "description": "<p>The user's new password.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "passwordRepeat",
            "description": "<p>The user's new password repeat.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"status\":true,\"data\":{\"error\":[],\"status\":true,\"data\":{\"lastName\":\"test 2\",\"createdAt\":\"2020-01-15T16:54:49.345Z\",\"firstName\":\"test 2\",\"password\":\"$argon2i$v=19$m=4096,t=3,p=1$ASReF+F6uNDu/x1pQjzABg$10eyaxG8yCh7rPqUVKx2CDejIYe6mAyMn5sUWx2ARJQ\",\"updatedBy\":\"260\",\"createdBy\":\"260\",\"usergroup\":\"240\",\"email\":\"test3@test.com\",\"updatedAt\":\"2020-01-15T16:54:49.345Z\",\"token\":false,\"_id\":\"2656\"}},\"error\":[],\"msg\":\"\"}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/user.ctrl.js",
    "groupTitle": "Users"
  },
  {
    "type": "put",
    "url": "/user",
    "title": "Put user",
    "name": "put_user",
    "group": "Users",
    "permission": [
      {
        "name": "admin",
        "title": "This endpoint is only available to users with administrator priviledges",
        "description": ""
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "_id",
            "description": "<p>The _id of the user. This should be undefined|null|blank in the creation of a new user.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "firstName",
            "description": "<p>The user's first name.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "lastName",
            "description": "<p>The user's last name.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "email",
            "description": "<p>The user's email.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "usergroup",
            "description": "<p>The user's usergroup id.</p>"
          },
          {
            "group": "Parameter",
            "type": "string",
            "optional": true,
            "field": "password",
            "description": "<p>The user's password.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "{\"error\":[],\"status\":true,\"data\":{\"firstName\":\"\",\"createdAt\":\"2020-01-15T16:49:21.096Z\",\"lastName\":\"\",\"updatedBy\":\"260\",\"createdBy\":\"260\",\"usergroup\":\"240\",\"email\":\"test@test.com\",\"token\":false,\"updatedAt\":\"2020-01-15T16:49:21.096Z\",\"_id\":\"2656\"}}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/controllers/user.ctrl.js",
    "groupTitle": "Users"
  },
  {
    "type": "get",
    "url": "/import-plan",
    "title": "Get import",
    "name": "get_import",
    "group": "imports",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "_id",
            "description": "<p>The _id of the requested import.</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "src/controllers/importPlan.ctrl.js",
    "groupTitle": "imports"
  }
] });
