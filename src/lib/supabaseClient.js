/**
 * Compatibility Re-Export Module
 * Re-exports native MySQL client as 'mysqlClient' / 'db' / 'supabase'
 * for complete backwards compatibility without any Supabase JS SDK dependencies.
 */

import { mysqlClient, mysqlAdmin } from './mysqlClient.js';

export const supabase = mysqlClient;
export const supabaseAdmin = mysqlAdmin;
export const db = mysqlClient;
export const dbAdmin = mysqlAdmin;

export default mysqlClient;
