const fs = require('fs');
const path = require('path');
const { parse } = require('querystring');
const assert = require('assert');
const helpers = require('../../helpers');
const driver = require("../../config/db-driver");

const ExifImage = require('exif').ExifImage;
const IptcImage = require('node-iptc');
const sizeOfImage = require('image-size');
const crypto = require("crypto");

const resourcesPath = process.env.RESOURCESPATH;
const serverURL = process.env.SERVERURL;
const archivePath = process.env.ARCHIVEPATH;

const parseRequestData = helpers.parseRequestData;

const referencesController = require('../references.ctrl')
const TaxonomyTerm = require('../TaxonomyTerm.ctrl').TaxonomyTerm;
const Resource = require('../resource.ctrl').Resource;
const Person = require('../person.ctrl').Person;
const Organisation = require('../organisation.ctrl').Organisation;

const preIngestionReportClassPiece = async(req, resp) => {
  let parameters = req.query;
  let file = parameters.file;
  if (typeof file==="undefined" || file==="") {
    resp.json({
      status: false,
      data: '',
      error: true,
      msg: 'Please provide a valid file name to continue',
    })
    return false;
  }

  let fileName = path.parse(file).name;
  let classPieceSource = resourcesPath+"images/processed/fullsize/"+file;
  let outputDir = resourcesPath+"output/"+fileName+"/";
  let outputThumbnailsDir = resourcesPath+"output/"+fileName+"/thumbnails/";
  let outputJsonDir = resourcesPath+"output/"+fileName+"/json/";
  // class piece
  var classPiecePromise = await classPieceImageResource(classPieceSource,fileName);
  var classPieceFaces = await facesImageResources(outputJsonDir+fileName+"-faces.json",fileName);

  var checkIfClassPieceIsImported = await new Promise(async(resolve, reject) => {
    let session = driver.session();
    let count = await session.writeTransaction(tx=>
      tx.run("MATCH (n:Resource) WHERE n.label='"+fileName+"' AND n.fileName='"+file+"' RETURN count(*) as c")
    )
    .then(result=> {
      session.close()
      let resultRecord = result.records[0];
      let countObj = resultRecord.toObject();
      helpers.prepareOutput(countObj);
      let output = countObj['c'];
      return output;
    });
    resolve(count);
  })
  .catch((error)=> {
    console.log(error);
  });

  let all = await Promise.all([classPiecePromise,classPieceFaces,checkIfClassPieceIsImported]).then(data=> {
    let classPieceJson = data[0];
    classPieceJson.label = fileName;
    classPieceJson.fileName = file;
    classPieceJson.thumbnail = {
      path: resourcesPath+"images/processed/thumbnails/"+file,
      src: serverURL+"images/processed/thumbnails/"+file
    }
    let faces = data[1];
    let dbClasspiece = null;
    if (data[2].length>0) {
      dbClasspiece = data[2];
    }
    let response = {};
    response.classpiece = classPieceJson;
    response.faces = faces;
    response.db_classpiece = dbClasspiece;
    resp.json({
      status: true,
      data: response,
      error: false,
      msg: '',
    })
  });
  return all;
}

