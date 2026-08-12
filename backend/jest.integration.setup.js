// Runs before any module is imported in the integration project.
// Sets TEST_DATABASE_URL so db.ts picks it up at module load time.
const path = require('path');
process.env.TEST_DATABASE_URL = path.resolve(`./test-integration-${Date.now()}.db`);
process.env.JWT_SECRET = 'integration-test-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
