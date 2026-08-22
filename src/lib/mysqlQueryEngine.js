import pool from './mysql.js';

/**
 * Executes a Supabase-style query against the MySQL database.
 * @param {object} payload - The structured query payload.
 * @returns {Promise<{ data: any, error: any, count?: number }>}
 */
export async function executeMysqlQuery(payload) {
    const {
        table,
        operation = 'select',
        columns = '*',
        returnColumns = null,
        data: mutationData,
        filters = [],
        orders = [],
        limit,
        offset,
        countType,
        isSingle = false,
        isMaybeSingle = false
    } = payload;

    if (!table) {
        return { data: null, error: { message: 'Table name is required' } };
    }

    try {
        if (operation === 'select') {
            return await handleSelect({
                table,
                columns,
                filters,
                orders,
                limit,
                offset,
                countType,
                isSingle,
                isMaybeSingle
            });
        } else if (operation === 'insert') {
            return await handleInsert({ table, data: mutationData, returnColumns, isSingle });
        } else if (operation === 'update') {
            return await handleUpdate({ table, data: mutationData, filters, returnColumns, isSingle });
        } else if (operation === 'delete') {
            return await handleDelete({ table, filters, returnColumns });
        } else if (operation === 'upsert') {
            return await handleUpsert({ table, data: mutationData, returnColumns, isSingle });
        }

        return { data: null, error: { message: `Unsupported operation: ${operation}` } };
    } catch (err) {
        console.error(`[MySQL Engine Error] (${table} ${operation}):`, err);
        return { data: null, error: { message: err.message, code: err.code } };
    }
}

function formatValueForMySQL(val) {
    if (val === null || val === undefined) return null;
    if (val instanceof Date) {
        return val.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
    }
    if (typeof val === 'string') {
        // Matches ISO timestamp strings like '2026-08-22T11:49:24.546Z' or '2026-08-22T11:49:24'
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
            return val.replace('T', ' ').replace('Z', '').split('.')[0];
        }
        return val;
    }
    if (typeof val === 'boolean') {
        return val ? 1 : 0;
    }
    if (typeof val === 'object') {
        return JSON.stringify(val);
    }
    return val;
}

function parseFilters(filters) {
    const whereClauses = [];
    const params = [];

    for (const f of filters) {
        const { type, col, val } = f;
        if (!col && type !== 'or') continue;

        switch (type) {
            case 'eq':
                if (val === null) {
                    whereClauses.push(`\`${col}\` IS NULL`);
                } else {
                    whereClauses.push(`\`${col}\` = ?`);
                    params.push(formatValueForMySQL(val));
                }
                break;
            case 'neq':
                if (val === null) {
                    whereClauses.push(`\`${col}\` IS NOT NULL`);
                } else {
                    whereClauses.push(`\`${col}\` != ?`);
                    params.push(formatValueForMySQL(val));
                }
                break;
            case 'gt':
                whereClauses.push(`\`${col}\` > ?`);
                params.push(formatValueForMySQL(val));
                break;
            case 'gte':
                whereClauses.push(`\`${col}\` >= ?`);
                params.push(formatValueForMySQL(val));
                break;
            case 'lt':
                whereClauses.push(`\`${col}\` < ?`);
                params.push(formatValueForMySQL(val));
                break;
            case 'lte':
                whereClauses.push(`\`${col}\` <= ?`);
                params.push(formatValueForMySQL(val));
                break;
            case 'like':
            case 'ilike':
                whereClauses.push(`\`${col}\` LIKE ?`);
                params.push(formatValueForMySQL(val));
                break;
            case 'is':
                if (val === null) {
                    whereClauses.push(`\`${col}\` IS NULL`);
                } else {
                    whereClauses.push(`\`${col}\` = ?`);
                    params.push(formatValueForMySQL(val));
                }
                break;
            case 'in':
                if (Array.isArray(val) && val.length > 0) {
                    const placeholders = val.map(() => '?').join(', ');
                    whereClauses.push(`\`${col}\` IN (${placeholders})`);
                    params.push(...val.map(formatValueForMySQL));
                } else {
                    whereClauses.push('1 = 0'); // Empty IN matches nothing
                }
                break;
            case 'or':
                if (typeof val === 'string') {
                    // e.g. "customer_id.eq.xxx,customer_phone.in.(a,b,c)"
                    const parts = val.split(/,(?=[a-zA-Z0-9_]+\.)/);
                    const orClauses = [];
                    for (const p of parts) {
                        const eqMatch = p.match(/^([a-zA-Z0-9_]+)\.eq\.(.*)$/);
                        const inMatch = p.match(/^([a-zA-Z0-9_]+)\.in\.\((.*)\)$/);
                        const ilikeMatch = p.match(/^([a-zA-Z0-9_]+)\.ilike\.(.*)$/);
                        if (eqMatch) {
                            orClauses.push(`\`${eqMatch[1]}\` = ?`);
                            params.push(formatValueForMySQL(eqMatch[2]));
                        } else if (inMatch) {
                            const inVals = inMatch[2].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                            if (inVals.length > 0) {
                                const placeholders = inVals.map(() => '?').join(', ');
                                orClauses.push(`\`${inMatch[1]}\` IN (${placeholders})`);
                                params.push(...inVals.map(formatValueForMySQL));
                            }
                        } else if (ilikeMatch) {
                            orClauses.push(`\`${ilikeMatch[1]}\` LIKE ?`);
                            params.push(formatValueForMySQL(ilikeMatch[2]));
                        }
                    }
                    if (orClauses.length > 0) {
                        whereClauses.push(`(${orClauses.join(' OR ')})`);
                    }
                }
                break;
        }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    return { whereSql, params };
}

function parseJsonFields(row) {
    if (!row || typeof row !== 'object') return row;
    const result = { ...row };
    for (const key of Object.keys(result)) {
        const val = result[key];
        if (typeof val === 'string') {
            if (val.startsWith('{') || val.startsWith('[')) {
                try {
                    result[key] = JSON.parse(val);
                } catch (e) {
                    // Keep original string if not valid JSON
                }
            } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(val)) {
                // Ensure MySQL datetimes are returned as ISO UTC strings with Z suffix
                result[key] = val.replace(' ', 'T') + 'Z';
            }
        }
    }
    return result;
}