const classPieceIdentifyDuplicates = async(req, resp) => {
  let postData = req.body;
  let faces = {};
  if (typeof postData.faces!=="undefined") {
    faces = JSON.parse(postData.faces);
  }
  let newFaces = [];
  let newFacesPromises = [];
  for(let i=0; i<faces.length; i++) {
    let facePromise = new Promise(async(resolve, reject) => {
      let face = faces[i];
      // compare person
      let queryParams = "";
      let firstName = "";
      let lastName = "";
      if (typeof face.firstName!=="undefined") {
        firstName = face.firstName.toLowerCase();
        if (firstName!=="") {
          queryParams = "LOWER(n.firstName) =~ LOWER('.*"+firstName+".*') ";
        }
      }
      if (typeof face.lastName!=="undefined") {
        lastName = face.lastName.toLowerCase();
        if (queryParams !=="") {
          queryParams += " AND ";
        }
        queryParams = "LOWER(n.firstName) =~ LOWER('.*"+firstName+".*') ";
      }
      if (queryParams!=="") {
        queryParams = "WHERE "+queryParams;
      }

      if (queryParams!=="") {
        let session = driver.session()
        let query = "MATCH (n:Person) "+queryParams+" RETURN n";
        let nodesPromise = await session.writeTransaction(tx=>
          tx.run(query,{})
        )
        .then(result=> {
          session.close();
          return result.records;
        })
        .catch((error) => {
          console.log(error)
        });
        let nodes = helpers.normalizeRecordsOutput(nodesPromise);
        let returnMatches = [];
        for (let j=0;j<nodes.length; j++) {
          let matchedFace = nodes[j];
          let score = 0;
          if (matchedFace.firstName.toLowerCase() === firstName.toLowerCase()) {
            score += 35;
          }
          if (matchedFace.lastName.toLowerCase() === lastName.toLowerCase()) {
            score += 35;
          }
          if (matchedFace.fnameSoundex === helpers.soundex(firstName)) {
            score += 15;
          }
          if (matchedFace.lnameSoundex === helpers.soundex(lastName)) {
            score += 15;
          }
          if (score>15) {
            let newFaceMatch = matchedFace;
            newFaceMatch.score = score;
            returnMatches.push(newFaceMatch);
          }
        }
        face.matches = returnMatches;
        resolve(face);
      }
      else {
        resolve(face);
      }
    })
    .catch((error)=> {
      console.log(error);
    });
    newFacesPromises.push(facePromise);
  }

  let duplicates = await Promise.all(newFacesPromises).then(data=> {
    return data;
  });

  resp.json({
    status: true,
    data: duplicates,
    error: false,
    msg: '',
  })
}

const ingestClasspiece = async(req, resp) => {
  let postData = req.body;
  let data = JSON.parse(postData.data);

  let file = data.file;
  let errors = [];
  let dbClassPiece = {};
  let dbFaces = [];
  let faces = [];
  let classpiece = null;

  // 1. ingest class piece
  if (typeof data.classpiece!=="undefined") {
    classpiece = data.classpiece;

    let dbClassPiece = await ingestClasspieceImage(classpiece);
    classpiece._id = dbClassPiece.data._id;
  }
  // 2. ingest and link faces
  if (typeof data.faces!=="undefined") {
    let faces = data.faces;
    let facesPromises = [];
    for (let i=0;i<faces.length; i++) {
      let face = faces[i];
      let newFace = {};

      let ingestPersonDB = ingestPerson(face, classpiece);
      facesPromises.push(ingestPersonDB);
    }
    dbFaces = await Promise.all(facesPromises).then(data=>{
      return data;
    })
    .catch((error)=> {
      return error;
    });
  }

  let response = {};
  response.classpiece = dbClassPiece;
  response.faces = dbFaces;

  resp.json({
    status: true,
    data: response,
    error: false,
    msg: errors,
  });
}

var classPieceImageResource = async(imgPath) => {
  var imgDimensionsPromise = imgDimensions(imgPath);
  var exifPromise = imageExif(imgPath);
  var iptcPromise = imageIptc(imgPath);
  let output = await Promise.all([imgDimensionsPromise,exifPromise,iptcPromise]).then((data)=> {
    let imageMetadata = {};
    let defaultValues = data[0];
    defaultValues.x = 0;
    defaultValues.y = 0;
    defaultValues.rotate = 0;

    let exifValues = null;
    let iptcValues = null;
    if (typeof data[1]!=="undefined" && data[1]!==false) {
      exifValues = data[1];
    }
    if (typeof data[2]!=="undefined" && data[2]!==false) {
      iptcValues = data[2];
    }
    imageMetadata.default = defaultValues;
    imageMetadata.exif = exifValues;
    imageMetadata.iptc = iptcValues;
    return imageMetadata;
  })
  .catch((error)=> {
    console.log(error);
  });
  return output;
}

