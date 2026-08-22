/**
 * Universal MySQL Database Client (Supabase-Compatible Interface)
 * Automatically runs direct MySQL queries on server-side
 * and dispatches to /api/db on client-side.
 */

class MySQLQueryBuilder {
    constructor(table) {
        this.table = table;
        this.operation = 'select';
        this.columns = '*';
        this.returnColumns = null; // columns to return after a mutation (.update().select())
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
        // If called after a mutation (update/insert/upsert/delete), just mark returnColumns
        // so the mutation runs first and then returns the affected rows.
        // Only set operation='select' when there is no pending mutation.
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

    in(col, val) {
        this.filters.push({ type: 'in', col, val });
        return this;
    }

    or(val) {
        this.filters.push({ type: 'or', val });
        return this;
    }

    order(col, { ascending = true } = {}) {
        this.orders.push({ col, ascending });
        return this;
    }

    limit(n) {
        this.limitVal = n;
        return this;
    }

    range(from, to) {
        this.offsetVal = from;
        this.limitVal = (to - from) + 1;
        return this;
    }

    single() {
        this.isSingle = true;
        return this;
    }

    maybeSingle() {
        this.isMaybeSingle = true;
        return this;
    }

    async _execute() {
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
            countType: this.countType,
            isSingle: this.isSingle,
            isMaybeSingle: this.isMaybeSingle
        };

        if (typeof window === 'undefined') {
            // Server-side: Direct MySQL query
            const { executeMysqlQuery } = await import('./mysqlQueryEngine.js');
            return await executeMysqlQuery(payload);
        } else {
            // Client-side: POST to /api/db
            try {
                const res = await fetch('/api/db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const text = await res.text();
                    return { data: null, error: { message: text } };
                }
                return await res.json();
            } catch (err) {
                console.error('[DB Client Fetch Error]:', err);
                return { data: null, error: { message: err.message } };
            }
        }
    }

    then(onFulfilled, onRejected) {
        return this._execute().then(onFulfilled, onRejected);
    }
}

const mockStorage = {
    from: (bucket) => ({
        getPublicUrl: (path) => ({
            data: { publicUrl: path?.startsWith('http') ? path : (path?.startsWith('/') ? path : `/uploads/${path}`) }
        }),
        upload: async (path, file) => {
            return { data: { path }, error: null };
        },
        list: async (path, options) => {
            return { data: [], error: null };
        },
        remove: async (paths) => {
            return { data: [], error: null };
        }
    })
};

/**
 * No-op real-time channel mock.
 * Supabase uses .channel().on('postgres_changes', ...).subscribe() for live DB push events.
 * MySQL has no built-in real-time push, so these calls are silently ignored.
 * Pages will still load and work — they just won't auto-refresh on remote DB changes.
 * Use manual polling (setInterval + fetch) as an alternative if live updates are needed.
 */
const createNoOpChannel = (name) => {
    const channelObj = {
        on: (...args) => channelObj,          // chainable — returns same object
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
    storage: mockStorage,
    auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null })
    },
    // Real-time stubs — MySQL does not support Postgres LISTEN/NOTIFY push
    channel: (name) => createNoOpChannel(name),
    removeChannel: async (channel) => ({ error: null }),
    removeAllChannels: async () => [],
    getChannels: () => [],

    /**
     * .rpc() — Executes named stored procedures as real MySQL UPDATE queries.
     * Supabase RPCs (deduct_stock_atomic, increment_total_sold, etc.) are
     * reimplemented here as direct MySQL operations.
     */
    rpc: async (fnName, params = {}) => {
        if (typeof window === 'undefined') {
            // Server-side: execute directly
            const { executeMysqlRpc } = await import('./mysqlQueryEngine.js');
            return await executeMysqlRpc(fnName, params);
        } else {
            // Client-side: POST to /api/db-rpc
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

export const supabase = createClientInstance();
export const supabaseAdmin = createClientInstance();
export default supabase;

