const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const app = express();

const fs = require('fs');
const formidable = require('formidable');
const mongo = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;
const mongourl = 'mongodb+srv://admin:admin@cluster0-gengr.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'miniprj';


app.set('view engine','ejs');

const SECRETKEY1 = 'I want to pass COMPS381F';
const SECRETKEY2 = 'Keep this to yourself';

const users = new Array(
	{name: 'demo01', password: ''},
	{name: 'demo02', password: ''},
);

app.set('view engine','ejs');

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));

// support parsing of application/json type post data
app.use(bodyParser.json());
// support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req,res) => {
	console.log(req.session);
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
		res.redirect('/photos');
	}
});

app.get('/login', (req,res) => {
	res.status(200).sendFile(__dirname + '/public/login.html');
});

app.post('/login', (req,res) => {
	users.forEach((user) => {
		if (user.name == req.body.name && user.password == req.body.password) {
			req.session.authenticated = true;
			req.session.username = user.name;			
		}
	});
	res.redirect('/');
});


app.get('/logout', (req,res) => {
	req.session.authenticated = false;
	req.session = null;
	res.redirect('/');
});

//Create a document
app.get('/create', (req,res) => {
	if (!req.session.authenticated) {
		res.redirect('/login');
  	} else {
	res.render("upload.ejs");
	}
});


app.post('/create', (req,res) => {
  if (!req.session.authenticated) {
		res.redirect('/login');
  } else {
	
  let form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    console.log(JSON.stringify(files));
    
    let filename = files.filetoupload.path;
    if (fields.name) {
      var name = (fields.name.length > 0) ? fields.name : "n/a";
      console.log(`name = ${name}`);
    }
    if (fields.cuisine) {
      var cuisine = (fields.cuisine.length > 0) ? fields.cuisine : "n/a";
      console.log(`cuisine = ${cuisine}`);
    }
    if (fields.borough) {
      var borough = (fields.borough.length > 0) ? fields.borough : "n/a";
      console.log(`borough = ${borough}`);
    }
    if (fields.street) {
      var street = (fields.street.length > 0) ? fields.street : "n/a";
      console.log(`street = ${street}`);
    }
    if (fields.building) {
      var building = (fields.building.length > 0) ? fields.building : "n/a";
      console.log(`building = ${building}`);
    }
	if (fields.zipcode) {
      var zipcode = (fields.zipcode.length > 0) ? fields.zipcode : "n/a";
      console.log(`zipcode = ${zipcode}`);
    }
    if (fields.lon) {
      var lon = (fields.lon.length > 0) ? fields.lon : "n/a";
      console.log(`lon = ${lon}`);
    }
    if (fields.lat) {
      var lat = (fields.lat.length > 0) ? fields.lat : "n/a";
      console.log(`lat = ${lat}`);
    }

    if (files.filetoupload.type) {
      var mimetype = files.filetoupload.type;
      console.log(`mimetype = ${mimetype}`);
    }

    fs.readFile(filename, (err,data) => {
      let client = new MongoClient(mongourl);
      client.connect((err) => {
        try {
          assert.equal(err,null);
        } catch (err) {
          res.status(500).end("MongoClient connect() failed!");
        }
        const db = client.db(dbName);
        let new_r = {};
        let address ={};
        let grades = [];
        new_r['name'] = name;
        new_r['cuisine'] = cuisine;
        new_r['borough'] = borough;
        
        address['street'] = street;
		address['building'] = building;
        address['zipcode'] = zipcode;
        address['coord'] = [lon, lat];
        
        new_r['address'] = address;
        new_r['grades'] = grades;
		new_r['owner'] = req.session.username;
        new_r['mimetype'] = mimetype;
        new_r['image'] = new Buffer.from(data).toString('base64');
        insertPhoto(db,new_r,(result) => {
	      console.log(result);
          client.close();
          res.redirect('/photos');
        });
      });
    });
  });
  }
});

//Show all documents
app.get('/photos', (req,res) => {
  if (!req.session.authenticated) {
		res.redirect('/login');
  } else {
  let client = new MongoClient(mongourl);
  client.connect((err) => {
    try {
      assert.equal(err,null);
    } catch (err) {
      res.status(500).end("MongoClient connect() failed!");
    }
    console.log('Connected to MongoDB');
    const db = client.db(dbName);
    findPhoto(db,{},(photos) => {
      client.close();
      console.log('Disconnected MongoDB');
      res.render("list.ejs",{photos:photos});
    });
  });
  }
});