var facesImageResources = async(jsonPath,fileName) => {
  let fileData = await fs.readFileSync(jsonPath, 'utf-8', function (error, data){
    if (error) {
      console.log(error);
    }
    return data;
  });

  let output = await new Promise((resolve, reject) => {
    let dataJson = JSON.parse(fileData);
    var facesData = facesEach(dataJson,fileName);
    facesData.then(data=> {
      resolve(data);
    });
  })
  .catch((error)=> {
    console.log(error);
  });
  return output;
}

var facesEach = async (dataJson,fileName) => {
  var facesDataPromises = [];
  for (let i=0; i<dataJson.length; i++) {
    let face = dataJson[i];
    var thumbnailSrc = '';
    if (typeof face.thumbnail!=="undefined") {
      thumbnailSrc = face.thumbnail.src;
      var faceImageResourcePromise = faceImageResource(thumbnailSrc);
      facesDataPromises.push(faceImageResourcePromise);
    }
  }

  let facesdata = await Promise.all(facesDataPromises).then(data=>{return data});
  let j=0;
  let faces = dataJson.map(item=> {
    let imageData = facesdata[j];
    let newItem = {};
    let faceData = faceImageData(item, imageData.default);
    newItem.fileName = j+".jpg";
    newItem.thumbnail = {
      path: resourcesPath+"output/"+fileName+"/thumbnails/"+j+".jpg",
      src: serverURL+"output/"+fileName+"/thumbnails/"+j+".jpg"
    }
    newItem.firstName = faceData.firstName;
    newItem.lastName = faceData.lastName;
    newItem.diocese = faceData.diocese;
    newItem.default = faceData.default;
    j++;
    return newItem;
  });
  return faces;
}

var faceImageResource = async(imgPath) => {
  var imgDimensionsPromise = await imgDimensions(imgPath);
  var exifPromise = await imageExif(imgPath);
  var iptcPromise = await imageIptc(imgPath);
  let output = await Promise.all([imgDimensionsPromise,exifPromise,iptcPromise]).then((data)=> {
    let imageMetadata = {};
    let defaultValues = data[0];
    let exifValues = null;
    let iptcValues = null;
    if (typeof data[1]!=="undefined" && data[1]!==false) {
      exifValues = data[1];
    }
    if (typeof data[2]!=="undefined" && data[2]!==false) {
      iptcValues = data[2];
    }
    imageMetadata.default = data[0];
    if (exifValues!==null) {
      imageMetadata.exif = data[1];
    }
    if (iptcValues!==null) {
      imageMetadata.iptc = data[2];
    }
    return imageMetadata;
  })
  .catch((error)=> {
    console.log(error);
  });
  return output;
}

var faceImageData = (face, imageDefaultData) => {
  let faceObj = {};
  let defaultValues = {};
  if (typeof face.boundingPoly!=="undefined") {
    let vertices = face.boundingPoly.vertices;
    let x = face.boundingPoly.vertices[0].x;
    let y = face.boundingPoly.vertices[0].y;
    defaultValues = {x: x,y: y};
  }
  let defaultData = Object.assign(imageDefaultData,defaultValues);
  //let rotate = null;
  let firstName = "";
  let lastName = "";
  let diocese = "";
  if (typeof face.firstName!=="undefined") {
    firstName = face.firstName;
  }
  if (typeof face.lastName!=="undefined") {
    lastName = face.lastName;
  }
  if (typeof face.diocese!=="undefined") {
    diocese = face.diocese;
  }
  if (typeof face.rotate!=="undefined") {
    defaultData.rotate = face.rotate;
  }
  faceObj.firstName = firstName;
  faceObj.lastName = lastName;
  faceObj.diocese = diocese;
  faceObj.default = defaultData;
  return faceObj;
}

var imageIptc = (imgPath) => {
  return new Promise((resolve, reject) => {
    const image = fs.readFile(imgPath, function(error, data) {
      if (error) {
        console.log(error)
      }
      var iptcData = IptcImage(data);
      resolve(iptcData);
    });
  })
  .catch((error)=> {
    console.log(error);
  });
}

