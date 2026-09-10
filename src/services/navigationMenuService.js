import { query } from '@/lib/mysql';

/**
 * Ensures navigation_menus and navigation_menu_items tables exist in MySQL,
 * and seeds default primary menu if none exists.
 */
export async function ensureNavigationTables() {
    await query(`
        CREATE TABLE IF NOT EXISTS navigation_menus (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            location VARCHAR(64) NOT NULL DEFAULT 'primary',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_location (location)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS navigation_menu_items (
            id VARCHAR(64) PRIMARY KEY,
            menu_id VARCHAR(64) NOT NULL,
            parent_id VARCHAR(64) DEFAULT NULL,
            title VARCHAR(255) NOT NULL,
            url VARCHAR(500) NOT NULL,
            target VARCHAR(32) DEFAULT '_self',
            item_type VARCHAR(64) DEFAULT 'custom',
            badge_text VARCHAR(64) DEFAULT NULL,
            display_order INT DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_menu_order (menu_id, display_order),
            INDEX idx_parent (parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if primary menu exists; seed if missing
    const [menus] = await query("SELECT * FROM navigation_menus WHERE id = 'menu_primary' OR location = 'primary' LIMIT 1");
    if (!menus || menus.length === 0) {
        await query(`
            INSERT INTO navigation_menus (id, name, location, created_at, updated_at)
            VALUES ('menu_primary', 'Primary Header Navigation', 'primary', NOW(), NOW())
        `);

        // Seed default menu items
        const defaultItems = [
            { id: 'item_home', title: 'Home', url: '/', display_order: 1, item_type: 'page' },
            { id: 'item_shop', title: 'Shop Collections', url: '/shop', display_order: 2, item_type: 'page' },
            { id: 'item_heritage', title: 'Our Heritage', url: '/about-us', display_order: 3, item_type: 'page' },
            { id: 'item_contact', title: 'Contact', url: '/contact', display_order: 4, item_type: 'page' }
        ];

        for (const item of defaultItems) {
            await query(`
                INSERT INTO navigation_menu_items (id, menu_id, parent_id, title, url, target, item_type, badge_text, display_order, is_active, created_at, updated_at)
                VALUES (?, 'menu_primary', NULL, ?, ?, '_self', ?, NULL, ?, 1, NOW(), NOW())
            `, [item.id, item.title, item.url, item.item_type, item.display_order]);
        }
    }
}

/**
 * Builds a nested hierarchical tree from a flat list of items
 */
export function buildMenuTree(flatItems) {
    if (!Array.isArray(flatItems)) return [];
    
    const itemMap = new Map();
    const roots = [];

    flatItems.forEach(item => {
        itemMap.set(item.id, {
            ...item,
            children: []
        });
    });

    flatItems.forEach(item => {
        const node = itemMap.get(item.id);
        if (item.parent_id && itemMap.has(item.parent_id)) {
            itemMap.get(item.parent_id).children.push(node);
        } else {
            roots.push(node);
        }
    });

    // Sort roots and all children by display_order
    const sortNodes = (nodes) => {
        nodes.sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
        nodes.forEach(n => {
            if (n.children && n.children.length > 0) {
                sortNodes(n.children);
            }
        });
    };

    sortNodes(roots);
    return roots;
}

/**
 * Fetch navigation menu by location (e.g. 'primary')
 * Returns menu details along with hierarchical items tree.
 */
export async function getMenuByLocation(location = 'primary') {
    await ensureNavigationTables();

    const [menus] = await query("SELECT * FROM navigation_menus WHERE location = ? LIMIT 1", [location]);
    if (!menus || menus.length === 0) {
        return null;
    }

    const menu = menus[0];
    const [items] = await query(
        "SELECT * FROM navigation_menu_items WHERE menu_id = ? AND is_active = 1 ORDER BY display_order ASC, created_at ASC",
        [menu.id]
    );

    const tree = buildMenuTree(items || []);
    return {
        ...menu,
        items: tree,
        rawItems: items || []
    };
}

/**
 * Fetch a specific menu with all items (active and inactive) for admin editing.
 */
export async function getMenuForAdmin(menuId = 'menu_primary') {
    await ensureNavigationTables();

    let [menus] = await query("SELECT * FROM navigation_menus WHERE id = ? LIMIT 1", [menuId]);
    if (!menus || menus.length === 0) {
        [menus] = await query("SELECT * FROM navigation_menus WHERE location = 'primary' LIMIT 1");
    }

    if (!menus || menus.length === 0) {
        return null;
    }

    const menu = menus[0];
    const [items] = await query(
        "SELECT * FROM navigation_menu_items WHERE menu_id = ? ORDER BY display_order ASC, created_at ASC",
        [menu.id]
    );

    const [allMenus] = await query("SELECT id, name, location FROM navigation_menus ORDER BY name ASC");

    return {
        menu,
        items: items || [],
        tree: buildMenuTree(items || []),
        availableMenus: allMenus || []
    };
}

/**
 * Saves/updates menu structure and items atomically
 */
export async function saveMenuStructure(menuId, menuName, items = []) {
    await ensureNavigationTables();

    // 1. Update menu name
    await query("UPDATE navigation_menus SET name = ?, updated_at = NOW() WHERE id = ?", [menuName, menuId]);

    // 2. Fetch existing item IDs to identify deletions
    const [existingRows] = await query("SELECT id FROM navigation_menu_items WHERE menu_id = ?", [menuId]);
    const existingIds = new Set(existingRows.map(r => r.id));
    const incomingIds = new Set(items.map(it => it.id));

    // 3. Delete removed items
    const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
    if (toDelete.length > 0) {
        const placeholders = toDelete.map(() => '?').join(',');
        await query(`DELETE FROM navigation_menu_items WHERE id IN (${placeholders})`, toDelete);
    }

    // 4. Upsert incoming items
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const itemId = item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const parentId = item.parent_id || null;
        const title = (item.title || 'Untitled').trim();
        const url = (item.url || '/').trim();
        const target = item.target === '_blank' ? '_blank' : '_self';
        const itemType = item.item_type || 'custom';
        const badgeText = item.badge_text ? item.badge_text.trim() : null;
        const displayOrder = item.display_order !== undefined ? Number(item.display_order) : index + 1;
        const isActive = item.is_active === 0 || item.is_active === false ? 0 : 1;

        await query(`
            INSERT INTO navigation_menu_items 
                (id, menu_id, parent_id, title, url, target, item_type, badge_text, display_order, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                parent_id = VALUES(parent_id),
                title = VALUES(title),
                url = VALUES(url),
                target = VALUES(target),
                item_type = VALUES(item_type),
                badge_text = VALUES(badge_text),
                display_order = VALUES(display_order),
                is_active = VALUES(is_active),
                updated_at = NOW()
        `, [itemId, menuId, parentId, title, url, target, itemType, badgeText, displayOrder, isActive]);
    }

    return await getMenuForAdmin(menuId);
}
