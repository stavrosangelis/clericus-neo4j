const test = require('ava');
const request = require('supertest');
const serverURL = 'http://localhost:5100/api';
const crypto = require('crypto-js');

console.log('Testing endpoints');
console.log('\n');

// NEVER USE ADMIN USER CREDENTIALS THAT ARE ALSO USED IN THE PRODUCTION SERVER !!
const authenticate = async () => {
  let data = await request(serverURL)
    .post('/admin-login')
    .send({
      email: 'admin@test.com',
      password: crypto.SHA1('admin-default-pass').toString(),
    })
    .then((response) => {
      return response.body;
    });
  return data;
};

/* -- ui -- */
test('UI generic stats', async (t) => {
  const response = await request(serverURL).get('/generic-stats');
  t.is(response.status, 200);
});
test('UI classpieces', async (t) => {
  const response = await request(serverURL).get('/classpieces');
  t.is(response.status, 200);
});
test('UI classpiece', async (t) => {
  const response = await request(serverURL).get('/classpiece');
  t.is(response.status, 200);
});

// authentication
/* test('Login', async t => {
  const response = await request(serverURL).post('/login');
  t.is(response.status, 200);
});
test('Register', async t => {
  const response = await request(serverURL).post('/register');
  t.is(response.status, 200);
}); */

/* -- admin -- */
// authentication
test('Admin login', async (t) => {
  const response = await request(serverURL).post('/admin-login');
  t.is(response.status, 200);
});
test('Admin session', async (t) => {
  const response = await request(serverURL).post('/admin-session');
  t.is(response.status, 200);
});

// dashboard
test('Admin dashboard', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/dashboard')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// entities
test('Admin put entity', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/entity')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin get entity', async (t) => {
  const response = await request(serverURL).get('/entity');
  t.is(response.status, 200);
});
test('Admin get entities', async (t) => {
  const response = await request(serverURL).get('/entities');
  t.is(response.status, 200);
});
test('Admin delete entity', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/entity')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// events
test('Admin put event', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/event')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin get event', async (t) => {
  const response = await request(serverURL).get('/event');
  t.is(response.status, 200);
});
test('Admin get events', async (t) => {
  const response = await request(serverURL).get('/events');
  t.is(response.status, 200);
});
test('Admin delete event', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/event')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// visualisations
test('Get graph', async (t) => {
  const response = await request(serverURL).get('/graph');
  t.is(response.status, 200);
});
test('Get related nodes', async (t) => {
  const response = await request(serverURL).get('/related-nodes');
  t.is(response.status, 200);
});

// language codes
test('Get language codes', async (t) => {
  const response = await request(serverURL).get('/language-codes');
  t.is(response.status, 200);
});

// persons
test('Admin put person', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/person')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin get person', async (t) => {
  const response = await request(serverURL).get('/person');
  t.is(response.status, 200);
});
test('Admin get people', async (t) => {
  const response = await request(serverURL).get('/people');
  t.is(response.status, 200);
});
test('Admin delete person', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/person')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// resources
test('Admin put resource', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/resource')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin upload resource', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .post('/upload-resource')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin get resource', async (t) => {
  const response = await request(serverURL).get('/resource');
  t.is(response.status, 200);
});
test('Admin get resources', async (t) => {
  const response = await request(serverURL).get('/resources');
  t.is(response.status, 200);
});
test('Admin delete resource', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/resource')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// organisations
test('Admin put organisation', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/organisation')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin get organisation', async (t) => {
  const response = await request(serverURL).get('/organisation');
  t.is(response.status, 200);
});
test('Admin get organisations', async (t) => {
  const response = await request(serverURL).get('/organisations');
  t.is(response.status, 200);
});
test('Admin delete organisation', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/organisation')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// references
test('Admin get references', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/references')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin put reference', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/reference')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin put references', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/references')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin delete reference', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/reference')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// taxonomies
test('Admin put taxonomy', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/taxonomy')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin get taxonomy', async (t) => {
  const response = await request(serverURL).get('/taxonomy');
  t.is(response.status, 200);
});
test('Admin get taxonomies', async (t) => {
  const response = await request(serverURL).get('/taxonomies');
  t.is(response.status, 200);
});
test('Admin delete taxonomy', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/taxonomy')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// taxonomyTerms
test('Admin put taxonomy term', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/taxonomy-term')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin get taxonomy term', async (t) => {
  const response = await request(serverURL).get('/taxonomy-term');
  t.is(response.status, 200);
});
test('Admin get taxonomy terms', async (t) => {
  const response = await request(serverURL).get('/taxonomy-terms');
  t.is(response.status, 200);
});
test('Admin delete taxonomy term', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/taxonomy-term')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// tools
test('Admin list classpieces', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/list-class-pieces')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin list classpiece', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/list-class-piece')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin list meta parse classpiece', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/meta-parse-class-piece')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin update classpiece faces', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .post('/update-class-piece-faces')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin prepare classpiece ingestion', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/prepare-classpiece-ingestion')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin identify duplicates before ingestion', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/prepare-classpiece-identify-duplicates')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin ingest classpiece', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/ingest-classpiece')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin parse classpiece', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/parse-class-piece')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin create thumbnails', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/create-thumbnails')
    .query({ test: 'true' })
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin query texts', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .post('/query-texts')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// users
test('Admin get users', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/users')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin get user', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/user')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin put user', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/user')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin post user password', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .post('/user-password')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin delete user', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/user')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// usergroups
test('Admin get user groups', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/user-groups')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin get user group', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .get('/user-group')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin put user group', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .put('/user-group')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});
test('Admin delete user group', async (t) => {
  const login = await authenticate();
  const response = await request(serverURL)
    .delete('/user-group')
    .set('Authorization', 'Bearer ' + login.data.token);
  t.is(response.status, 200);
});

// seed
test('Seed database', async (t) => {
  const response = await request(serverURL).post('/seed-db');
  t.is(response.status, 200);
});

// settings
test('Get settings', async (t) => {
  const response = await request(serverURL).get('/settings');
  t.is(response.status, 200);
});
