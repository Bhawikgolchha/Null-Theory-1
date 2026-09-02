import dotenv from 'dotenv';
dotenv.config();

const rawHost = process.env.DATABRICKS_HOST || '';
const cleanHost = rawHost
  .replace(/^https?:\/\//, '')
  .split('/')[0]
  .trim();

const rawPath = process.env.DATABRICKS_HTTP_PATH || '';
const cleanPath = rawPath
  .replace(/^https?:\/\/[^\/]+/, '')
  .split('?')[0]
  .trim();

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Databricks SQL Warehouse
  databricksHost: cleanHost,
  databricksHttpPath: cleanPath || (process.env.DATABRICKS_HTTP_PATH ? `/sql/1.0/warehouses/${process.env.DATABRICKS_HTTP_PATH.split('/warehouses/')[1]?.split('?')[0]}` : ''),
  databricksToken: (process.env.DATABRICKS_TOKEN || '').trim(),
  databricksCatalog: process.env.DATABRICKS_CATALOG || 'campusgenie',
  databricksSchema: process.env.DATABRICKS_SCHEMA || 'gold',
  
  // Databricks Agents
  genieSpaceId: process.env.GENIE_EVENTS_SPACE_ID || '',
  kaPoliciesEndpoint: process.env.KA_POLICIES_ENDPOINT || '',
  supervisorEndpoint: process.env.SUPERVISOR_AGENT_ENDPOINT || '',
  
  // Lakebase Postgres
  lakebaseConnectionUrl: process.env.LAKEBASE_URL || process.env.DATABASE_URL || '',
  
  // Policies UC Volume
  ucVolumePolicies: process.env.UC_VOLUME_POLICIES || '/Volumes/campusgenie/docs/policies'
};