var imageExif = (imgPath) => {
  return new Promise((resolve, reject) => {
    const exifImage = ExifImage({ image : imgPath }, function (error, exifData) {
      if (error) {
        //console.log(error.message);
      }
      resolve(exifData);
    });
  })
  .catch((error)=> {
    console.log(error);
  });
}

var imgDimensions = (imgPath) => {
  return new Promise((resolve, reject) => {
    const imageSize = sizeOfImage(imgPath, (err,dimensions) => {
      dimensions.extension = dimensions.type;
      delete dimensions.type;
      resolve(dimensions);
    });
  })
  .catch((error)=> {
    console.log(error);
  });
}

var comparePerson = async(personData) => {
  let firstName = "";
  let lastName = "";
  let fnameSoundex = "";
  let lnameSoundex = "";
  let query = {};
  let $and = [];

  if (typeof personData.firstName!=="undefined") {
    firstName = personData.firstName;
    if (firstName!=="") {
      let queryBlock = {"firstName": {"$regex": firstName, "$options": "i"}};
      $and.push(queryBlock);
    }
  }
  if (typeof personData.lastName!=="undefined") {
    lastName = personData.lastName;
    if (lastName!=="") {
      let queryBlock = {"lastName": {"$regex": lastName, "$options": "i"}};
      $and.push(queryBlock);
    }
  }
  if (typeof personData.fnameSoundex!=="undefined") {
    fnameSoundex = personData.fnameSoundex;
    let queryBlock = {"fnameSoundex": fnameSoundex};
    $and.push(queryBlock);
  }
  if (typeof personData.lnameSoundex!=="undefined") {
    lnameSoundex = personData.lnameSoundex;
    let queryBlock = {"lnameSoundex": lnameSoundex};
    $and.push(queryBlock);
  }
  if ($and.length>0) {
    query = {$and};
  }


  Person.find(query)
  .exec((error, data) => {
    if (error) {
      console.log(error)
    }
    else {
      return data;
    }
  });
}

var parseDataPromise = (req) => {
  return new Promise((resolve, reject) => {
    parseRequestData(req, parameters => {
      resolve(parameters);
    });
  });
}

var ingestClasspieceImage = async (classpiece) => {
  let classpieceRef = new TaxonomyTerm({"labelId": "Classpiece"});
  await classpieceRef.load();

  let classpieceImage = await new Promise((resolve, reject) => {
    // copy fullsize and thumbnail to archive directory
    let fileExtension = classpiece.default.extension;

    let hashedName = hashFileName(classpiece.label)+"."+fileExtension;

    let fullsizeSrc = resourcesPath+"images/processed/fullsize/"+classpiece.fileName;
    let fullsizeTarget = archivePath+"images/fullsize/"+hashedName;
    let fullsizePath = "images/fullsize/"+hashedName;
    copyFile(fullsizeSrc, fullsizeTarget);

    let thumbnailSrc = resourcesPath+"images/processed/thumbnails/"+classpiece.fileName;
    let thumbnailsTarget = archivePath+"images/thumbnails/"+hashedName;
    let thumbnailsPath = "images/thumbnails/"+hashedName;
    copyFile(thumbnailSrc, thumbnailsTarget);

    let classPieceData = {
      label: classpiece.label,
      fileName: classpiece.fileName,
      metadata: {
        image: {
          default: classpiece.default,
          exif: classpiece.exif,
          iptc: classpiece.iptc
        }
      },
      systemType: {
        ref: classpieceRef._id
      },
      resourceType: 'image',
      paths: [
        {path: fullsizePath, pathType: 'source'},
        {path: thumbnailsPath, pathType: 'thumbnail'},
      ]
    }
    classPieceData.metadata = JSON.stringify(classPieceData.metadata);
    classPieceData.systemType = JSON.stringify(classPieceData.systemType);
    classPieceData.paths = classPieceData.paths.map(path=>JSON.stringify(path));
    let newClasspiece = new Resource(classPieceData);
    let output = newClasspiece.save();
    resolve(output);
  })
  .catch((error)=> {
    console.log(error);
  });
  return classpieceImage;
}