//Search function
app.post('/search', (req,res) => {
	if (!req.session.authenticated) {
		res.redirect('/login');
  	} else {
	  let client = new MongoClient(mongourl);
	  client.connect((err) => {
	    try {
	      assert.equal(err,null);
	    } catch (err) {
	      res.status(500).end("MongoClient connect() failed!");
	    }
	    console.log('Connected to MongoDB');
	    const db = client.db(dbName);
	    
	    let criteria={};
	    let keyword=req.body.keyword;
	    if(req.body.option == "name"){
		  criteria['name']=keyword;
		  console.log(criteria);  
	    }else if(req.body.option == "borough"){
		  criteria['borough']=keyword;
		  console.log(criteria);  
	    }else if(req.body.option == "cuisine"){
		  criteria['cuisine']=keyword;
		  console.log(criteria);  
	    }
	    
	    findPhoto(db,criteria,(photos) => {
	      client.close();
	      console.log('Disconnected MongoDB');
	      res.render("list.ejs",{photos:photos});
	    });
	  });
	}
});

//Show details and google maps
app.get('/display', (req,res) => {
  if (!req.session.authenticated) {
		res.redirect('/login');
  } else {
  let client = new MongoClient(mongourl);
  client.connect((err) => {
    try {
      assert.equal(err,null);
    } catch (err) {
      res.status(500).end("MongoClient connect() failed!");
    }      
    console.log('Connected to MongoDB');
    const db = client.db(dbName);
    let criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    findPhoto(db,criteria,(photo) => {
      client.close();
      console.log('Disconnected MongoDB');
      console.log('Photo returned = ' + photo.length);
      let image = new Buffer(photo[0].image,'base64');     
      console.log(photo[0].mimetype);
      
	  if(req.session.username == photo[0].owner){
		  res.render('photoowner.ejs',{photo:photo});
	  }else{
		  res.render('photo.ejs',{photo:photo});
	  }
    });
  });
  }
});

//update a document
app.get('/update/:id', (req,res) => {
	if (!req.session.authenticated) {
		res.redirect('/login');
   } else {
	let id = String(req.params.id);
	res.render("update.ejs", {id:id});
   }
});


app.post('/update/:id', (req,res) => {
  if (!req.session.authenticated) {
		res.redirect('/login');
  } else {
	  
  let form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    console.log(JSON.stringify(files));
    
    let filename = files.filetoupload.path;
    var id = req.params.id;
    if (fields.name) {
      var name = (fields.name.length > 0) ? fields.name : "n/a";
      console.log(`name = ${name}`);
    }
    if (fields.cuisine) {
      var cuisine = (fields.cuisine.length > 0) ? fields.cuisine : "n/a";
      console.log(`cuisine = ${cuisine}`);
    }
    if (fields.borough) {
      var borough = (fields.borough.length > 0) ? fields.borough : "n/a";
      console.log(`borough = ${borough}`);
    }
    if (fields.street) {
      var street = (fields.street.length > 0) ? fields.street : "n/a";
      console.log(`street = ${street}`);
    }
    if (fields.building) {
      var building = (fields.building.length > 0) ? fields.building : "n/a";
      console.log(`building = ${building}`);
    }
	if (fields.zipcode) {
      var zipcode = (fields.zipcode.length > 0) ? fields.zipcode : "n/a";
      console.log(`zipcode = ${zipcode}`);
    }
    if (fields.lon) {
      var lon = (fields.lon.length > 0) ? fields.lon : "n/a";
      console.log(`lon = ${lon}`);
    }
    if (fields.lat) {
      var lat = (fields.lat.length > 0) ? fields.lat : "n/a";
      console.log(`lat = ${lat}`);
    }

    if (files.filetoupload.type) {
      var mimetype = files.filetoupload.type;
      console.log(`mimetype = ${mimetype}`);
    }

    fs.readFile(filename, (err,data) => {
      let client = new MongoClient(mongourl);
      client.connect((err) => {
        try {
          assert.equal(err,null);
        } catch (err) {
          res.status(500).end("MongoClient connect() failed!");
        }
        const db = client.db(dbName);
        let new_r = {};
        let address ={};
        new_r['name'] = name;
        new_r['cuisine'] = cuisine;
        new_r['borough'] = borough;
        
        address['street'] = street;
		address['building'] = building;
        address['zipcode'] = zipcode;
        address['coord'] = [lon, lat];
        
        new_r['address'] = address;
		new_r['owner'] = req.session.username;
        new_r['mimetype'] = mimetype;
        new_r['image'] = new Buffer.from(data).toString('base64');
        
        updatePhoto(db,id,new_r,(result) => {
          client.close();
          res.redirect('/photos');
        });
      });
    });
  });
  }
});
//Delete a document
app.get('/delete/:id', (req,res) => {
	if (!req.session.authenticated) {
		res.redirect('/login');
    } else {
	let client = new MongoClient(mongourl);
    client.connect((err) => {
	    try {
	      assert.equal(err,null);
	    } catch (err) {
	      res.status(500).end("MongoClient connect() failed!");
	    }      
		var id = req.params.id;
		console.log(id);
		const db = client.db(dbName);
		db.collection('photo').deleteOne({_id: new mongo.ObjectID(id)} ,(err,result) => {
			console.log(result);
			assert.equal(err,null);
			client.close();
			res.redirect('/photos');
		});
    	
	});
   }
});

