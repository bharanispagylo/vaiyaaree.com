/**
 * Universal Native MySQL Database Client Engine
 * Automatically routes database queries to MySQL server-side
 * and dispatches to /api/db on client-side.
 */

class MySQLQueryBuilder {
    constructor(table) {
        this.table = table;
        this.operation = 'select';
        this.columns = '*';
        this.returnColumns = null;
        this.mutationData = null;
        this.filters = [];
        this.orders = [];
        this.limitVal = null;
        this.offsetVal = null;
        this.countType = null;
        this.isSingle = false;
        this.isMaybeSingle = false;
    }

    select(columns = '*', options = {}) {
        if (['insert', 'update', 'upsert', 'delete'].includes(this.operation)) {
            this.returnColumns = columns;
        } else {
            this.operation = 'select';
            this.columns = columns;
        }
        if (options?.count) {
            this.countType = options.count;
        }
        return this;
    }

    insert(data) {
        this.operation = 'insert';
        this.mutationData = data;
        return this;
    }

    update(data) {
        this.operation = 'update';
        this.mutationData = data;
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    upsert(data, options = {}) {
        this.operation = 'upsert';
        this.mutationData = data;
        return this;
    }

    eq(col, val) {
        this.filters.push({ type: 'eq', col, val });
        return this;
    }

    neq(col, val) {
        this.filters.push({ type: 'neq', col, val });
        return this;
    }

    gt(col, val) {
        this.filters.push({ type: 'gt', col, val });
        return this;
    }

    gte(col, val) {
        this.filters.push({ type: 'gte', col, val });
        return this;
    }

    lt(col, val) {
        this.filters.push({ type: 'lt', col, val });
        return this;
    }

    lte(col, val) {
        this.filters.push({ type: 'lte', col, val });
        return this;
    }

    like(col, val) {
        this.filters.push({ type: 'like', col, val });
        return this;
    }

    ilike(col, val) {
        this.filters.push({ type: 'ilike', col, val });
        return this;
    }

    is(col, val) {
        this.filters.push({ type: 'is', col, val });
        return this;
    }

    in(col, vals) {
        this.filters.push({ type: 'in', col, val: Array.isArray(vals) ? vals : [vals] });
        return this;
    }

    contains(col, val) {
        this.filters.push({ type: 'contains', col, val });
        return this;
    }

    or(orClause) {
        this.filters.push({ type: 'or', val: orClause });
        return this;
    }

    order(col, options = {}) {
        this.orders.push({ col, ascending: options.ascending !== false });
        return this;
    }

    range(from, to) {
        this.offsetVal = from;
        this.limitVal = (to - from) + 1;
        return this;
    }

    limit(val) {
        this.limitVal = val;
        return this;
    }

    single() {
        this.isSingle = true;
        this.limitVal = 1;
        return this;
    }

    maybeSingle() {
        this.isMaybeSingle = true;
        this.limitVal = 1;
        return this;
    }

    async then(resolve, reject) {
        try {
            const payload = {
                table: this.table,
                operation: this.operation,
                columns: this.columns,
                returnColumns: this.returnColumns,
                data: this.mutationData,
                filters: this.filters,
                orders: this.orders,
                limit: this.limitVal,
                offset: this.offsetVal,
                count: this.countType
            };

            let res;
            if (typeof window === 'undefined') {
                const { executeMysqlQuery } = await import('./mysqlQueryEngine.js');
                res = await executeMysqlQuery(payload);
            } else {
                const response = await fetch('/api/db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const text = await response.text();
                    res = { data: null, error: { message: text } };
                } else {
                    res = await response.json();
                }
            }

            if (res.error) {
                return resolve({ data: null, error: res.error, count: null });
            }

            let resultData = res.data;
            if (this.isSingle) {
                if (!Array.isArray(resultData) || resultData.length === 0) {
                    return resolve({ data: null, error: { message: 'Row not found', code: 'PGRST116' }, count: null });
                }
                resultData = resultData[0];
            } else if (this.isMaybeSingle) {
                resultData = (Array.isArray(resultData) && resultData.length > 0) ? resultData[0] : null;
            }

            return resolve({ data: resultData, error: null, count: res.count ?? null });
        } catch (err) {
            console.error('[MySQL Client Builder Error]:', err);
            return resolve({ data: null, error: { message: err.message }, count: null });
        }
    }
}

const createNoOpChannel = (name) => {
    const channelObj = {
        on: (...args) => channelObj,
        subscribe: (cb) => {
            if (typeof cb === 'function') cb('SUBSCRIBED', null);
            return channelObj;
        },
        unsubscribe: async () => ({ error: null }),
        send: async () => ({ error: null }),
    };
    return channelObj;
};

const createClientInstance = () => ({
    from: (table) => new MySQLQueryBuilder(table),
    storage: {
        from: () => ({
            upload: async () => ({ error: null }),
            getPublicUrl: (filename) => ({ data: { publicUrl: `/uploads/${filename}` } }),
            list: async () => ({ data: [], error: null }),
            remove: async () => ({ error: null })
        })
    },
    auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null })
    },
    channel: (name) => createNoOpChannel(name),
    removeChannel: async (channel) => ({ error: null }),
    removeAllChannels: async () => [],
    getChannels: () => [],

    rpc: async (fnName, params = {}) => {
        if (typeof window === 'undefined') {
            const { executeMysqlRpc } = await import('./mysqlQueryEngine.js');
            return await executeMysqlRpc(fnName, params);
        } else {
            try {
                const res = await fetch('/api/db-rpc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fn: fnName, params })
                });
                if (!res.ok) {
                    const text = await res.text();
                    return { data: null, error: { message: text } };
                }
                return await res.json();
            } catch (err) {
                console.error('[RPC Client Error]:', err);
                return { data: null, error: { message: err.message } };
            }
        }
    }
});

export const mysqlClient = createClientInstance();
export const mysqlAdmin = createClientInstance();
export const db = mysqlClient;
export const dbAdmin = mysqlAdmin;

// Compatibility aliases
export const supabase = mysqlClient;
export const supabaseAdmin = mysqlAdmin;
export default mysqlClient;