async function handleSelect({
    table,
    columns,
    filters,
    orders,
    limit,
    offset,
    countType,
    isSingle,
    isMaybeSingle
}) {
    const { whereSql, params } = parseFilters(filters);

    let totalCount = null;
    if (countType === 'exact') {
        const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${table}\` ${whereSql}`, params);
        totalCount = countRows[0]?.total || 0;
    }

    // Detect if relations are requested
    const rawCols = typeof columns === 'string' ? columns : '*';
    const hasOrderItemsRel = rawCols.includes('order_items');
    const hasProductsRel = rawCols.includes('products');
    const hasCustomersRel = rawCols.includes('customers');
    const hasOrdersRel = rawCols.includes('orders');

    // Clean columns to select on the main table
    // Remove all nested relations e.g. order_items(*, products(...))
    let cleanColumns = rawCols;
    // Iteratively strip out any relation_name(...) groups
    while (/\b[a-zA-Z0-9_]+(?::[a-zA-Z0-9_]+)?\s*\([^()]*\)/.test(cleanColumns)) {
        cleanColumns = cleanColumns.replace(/\b[a-zA-Z0-9_]+(?::[a-zA-Z0-9_]+)?\s*\([^()]*\)/g, '');
    }
    // Clean trailing/leading commas and whitespace
    cleanColumns = cleanColumns.split(',')
        .map(c => c.trim())
        .filter(c => c && c !== '*' && !c.includes('(') && !c.includes(')'))
        .join(', ');

    // Build base SELECT fields
    let selectFields = '*';
    if (cleanColumns && cleanColumns !== '*' && !rawCols.startsWith('*')) {
        selectFields = cleanColumns.split(',').map(c => `\`${c.trim()}\``).join(', ');
    }

    // Order By
    let orderSql = '';
    if (orders && orders.length > 0) {
        const orderClauses = orders.map(o => `\`${o.col}\` ${o.ascending ? 'ASC' : 'DESC'}`);
        orderSql = `ORDER BY ${orderClauses.join(', ')}`;
    }

    // Limit / Offset
    let limitSql = '';
    const queryParams = [...params];
    if (limit !== undefined && limit !== null) {
        limitSql = `LIMIT ?`;
        queryParams.push(Number(limit));
        if (offset !== undefined && offset !== null) {
            limitSql += ` OFFSET ?`;
            queryParams.push(Number(offset));
        }
    }

    let rows;
    try {
        const sql = `SELECT ${selectFields} FROM \`${table}\` ${whereSql} ${orderSql} ${limitSql}`.trim();
        [rows] = await pool.query(sql, queryParams);
    } catch (err) {
        if (err.code === 'ER_BAD_FIELD_ERROR' && selectFields !== '*') {
            // Automatic resilience: fallback to SELECT * if any requested column is missing
            const fallbackSql = `SELECT * FROM \`${table}\` ${whereSql} ${orderSql} ${limitSql}`.trim();
            [rows] = await pool.query(fallbackSql, queryParams);
        } else {
            throw err;
        }
    }

    let processedRows = rows.map(parseJsonFields);

    // Auto ensure invoice_no exists and has clean INV-XXXX format (no leading # in raw data)
    if (table === 'orders') {
        processedRows = processedRows.map(o => {
            if (!o.invoice_no && o.id) {
                const num = String(o.id).replace(/\D/g, '');
                o.invoice_no = num ? `INV-${num.padStart(4, '0')}` : `INV-${o.id}`;
            } else if (o.invoice_no) {
                o.invoice_no = String(o.invoice_no).replace(/^#+/, '');
            }
            return o;
        });
    }

    // Handle Relations Join
    if (processedRows.length > 0) {
        // 1. Orders -> order_items (and nested products inside order_items)
        if (table === 'orders' && hasOrderItemsRel) {
            const orderIds = processedRows.map(r => r.id);
            if (orderIds.length > 0) {
                const placeholders = orderIds.map(() => '?').join(', ');
                const [subRows] = await pool.query(`SELECT * FROM \`order_items\` WHERE \`order_id\` IN (${placeholders})`, orderIds);
                let subParsed = subRows.map(parseJsonFields);

                // If nested products inside order_items requested
                if (hasProductsRel) {
                    const prodIds = [...new Set(subParsed.map(i => i.product_id).filter(Boolean))];
                    if (prodIds.length > 0) {
                        const prodPlaceholders = prodIds.map(() => '?').join(', ');
                        const [prodRows] = await pool.query(`SELECT * FROM \`products\` WHERE \`id\` IN (${prodPlaceholders})`, prodIds);
                        const prodParsed = prodRows.map(parseJsonFields);
                        subParsed = subParsed.map(item => ({
                            ...item,
                            products: prodParsed.find(p => p.id === item.product_id) || null
                        }));
                    }
                }

                processedRows = processedRows.map(o => ({
                    ...o,
                    order_items: subParsed.filter(i => i.order_id === o.id)
                }));
            }
        } else if (table === 'product_variants' && hasProductsRel) {
            const prodIds = [...new Set(processedRows.map(r => r.product_id).filter(Boolean))];
            if (prodIds.length > 0) {
                const placeholders = prodIds.map(() => '?').join(', ');
                const [prodRows] = await pool.query(`SELECT * FROM \`products\` WHERE \`id\` IN (${placeholders})`, prodIds);
                const prodParsed = prodRows.map(parseJsonFields);
                processedRows = processedRows.map(v => ({
                    ...v,
                    products: prodParsed.find(p => p.id === v.product_id) || null
                }));
            }
        }
    }

    if (isSingle) {
        if (processedRows.length === 0) {
            return { data: null, error: { message: 'Row not found' }, count: totalCount };
        }
        return { data: processedRows[0], error: null, count: totalCount };
    }

    if (isMaybeSingle) {
        return { data: processedRows.length > 0 ? processedRows[0] : null, error: null, count: totalCount };
    }

    return { data: processedRows, error: null, count: totalCount };
}

