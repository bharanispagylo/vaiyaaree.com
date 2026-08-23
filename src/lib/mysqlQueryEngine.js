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
                        const neqMatch = p.match(/^([a-zA-Z0-9_]+)\.neq\.(.*)$/);
                        const inMatch = p.match(/^([a-zA-Z0-9_]+)\.in\.\((.*)\)$/);
                        const ilikeMatch = p.match(/^([a-zA-Z0-9_]+)\.ilike\.(.*)$/);
                        const isNullMatch = p.match(/^([a-zA-Z0-9_]+)\.is\.null$/);
                        const isNotNullMatch = p.match(/^([a-zA-Z0-9_]+)\.is\.not\.null$/);
                        
                        if (eqMatch) {
                            orClauses.push(`\`${eqMatch[1]}\` = ?`);
                            params.push(formatValueForMySQL(eqMatch[2]));
                        } else if (neqMatch) {
                            orClauses.push(`\`${neqMatch[1]}\` != ?`);
                            params.push(formatValueForMySQL(neqMatch[2]));
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
                        } else if (isNotNullMatch) {
                            orClauses.push(`\`${isNotNullMatch[1]}\` IS NOT NULL`);
                        } else if (isNullMatch) {
                            orClauses.push(`\`${isNullMatch[1]}\` IS NULL`);
                        }
                    }
                    if (orClauses.length > 0) {
                        whereClauses.push(`(${orClauses.join(' OR ')})`);
                    }
                }
                break;
            case 'contains':
            case 'overlaps':
                if (Array.isArray(val)) {
                    if (val.length === 0) {
                        whereClauses.push('1 = 0');
                    } else {
                        const subClauses = val.map(() => `\`${col}\` LIKE ?`);
                        whereClauses.push(`(${subClauses.join(' OR ')})`);
                        params.push(...val.map(item => `%${String(item).replace(/"/g, '')}%`));
                    }
                } else if (typeof val === 'string') {
                    whereClauses.push(`\`${col}\` LIKE ?`);
                    params.push(`%${val}%`);
                } else if (val !== null && val !== undefined) {
                    whereClauses.push(`\`${col}\` LIKE ?`);
                    params.push(`%${JSON.stringify(val)}%`);
                }
                break;
            case 'containedBy':
                whereClauses.push(`\`${col}\` LIKE ?`);
                params.push(`%${String(val)}%`);
                break;
            case 'filter':
                if (f.op === 'cs' || f.op === 'contains') {
                    let searchItem = val;
                    if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                        try {
                            const p = JSON.parse(val);
                            if (Array.isArray(p) && p.length > 0) searchItem = p[0];
                        } catch (e) {}
                    }
                    whereClauses.push(`\`${col}\` LIKE ?`);
                    params.push(`%${String(searchItem).replace(/^[{"']+|[}"']+$/g, '')}%`);
                } else if (f.op === 'eq') {
                    whereClauses.push(`\`${col}\` = ?`);
                    params.push(formatValueForMySQL(val));
                } else if (f.op === 'neq') {
                    whereClauses.push(`\`${col}\` != ?`);
                    params.push(formatValueForMySQL(val));
                } else if (f.op === 'in') {
                    if (Array.isArray(val) && val.length > 0) {
                        const placeholders = val.map(() => '?').join(', ');
                        whereClauses.push(`\`${col}\` IN (${placeholders})`);
                        params.push(...val.map(formatValueForMySQL));
                    }
                } else {
                    whereClauses.push(`\`${col}\` = ?`);
                    params.push(formatValueForMySQL(val));
                }
                break;
            case 'not':
                if (f.op === 'eq') {
                    whereClauses.push(`\`${col}\` != ?`);
                    params.push(formatValueForMySQL(val));
                } else if (f.op === 'in' && Array.isArray(val) && val.length > 0) {
                    const placeholders = val.map(() => '?').join(', ');
                    whereClauses.push(`\`${col}\` NOT IN (${placeholders})`);
                    params.push(...val.map(formatValueForMySQL));
                } else if (f.op === 'is') {
                    if (val === null) whereClauses.push(`\`${col}\` IS NOT NULL`);
                    else {
                        whereClauses.push(`\`${col}\` != ?`);
                        params.push(formatValueForMySQL(val));
                    }
                } else {
                    whereClauses.push(`NOT (\`${col}\` = ?)`);
                    params.push(formatValueForMySQL(val));
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
        if (err.code === 'ER_BAD_FIELD_ERROR') {
            try {
                // Discover actual valid columns of the table
                const [colRows] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
                const validCols = new Set(colRows.map(c => c.Field));

                // Filter out non-existent columns from SELECT
                let safeSelect = '*';
                if (selectFields !== '*') {
                    const requested = cleanColumns.split(',').map(c => c.trim()).filter(c => validCols.has(c));
                    if (requested.length > 0) {
                        safeSelect = requested.map(c => `\`${c}\``).join(', ');
                    }
                }

                // Filter out non-existent columns from WHERE filters
                const safeFilters = (filters || []).filter(f => !f.col || validCols.has(f.col) || f.type === 'or');
                const { whereSql: safeWhereSql, params: safeParams } = parseFilters(safeFilters);

                // Build safe queryParams with limit/offset
                const safeQueryParams = [...safeParams];
                if (limit !== undefined && limit !== null) {
                    safeQueryParams.push(Number(limit));
                    if (offset !== undefined && offset !== null) {
                        safeQueryParams.push(Number(offset));
                    }
                }

                const retrySql = `SELECT ${safeSelect} FROM \`${table}\` ${safeWhereSql} ${orderSql} ${limitSql}`.trim();
                [rows] = await pool.query(retrySql, safeQueryParams);
            } catch (retryErr) {
                console.error(`[MySQL Engine] Auto-resilience failed for ${table}:`, retryErr.message);
                return { data: isSingle ? null : (isMaybeSingle ? null : []), error: { message: err.message, code: err.code }, count: totalCount };
            }
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
        } else if (table === 'return_requests') {
            const prodIds = [...new Set(processedRows.map(r => r.product_id).filter(Boolean))];
            const custIds = [...new Set(processedRows.map(r => r.customer_id).filter(Boolean))];
            const orderIds = [...new Set(processedRows.map(r => r.order_id).filter(Boolean))];
            const returnDbIds = processedRows.map(r => r.id).filter(Boolean);

            let prodMap = {}, custMap = {}, orderMap = {}, shipMap = {}, imageMap = {};

            if (prodIds.length > 0) {
                const placeholders = prodIds.map(() => '?').join(', ');
                const [prodRows] = await pool.query(`SELECT * FROM \`products\` WHERE \`id\` IN (${placeholders})`, prodIds);
                prodRows.map(parseJsonFields).forEach(p => { prodMap[p.id] = p; });
            }

            if (custIds.length > 0) {
                const placeholders = custIds.map(() => '?').join(', ');
                const [custRows] = await pool.query(`SELECT * FROM \`customers\` WHERE \`id\` IN (${placeholders})`, custIds);
                custRows.map(parseJsonFields).forEach(c => { custMap[c.id] = c; });
            }

            if (orderIds.length > 0) {
                const placeholders = orderIds.map(() => '?').join(', ');
                const [orderRows] = await pool.query(`SELECT * FROM \`orders\` WHERE \`id\` IN (${placeholders})`, orderIds);
                orderRows.map(parseJsonFields).forEach(o => {
                    if (!o.invoice_no && o.id) {
                        const num = String(o.id).replace(/\D/g, '');
                        o.invoice_no = num ? `INV-${num.padStart(4, '0')}` : `INV-${o.id}`;
                    } else if (o.invoice_no) {
                        o.invoice_no = String(o.invoice_no).replace(/^#+/, '');
                    }
                    orderMap[o.id] = o;
                });
            }

            if (returnDbIds.length > 0) {
                const placeholders = returnDbIds.map(() => '?').join(', ');
                const [shipRows] = await pool.query(`SELECT * FROM \`return_shipping\` WHERE \`return_request_id\` IN (${placeholders}) ORDER BY \`created_at\` DESC`, returnDbIds);
                shipRows.map(parseJsonFields).forEach(s => {
                    if (!shipMap[s.return_request_id]) shipMap[s.return_request_id] = s;
                });

                const [imgRows] = await pool.query(`SELECT * FROM \`return_images\` WHERE \`return_request_id\` IN (${placeholders}) ORDER BY \`uploaded_at\` ASC`, returnDbIds);
                imgRows.map(parseJsonFields).forEach(img => {
                    if (!imageMap[img.return_request_id]) imageMap[img.return_request_id] = [];
                    imageMap[img.return_request_id].push(img);
                });
            }

            processedRows = processedRows.map(r => {
                const orderObj = orderMap[r.order_id] || null;
                let custObj = custMap[r.customer_id] || null;

                // Resilient fallback for customer info if not matched by customer_id directly
                if (!custObj && orderObj) {
                    custObj = {
                        id: r.customer_id || null,
                        name: orderObj.customer_name || 'Customer',
                        phone: orderObj.customer_phone || '',
                        email: orderObj.customer_email || ''
                    };
                }

                return {
                    ...r,
                    products: prodMap[r.product_id] || null,
                    customers: custObj,
                    orders: orderObj,
                    return_shipping: shipMap[r.id] || null,
                    return_images: imageMap[r.id] || [],
                    images: imageMap[r.id] || []
                };
            });
        } else if (table === 'refunds' && hasOrdersRel) {
            const orderIds = [...new Set(processedRows.map(r => r.order_id).filter(Boolean))];
            if (orderIds.length > 0) {
                const placeholders = orderIds.map(() => '?').join(', ');
                const [orderRows] = await pool.query(`SELECT * FROM \`orders\` WHERE \`id\` IN (${placeholders})`, orderIds);
                const orderParsed = orderRows.map(parseJsonFields).map(o => {
                    if (!o.invoice_no && o.id) {
                        const num = String(o.id).replace(/\D/g, '');
                        o.invoice_no = num ? `INV-${num.padStart(4, '0')}` : `INV-${o.id}`;
                    } else if (o.invoice_no) {
                        o.invoice_no = String(o.invoice_no).replace(/^#+/, '');
                    }
                    return o;
                });
                processedRows = processedRows.map(ref => ({
                    ...ref,
                    orders: orderParsed.find(o => o.id === ref.order_id) || null
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

const AUTO_INCREMENT_TABLES = new Set([
    'return_shipping',
    'return_images',
    'return_status_logs',
    'return_inspections',
    'return_courier_shipments',
    'courier_companies'
]);

async function handleInsert({ table, data, returnColumns, isSingle }) {
    if (!data) return { data: null, error: { message: 'Insert data is empty' } };
    const items = Array.isArray(data) ? data : [data];
    if (items.length === 0) return { data: [], error: null };

    const isAutoIncrement = AUTO_INCREMENT_TABLES.has(table);
    const insertedIds = [];

    for (const item of items) {
        const rowToInsert = { ...item };
        
        if (isAutoIncrement) {
            // Omit id if null/undefined or if it's a non-numeric string UUID so MySQL assigns auto-increment INT
            if (!rowToInsert.id || (typeof rowToInsert.id === 'string' && isNaN(Number(rowToInsert.id)))) {
                delete rowToInsert.id;
            }
        } else if (!rowToInsert.id && table !== 'app_settings') {
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

        const [result] = await pool.query(`INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders})`, values);
        
        if (rowToInsert.id) {
            insertedIds.push(rowToInsert.id);
        } else if (result && result.insertId) {
            insertedIds.push(result.insertId);
        }
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