var ingestPerson = async(person, classpiece) => {
  // 1. insert/update person
  if (person.firstName==="") {
    person.firstName = "Unknown";
  }
  if (person.lastName==="") {
    person.lastName = "Unknown";
  }
  let honorificPrefix = null;
  let firstName = null;
  let middleName = null;
  let lastName = null;
  if (typeof person.honorificPrefix!=="undefined") {
    honorificPrefix = person.honorificPrefix;
  }
  if (typeof person.firstName!=="undefined") {
    firstName = person.firstName;
  }
  if (typeof person.middleName!=="undefined") {
    middleName = person.middleName;
  }
  if (typeof person.lastName!=="undefined") {
    lastName = person.lastName;
  }
  let personData = {
    honorificPrefix: honorificPrefix,
    firstName: firstName,
    middleName: middleName,
    lastName: lastName,
  };
  if (typeof person._id!=="undefined") {
    personData._id = person._id;
  }
  let newPerson = new Person(personData);
  let ingestPersonPromise = await newPerson.save();

  if (ingestPersonPromise.status) {
    // assign id to person object
    person._id = ingestPersonPromise.data._id;
    person.label = ingestPersonPromise.data.label;
    // 2. insert/update thumbnail
    let ingestPersonThumbnailPromise = await ingestPersonThumbnail(person, classpiece);

    // 3. insert diocese
    let ingestDiocesePromise = await ingestDiocese(person);

    // 4. link person to classpiece
    if (classpiece!==null) {
      // 4.1 get person role term id
      let role = "student";
      if (typeof person.type!=="undefined") {
        role = person.type;
      }
      let classpieceRelRole = new TaxonomyTerm({labelId: role});
      await classpieceRelRole.load();

      // 4.2 link classpiece to person
      let classpieceTaxonomyTerm = new TaxonomyTerm({labelId: "depicts"});
      await classpieceRelRole.load();
      let classpieceReference = {
        items: [
          {_id: classpiece._id, type: "Resource", role: null},
          {_id: ingestPersonPromise.data._id, type: "Person", role: classpieceRelRole._id}
        ],
        taxonomyTermId: classpieceTaxonomyTerm._id,
      }

      let insertClasspieceReference = await referencesController.updateReference(classpieceReference);

      // 4.2. link classpiece to thumbnail
      let classpieceThumbnailTaxonomyTerm = new TaxonomyTerm({labelId: "hasPart"});
      await classpieceThumbnailTaxonomyTerm.load();

      let classpieceThumbnailReference = {
        items: [
          {_id: classpiece._id, type: "Resource"},
          {_id: ingestPersonThumbnailPromise.data._id, type: "Resource"}
        ],
        taxonomyTermId: classpieceThumbnailTaxonomyTerm._id,
      }

      let insertClasspieceThumbnailReference = await referencesController.updateReference(classpieceThumbnailReference);
    }

    // 5. link person to thumbnail
    let thumbnailTaxonomyTerm = new TaxonomyTerm({labelId: "hasRepresentationObject"});
    await thumbnailTaxonomyTerm.load();

    let thumbnailReference = {
      items: [
        {_id: ingestPersonPromise.data._id, type: "Person"},
        {_id: ingestPersonThumbnailPromise.data._id, type: "Resource"},
      ],
      taxonomyTermId: thumbnailTaxonomyTerm._id,
    }
    let insertThumbnailReference = await referencesController.updateReference(thumbnailReference);

    // 6. link person to diocese
    if (typeof ingestDiocesePromise!=="undefined") {
      let organisationTaxonomyTerm = new TaxonomyTerm({labelId: "belongsTo"});
      await organisationTaxonomyTerm.load();

      let organisationReference = {
        items: [
          {_id: ingestPersonPromise.data._id, type: "Person"},
          {_id: ingestDiocesePromise._id, type: "Organisation"},
        ],
        taxonomyTermId: organisationTaxonomyTerm._id,
      }
      let insertOrganisationReference = await referencesController.updateReference(organisationReference);
    }
  }
}