async function handleInsert({ table, data, returnColumns, isSingle }) {
    if (!data) return { data: null, error: { message: 'Insert data is empty' } };
    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) return { data: [], error: null };

    const insertedIds = [];

    for (const item of items) {
        const rowToInsert = { ...item };
        
        // Auto-generate UUID if ID is missing
        if (!rowToInsert.id && table !== 'app_settings') {
            try {
                const { randomUUID } = await import('crypto');
                rowToInsert.id = randomUUID();
            } catch (e) {}
        }

        // Stringify Objects / Arrays to JSON
        for (const key of Object.keys(rowToInsert)) {
            if (typeof rowToInsert[key] === 'object' && rowToInsert[key] !== null) {
                rowToInsert[key] = JSON.stringify(rowToInsert[key]);
            }
        }

        const keys = Object.keys(rowToInsert);
        const colNames = keys.map(k => `\`${k}\``).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => formatValueForMySQL(rowToInsert[k]));

        await pool.query(`INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders})`, values);
        if (rowToInsert.id) insertedIds.push(rowToInsert.id);
    }

    // If returnColumns requested (e.g. .insert().select()), fetch fresh rows from DB
    if (returnColumns !== null && insertedIds.length > 0) {
        const placeholders = insertedIds.map(() => '?').join(', ');
        const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`id\` IN (${placeholders})`, insertedIds);
        const parsed = rows.map(parseJsonFields);
        return { data: isSingle || !Array.isArray(data) ? (parsed[0] || null) : parsed, error: null };
    }

    return { data: null, error: null };
}