//Grading
app.post('/grade/:id', (req,res) => {
	if (!req.session.authenticated) {
		res.redirect('/login');
    } else {

	let client = new MongoClient(mongourl);
    client.connect((err) => {
	    try {
	      assert.equal(err,null);
	    } catch (err) {
	      res.status(500).end("MongoClient connect() failed!");
	    }      
		var id = req.params.id;
		var user = req.session.username;
		var score = req.body.score;
		let newScore = {};
		newScore['user'] = user;
		newScore['score'] = score;
		console.log(id);
		console.log(newScore);
		
		const db = client.db(dbName);
		db.collection('photo').updateOne({_id: new mongo.ObjectID(id)} , {$push: {"grades": newScore}}, (err,result) => {
			console.log(result);
			assert.equal(err,null);
			res.redirect(req.get('referer'));
				
		});
    	
	});
    }
});

//RESTful API

app.get('/api/restaurant/name/:name',function(req,res){
	let client = new MongoClient(mongourl);
	  client.connect((err) => {
	    try {
	      assert.equal(err,null);
	    } catch (err) {
	      res.status(500).end("MongoClient connect() failed!");
	    }
	    console.log('Connected to MongoDB');
	    const db = client.db(dbName);
	    
	    let criteria={};
	    let name=req.params.name;
	    criteria['name']=name;
			    
	    findPhoto(db,criteria,(photos) => {
	      client.close();
	      console.log('Disconnected MongoDB');
	      res.status(200).json(photos).end();
	    });
	  });
});

app.get('/api/restaurant/borough/:borough',function(req,res){
    let client = new MongoClient(mongourl);
	  client.connect((err) => {
	    try {
	      assert.equal(err,null);
	    } catch (err) {
	      res.status(500).end("MongoClient connect() failed!");
	    }
	    console.log('Connected to MongoDB');
	    const db = client.db(dbName);
	    
	    let criteria={};
	    let borough=req.params.borough;
	    criteria['borough']=borough;
			    
	    findPhoto(db,criteria,(photos) => {
	      client.close();
	      console.log('Disconnected MongoDB');
	      res.status(200).json(photos).end();
	    });
	  });
});

app.get('/api/restaurant/cuisine/:cuisine',function(req,res){
    let client = new MongoClient(mongourl);
	  client.connect((err) => {
	    try {
	      assert.equal(err,null);
	    } catch (err) {
	      res.status(500).end("MongoClient connect() failed!");
	    }
	    console.log('Connected to MongoDB');
	    const db = client.db(dbName);
	    
	    let criteria={};
	    let cuisine=req.params.cuisine;
	    criteria['cuisine']=cuisine;
			    
	    findPhoto(db,criteria,(photos) => {
	      client.close();
	      console.log('Disconnected MongoDB');
	      res.status(200).json(photos).end();
	    });
	});
});

app.post('/api/restaurant', function(req,res){
	let client = new MongoClient(mongourl);
	  client.connect((err) => {
	    try {
	      assert.equal(err,null);
	    } catch (err) {
	      res.status(500).end("MongoClient connect() failed!");
	    }
	    console.log('Connected to MongoDB');
	    const db = client.db(dbName);
	    
	    let new_r=req.body;
	    insertPhoto(db,new_r,(result) => {
	      client.close();
	      console.log('Disconnected MongoDB');
	      let resultObj = {};
	      if(err){
		      resultObj['status'] = "failed";
		      res.end(resultObj);
	      }else{
		      resultObj['status'] = "ok";
		      resultObj['_id'] = result.insertedId;
		      console.log(resultObj);
		      res.status(200).json(resultObj).end();
	      }
	    });
	});
});

//Controllers
function insertPhoto(db,r,callback) {
  db.collection('photo').insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
};

function updatePhoto(db,id,r,callback) {
    db.collection('photo').updateOne({_id: mongo.ObjectID(id)}, {$set:r} ,function(err,result) {
    assert.equal(err,null);
    console.log("Update was successful!");
    console.log(JSON.stringify(result));
    callback(result);
  });
};

const findPhoto = (db,criteria,callback) => {
  const cursor = db.collection("photo").find(criteria);
  let photos = [];
  cursor.forEach((doc) => {
    photos.push(doc);
  }, (err) => {
    // done or error
    assert.equal(err,null);
    callback(photos);
  })
}
	
app.use(express.static(__dirname +  '/public'));

app.listen(process.env.PORT || 8099);