const ingestPersonThumbnail = async(person, classpiece) => {
  if (classpiece===null) {
    return false;
  }
  let exifData = {};
  let iptcData = {};
  if (typeof person.thumbnail.path!=="undefined") {
    let imgPath = person.thumbnail.path;
    let exifPromise = imageExif(imgPath);
    let iptcPromise = imageIptc(imgPath);

    exifData = await exifPromise;
    iptcData = await iptcPromise;
  }

  // get value of thumbnail resource system type
  let thumbnailRef = new TaxonomyTerm({"labelId": "Thumbnail"});
  await thumbnailRef.load();

  let personThumbnail = await new Promise((resolve, reject) => {
    // copy fullsize and thumbnail to archive
    let fileExtension = person.default.extension;
    let hashedName = hashFileName(person.label)+"."+fileExtension;

    let fullsizeSrc = resourcesPath+"output/"+classpiece.label+"/thumbnails/"+person.fileName;
    let fullsizeTarget = archivePath+"images/fullsize/"+hashedName;
    let fullsizePath = "images/fullsize/"+hashedName;
    copyFile(fullsizeSrc, fullsizeTarget);

    let thumbnailsTarget = archivePath+"images/thumbnails/"+hashedName;
    let thumbnailsPath = "images/thumbnails/"+hashedName;
    copyFile(fullsizeSrc, thumbnailsTarget);

    let defaultData = {
      height: person.default.height,
      width: person.default.width,
      extension: person.default.extension,
      x: person.default.x,
      y: person.default.y,
    }

    let newPersonImageData = {
      label: person.label,
      fileName: person.fileName,
      metadata: {
        image: {
          default: defaultData,
          exif: exifData,
          iptc: iptcData
        }
      },
      systemType: {
        ref: thumbnailRef._id
      },
      resourceType: 'image',
      paths: [
        {path: thumbnailsPath, pathType: 'thumbnail'},
        {path: fullsizePath, pathType: 'source'},
      ]
    }
    newPersonImageData.metadata = JSON.stringify(newPersonImageData.metadata);
    newPersonImageData.systemType = JSON.stringify(newPersonImageData.systemType);
    newPersonImageData.paths = newPersonImageData.paths.map(path=>JSON.stringify(path));
    let newPersonThumbnail = new Resource(newPersonImageData);
    let output = newPersonThumbnail.save();
    resolve(output);
  })
  .catch((error)=> {
    console.log(error);
  });
  return personThumbnail;
}

var ingestDiocese = async(person) => {
  let organisation = {};
  organisation.label = person.diocese;
  organisation.organisationType = 'diocese';

  // check if organisation exists
  let session = driver.session();
  let query = "MATCH (n:Organisation) WHERE n.label='"+organisation.label+"' AND n.organisationType='"+organisation.organisationType+"' RETURN n";
  let existingOrganisation = await session.writeTransaction(tx=>
    tx.run(query,{})
  )
  .then(result=> {
    session.close();
    let records = result.records;
    let outputRecord = null;
    if (records.length>0) {
      let record = records[0].toObject();
      outputRecord = helpers.outputRecord(record.n);
      return outputRecord;
    }
  })
  .catch((error) => {
    console.log(error)
  });
  if (typeof existingOrganisation==="undefined" || existingOrganisation===null) {
    let newOrganisation = new Organisation(organisation);
    let savedOrganisation = await newOrganisation.save();
    existingOrganisation = savedOrganisation.data;
  }
  return existingOrganisation;
}

var hashFileName = (data) => {
  let timestamp = Date.now();
  let newName = data+timestamp;
  return crypto.createHash("md5").update(newName).digest('hex');
}

var copyFile = (src=null, target=null) => {
  if (src===null || target===null) {
    return "Please provide a valid source and a valid target";
  }
  else {
    return new Promise((resolve, reject) => {
      fs.copyFile(src, target, (err) => {
        if (err){
          resolve(err);
        }
        else {
          resolve("File moved successfully to "+target);
        }
      });
    });
  }
}


module.exports = {
  preIngestionReportClassPiece: preIngestionReportClassPiece,
  classPieceIdentifyDuplicates: classPieceIdentifyDuplicates,
  ingestClasspiece: ingestClasspiece,
}