async function handleUpdate({ table, data, filters, returnColumns, isSingle }) {
    if (!data) return { data: null, error: { message: 'Update data is empty' } };
    const { whereSql, params: whereParams } = parseFilters(filters);

    const updateObj = { ...data };
    const setClauses = [];
    const setParams = [];

    for (const [col, val] of Object.entries(updateObj)) {
        setClauses.push(`\`${col}\` = ?`);
        setParams.push(formatValueForMySQL(val));
    }

    if (setClauses.length === 0) {
        return { data: null, error: null };
    }

    const sql = `UPDATE \`${table}\` SET ${setClauses.join(', ')} ${whereSql}`;
    await pool.query(sql, [...setParams, ...whereParams]);

    // Always fetch updated records back so .update().select() works
    const [updated] = await pool.query(`SELECT * FROM \`${table}\` ${whereSql}`, whereParams);
    const parsed = updated.map(parseJsonFields);

    return { data: isSingle ? (parsed[0] || null) : parsed, error: null };
}

async function handleDelete({ table, filters }) {
    const { whereSql, params } = parseFilters(filters);
    await pool.query(`DELETE FROM \`${table}\` ${whereSql}`, params);
    return { data: null, error: null };
}

async function handleUpsert({ table, data, returnColumns, isSingle }) {
    if (!data) return { data: null, error: { message: 'Upsert data is empty' } };
    const items = Array.isArray(data) ? data : [data];
    const upserted = [];

    for (const item of items) {
        const row = { ...item };
        const keys = Object.keys(row);
        const colNames = keys.map(k => `\`${k}\``).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const updateClauses = keys.filter(k => k !== 'id').map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
        const values = keys.map(k => formatValueForMySQL(row[k]));

        const sql = `INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClauses || '`id`=`id`'}`;
        await pool.query(sql, values);
        upserted.push(parseJsonFields(row));
    }

    return { data: isSingle || !Array.isArray(data) ? upserted[0] : upserted, error: null };
}

/**
 * executeMysqlRpc — Replaces Supabase stored procedure calls with direct MySQL queries.
 *
 * Supported RPCs:
 *   - deduct_stock_atomic(p_id, p_qty, p_variant_id)
 *       Atomically deducts stock from products or product_variants.
 *       Only deducts if current stock >= requested qty (prevents overselling).
 *
 *   - increment_total_sold(prod_id, qty)
 *       Increments total_sold counter on the products table.
 *
 *   - increment_total_added(prod_id, qty)
 *       Increments total_added counter on the products table.
 */
export async function executeMysqlRpc(fnName, params = {}) {
    try {
        switch (fnName) {

            case 'deduct_stock_atomic': {
                const { p_id, p_qty, p_variant_id } = params;
                const qty = parseInt(p_qty, 10);

                if (p_variant_id) {
                    // Deduct from product_variants — only if stock >= qty (atomic guard)
                    const [result] = await pool.query(
                        `UPDATE \`product_variants\`
                         SET \`stock\` = \`stock\` - ?
                         WHERE \`id\` = ? AND \`stock\` >= ?`,
                        [qty, p_variant_id, qty]
                    );
                    if (result.affectedRows === 0) {
                        return { data: null, error: { message: 'Insufficient stock for variant' } };
                    }
                    // Also reduce parent product stock
                    await pool.query(
                        `UPDATE \`products\`
                         SET \`stock\` = GREATEST(0, \`stock\` - ?)
                         WHERE \`id\` = ?`,
                        [qty, p_id]
                    );
                } else {
                    // Deduct from products directly — atomic guard
                    const [result] = await pool.query(
                        `UPDATE \`products\`
                         SET \`stock\` = \`stock\` - ?
                         WHERE \`id\` = ? AND \`stock\` >= ?`,
                        [qty, p_id, qty]
                    );
                    if (result.affectedRows === 0) {
                        return { data: null, error: { message: 'Insufficient stock' } };
                    }
                }

                // Return current stock after deduction
                const [rows] = await pool.query(
                    `SELECT \`stock\` FROM \`products\` WHERE \`id\` = ?`, [p_id]
                );
                return { data: rows[0] || null, error: null };
            }

            case 'increment_total_sold': {
                const { prod_id, qty } = params;
                await pool.query(
                    `UPDATE \`products\`
                     SET \`total_sold\` = COALESCE(\`total_sold\`, 0) + ?
                     WHERE \`id\` = ?`,
                    [parseInt(qty, 10), prod_id]
                );
                return { data: null, error: null };
            }

            case 'increment_total_added': {
                const { prod_id, qty } = params;
                await pool.query(
                    `UPDATE \`products\`
                     SET \`total_added\` = COALESCE(\`total_added\`, 0) + ?
                     WHERE \`id\` = ?`,
                    [parseInt(qty, 10), prod_id]
                );
                return { data: null, error: null };
            }

            default:
                console.warn(`[MySQL RPC] Unknown function: "${fnName}". Returning no-op.`);
                return { data: null, error: null };
        }
    } catch (err) {
        console.error(`[MySQL RPC Error] ${fnName}:`, err.message);
        return { data: null, error: { message: err.message } };
    }
}
