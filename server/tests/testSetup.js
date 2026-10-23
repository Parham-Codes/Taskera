import 'dotenv/config';

// Set test environment
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Ensure test secrets exist in the test environment if not configured in .env
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_only_for_testing_purposes_123456';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_only_for_testing_purposes_123456';

// Isolate database: safely switch to a dedicated test database (ending in _test)
if (process.env.MONGO_URI) {
  const uri = process.env.MONGO_URI;
  const protocol = uri.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://';
  const withoutProtocol = uri.slice(protocol.length);
  const slashIdx = withoutProtocol.indexOf('/');
  if (slashIdx !== -1) {
    const hostPart = withoutProtocol.slice(0, slashIdx);
    const pathAndQuery = withoutProtocol.slice(slashIdx + 1);
    const qIdx = pathAndQuery.indexOf('?');
    const dbName = qIdx !== -1 ? pathAndQuery.slice(0, qIdx) : pathAndQuery;
    const query = qIdx !== -1 ? pathAndQuery.slice(qIdx) : '';
    const testDb = dbName ? (dbName.endsWith('_test') ? dbName : `${dbName}_test`) : 'taskera_test';
    process.env.MONGO_URI = `${protocol}${hostPart}/${testDb}${query}`;
  }
}
